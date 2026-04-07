/**
 * inventory-wadnr-fields.js
 *
 * Parses all WADNR form template XML exports, extracts every calendar field,
 * maps its configuration to Config A–H (per temporal-models.md), assesses
 * whether the config matches the likely intended model based on field name
 * heuristics, and generates a markdown inventory document.
 *
 * Usage:
 *   node testing/scripts/inventory-wadnr-fields.js
 *
 * Output:
 *   tasks/date-handling/wadnr-impact/field-inventory.md
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const TEMPLATES_DIR = path.resolve(__dirname, '../../tasks/date-handling/wadnr-impact/form-templates');
const OUTPUT_FILE = path.resolve(__dirname, '../../tasks/date-handling/wadnr-impact/field-inventory.md');

// Config mapping: enableTime × ignoreTimezone × useLegacy → Config ID
const CONFIG_MAP = {
    'false|false|false': { id: 'A', model: '1 — Calendar Date' },
    'false|true|false': { id: 'B', model: '1 — Calendar Date' },
    'true|false|false': { id: 'C', model: '2 — Instant' },
    'true|true|false': { id: 'D', model: '3/4 — Pinned/Floating' },
    'false|false|true': { id: 'E', model: '1 — Calendar Date' },
    'false|true|true': { id: 'F', model: '1 — Calendar Date' },
    'true|false|true': { id: 'G', model: '2 — Instant' },
    'true|true|true': { id: 'H', model: '3/4 — Pinned/Floating' },
};

// Models that each config maps to (numeric for comparison)
const CONFIG_MODEL_NUM = { A: 1, B: 1, C: 2, D: 34, E: 1, F: 1, G: 2, H: 34 };

function toBool(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
}

function getConfig(enableTime, ignoreTimezone, useLegacy) {
    const key = `${enableTime}|${ignoreTimezone}|${useLegacy}`;
    return CONFIG_MAP[key] || { id: '?', model: 'Unknown' };
}

function getInitialValue(field) {
    const enabled = toBool(field.EnableInitialValue);
    if (!enabled) return 'None';
    const mode = String(field.InitialValueMode || '').toLowerCase();
    if (mode === 'currentdate' || mode === '0') return 'Current Date';
    if (mode === 'presetdate' || mode === '1') {
        const date = field.InitialDate || '';
        return `Preset: ${date}`;
    }
    return `Mode: ${mode}`;
}

/**
 * Assess whether a field's configuration matches its likely intended model.
 *
 * Returns: { likelyModel, match, reason }
 *   likelyModel: human-readable model name
 *   match:       '✅' (correct), '⚠️' (ambiguous/review), '❌' (likely mismatch)
 *   reason:      brief explanation (empty if match is obvious)
 */
function assessField(fieldName, configId, enableTime) {
    const lower = fieldName.toLowerCase();
    const configModel = CONFIG_MODEL_NUM[configId];

    // --- Pattern 1: Name explicitly includes "time" or "datetime" ---
    // e.g., "ViolationDateAndTime", "Date and Time of Incident"
    const explicitTime = /and\s*time/i.test(fieldName) || /date\s*time/i.test(lower) || /\btimestamp\b/i.test(lower);
    if (explicitTime) {
        // Name says datetime — needs enableTime=true, likely Pinned (local wall-clock)
        if (configModel === 34) {
            return { likelyModel: '3 — Pinned', match: '✅', reason: '' };
        }
        if (configModel === 2) {
            return {
                likelyModel: '3 — Pinned',
                match: '⚠️',
                reason: 'Name says datetime — Pinned may be more appropriate than Instant',
            };
        }
        return { likelyModel: '3 — Pinned', match: '❌', reason: 'Name indicates datetime but enableTime is OFF' };
    }

    // --- Pattern 2: System-generated timestamp ---
    // e.g., "Status Modified Date", "Date Modified", "Last Updated"
    const systemTimestamp =
        /\bstatus\s+(modified|changed|updated)\b/i.test(fieldName) ||
        /\b(modified|updated|changed)\s+(date|at|on)\b/i.test(fieldName) ||
        /\blast\s+updated\b/i.test(fieldName);
    if (systemTimestamp) {
        if (configModel === 2) {
            return { likelyModel: '2 — Instant', match: '✅', reason: 'System timestamp' };
        }
        return {
            likelyModel: '2 — Instant',
            match: '⚠️',
            reason: 'Likely system timestamp — Instant (Config C) may be more appropriate',
        };
    }

    // --- Pattern 3: Meeting / scheduled with time enabled ---
    // Could legitimately need time (Pinned: "meeting at 2pm local")
    const meetingOrScheduled = /\b(meeting|scheduled|appointment|hearing)\b/i.test(lower);
    if (meetingOrScheduled && enableTime) {
        if (configModel === 34) {
            return { likelyModel: '1 or 3', match: '⚠️', reason: 'Verify if time component is actually used' };
        }
        if (configModel === 2) {
            return { likelyModel: '1 or 3', match: '⚠️', reason: 'Verify if time component is actually used' };
        }
    }

    // --- Pattern 4: Strong calendar-date indicators ---
    // Regulatory/business dates that are inherently date-only
    const strongCalendarPatterns = [
        /\bdue\s+date\b/i,
        /\bexpiration\s+date\b/i,
        /\beffective\s+date\b/i,
        /\bdate\s+of\s+(receipt|appeal|violation|payment|decision)\b/i,
        /\b(receipt|received|issued|sent|filed|closed|refund)\s+date\b/i,
        /\bdate\s+(received|issued|sent|filed|created|closed)\b/i,
        /\bcomment\s+period\b/i,
        /\brenewal\s+date\b/i,
        /\bdecision\s+(date|due)\b/i,
        /\b(start|end)\s+date\b/i,
        /\bdate\s+of\s+\w+/i, // "Date of X" is almost always calendar date
    ];
    const isStrongCalendar = strongCalendarPatterns.some((p) => p.test(fieldName));
    if (isStrongCalendar) {
        if (configModel === 1) {
            return { likelyModel: '1 — Calendar Date', match: '✅', reason: '' };
        }
        // enableTime is on but name says date-only
        return {
            likelyModel: '1 — Calendar Date',
            match: '❌',
            reason: 'Name suggests date-only — enableTime may be unnecessary',
        };
    }

    // --- Pattern 5: Weak calendar-date indicators ---
    // Name contains "Date" but not matched by strong patterns above
    const hasDateWord = /\bdate\b/i.test(lower);
    const hasTimeWord = /\btime\b/i.test(lower);
    if (hasDateWord && !hasTimeWord) {
        if (configModel === 1) {
            return { likelyModel: '1 — Calendar Date', match: '✅', reason: '' };
        }
        if (enableTime) {
            // "Date" in name but time enabled — likely overconfigured but less certain
            return {
                likelyModel: '1 — Calendar Date',
                match: '⚠️',
                reason: 'Name suggests date-only — verify if time component is used',
            };
        }
    }

    // --- Pattern 6: Name doesn't contain "Date" at all ---
    // Some fields have names like "Scheduled", "Communication", etc.
    if (!hasDateWord && !hasTimeWord) {
        if (!enableTime) {
            return { likelyModel: '1 — Calendar Date', match: '✅', reason: '' };
        }
        return { likelyModel: 'Uncertain', match: '⚠️', reason: 'Cannot determine intended model from name' };
    }

    // --- Fallback ---
    if (!enableTime) {
        return { likelyModel: '1 — Calendar Date', match: '✅', reason: '' };
    }
    return { likelyModel: 'Uncertain', match: '⚠️', reason: 'Cannot determine intended model from name' };
}

function parseTemplate(filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        isArray: (name) => name === 'BaseField',
    });
    const doc = parser.parse(xml);

    // Navigate: FormEntity > FormPages > FormPage > FieldList > BaseField[]
    const formPages = doc?.FormEntity?.FormPages?.FormPage;
    if (!formPages) return [];

    const pageList = Array.isArray(formPages) ? formPages : [formPages];
    const fields = [];

    for (const page of pageList) {
        const baseFields = page?.FieldList?.BaseField;
        if (!baseFields) continue;
        const fieldList = Array.isArray(baseFields) ? baseFields : [baseFields];

        for (const field of fieldList) {
            const fieldType = field['@_xsi:type'] || '';
            if (fieldType !== 'FieldCalendar3') continue;

            const enableTime = toBool(field.EnableTime);
            const ignoreTimezone = toBool(field.IgnoreTimezone);
            const useLegacy = toBool(field.UseLegacy);
            const config = getConfig(enableTime, ignoreTimezone, useLegacy);
            const name = field.Name || '(unnamed)';
            const assessment = assessField(name, config.id, enableTime);

            fields.push({
                name,
                enableTime,
                ignoreTimezone,
                useLegacy,
                configId: config.id,
                model: config.model,
                initialValue: getInitialValue(field),
                mask: field.Mask || '',
                likelyModel: assessment.likelyModel,
                match: assessment.match,
                reason: assessment.reason,
            });
        }
    }

    return fields;
}

function generateMarkdown(formData, configSummary, assessmentSummary) {
    const lines = [];

    lines.push('# WADNR Date Field Inventory');
    lines.push('');
    lines.push(
        'Calendar field configuration for all WADNR form templates, mapped to the temporal model framework defined in [Root Cause Analysis](../analysis/temporal-models.md).'
    );
    lines.push('');
    lines.push(
        `Generated: ${new Date().toISOString().split('T')[0]} | Source: ${formData.length} templates with calendar fields out of ${totalTemplates} total`
    );
    lines.push('');
    lines.push('---');
    lines.push('');

    // Config reference
    lines.push('## Configuration Reference');
    lines.push('');
    lines.push('| Config | enableTime | ignoreTZ | useLegacy | Intended Model |');
    lines.push('| :----: | :--------: | :------: | :-------: | :------------: |');
    lines.push('| **A** | OFF | OFF | OFF | 1 — Calendar Date |');
    lines.push('| **B** | OFF | ON | OFF | 1 — Calendar Date |');
    lines.push('| **C** | ON | OFF | OFF | 2 — Instant |');
    lines.push('| **D** | ON | ON | OFF | 3/4 — Pinned/Floating |');
    lines.push('| **E** | OFF | OFF | ON | 1 — Calendar Date |');
    lines.push('| **F** | OFF | ON | ON | 1 — Calendar Date |');
    lines.push('| **G** | ON | OFF | ON | 2 — Instant |');
    lines.push('| **H** | ON | ON | ON | 3/4 — Pinned/Floating |');
    lines.push('');
    lines.push('**Assessment column legend:**');
    lines.push('- ✅ **Correct** — field name clearly matches the configured model');
    lines.push('- ⚠️ **Review** — field name is ambiguous or could map to a different model');
    lines.push('- ❌ **Mismatch** — field name suggests a different model than what is configured');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');

    const totalFields = formData.reduce((sum, f) => sum + f.fields.length, 0);
    lines.push(`**${totalFields} calendar fields** across **${formData.length} form templates**.`);
    lines.push('');

    // Config distribution
    lines.push('### Configuration Distribution');
    lines.push('');
    lines.push('| Config | Model | Field Count | % of Total |');
    lines.push('| :----: | :---: | :---------: | :--------: |');
    const sortedConfigs = Object.entries(configSummary).sort(([a], [b]) => a.localeCompare(b));
    for (const [configId, data] of sortedConfigs) {
        const pct = ((data.count / totalFields) * 100).toFixed(1);
        lines.push(`| **${configId}** | ${data.model} | ${data.count} | ${pct}% |`);
    }
    lines.push(`| | **Total** | **${totalFields}** | **100%** |`);
    lines.push('');

    // Model distribution
    const modelCounts = {};
    for (const [, data] of sortedConfigs) {
        modelCounts[data.model] = (modelCounts[data.model] || 0) + data.count;
    }
    lines.push('### Model Distribution');
    lines.push('');
    lines.push('| Model | Field Count | % of Total | Affected Bugs |');
    lines.push('| :---: | :---------: | :--------: | :------------ |');
    const modelOrder = ['1 — Calendar Date', '2 — Instant', '3/4 — Pinned/Floating'];
    const modelBugs = {
        '1 — Calendar Date': 'FORM-BUG-7, WEBSERVICE-BUG-6',
        '2 — Instant': 'FORM-BUG-1, FORM-BUG-4, FORM-BUG-6, WEBSERVICE-BUG-1, WEBSERVICE-BUG-4',
        '3/4 — Pinned/Floating': 'FORM-BUG-5, FORM-BUG-6, WEBSERVICE-BUG-1, WEBSERVICE-BUG-4',
    };
    for (const model of modelOrder) {
        const count = modelCounts[model] || 0;
        const pct = ((count / totalFields) * 100).toFixed(1);
        lines.push(`| **${model}** | ${count} | ${pct}% | ${modelBugs[model] || '—'} |`);
    }
    lines.push('');

    // Assessment summary
    lines.push('### Configuration Assessment');
    lines.push('');
    lines.push('| Assessment | Field Count | % of Total |');
    lines.push('| :--------: | :---------: | :--------: |');
    const assessOrder = ['✅', '⚠️', '❌'];
    const assessLabels = { '✅': 'Correct', '⚠️': 'Review', '❌': 'Mismatch' };
    for (const symbol of assessOrder) {
        const count = assessmentSummary[symbol] || 0;
        if (count === 0) continue;
        const pct = ((count / totalFields) * 100).toFixed(1);
        lines.push(`| ${symbol} ${assessLabels[symbol]} | ${count} | ${pct}% |`);
    }
    lines.push('');

    // Mismatch and review detail
    const flagged = [];
    for (const form of formData) {
        for (const field of form.fields) {
            if (field.match !== '✅') {
                flagged.push({ form: form.name, ...field });
            }
        }
    }

    if (flagged.length > 0) {
        lines.push('### Fields Requiring Review');
        lines.push('');
        lines.push('| Form | Field Name | Config | Configured Model | Likely Model | Assessment | Reason |');
        lines.push('| :--- | :--------- | :----: | :--------------- | :----------- | :--------: | :----- |');
        // Sort: mismatches first, then reviews
        flagged.sort((a, b) => {
            if (a.match === '❌' && b.match !== '❌') return -1;
            if (a.match !== '❌' && b.match === '❌') return 1;
            return a.form.localeCompare(b.form) || a.name.localeCompare(b.name);
        });
        for (const f of flagged) {
            lines.push(
                `| ${f.form} | ${f.name} | **${f.configId}** | ${f.model} | ${f.likelyModel} | ${f.match} | ${f.reason} |`
            );
        }
        lines.push('');
    }

    // Initial value distribution
    const initialCounts = { None: 0, 'Current Date': 0, Preset: 0 };
    for (const form of formData) {
        for (const field of form.fields) {
            if (field.initialValue === 'None') initialCounts.None++;
            else if (field.initialValue === 'Current Date') initialCounts['Current Date']++;
            else initialCounts.Preset++;
        }
    }
    lines.push('### Initial Value Distribution');
    lines.push('');
    lines.push('| Initial Value | Field Count |');
    lines.push('| :-----------: | :---------: |');
    for (const [type, count] of Object.entries(initialCounts)) {
        if (count > 0) lines.push(`| ${type} | ${count} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Per-form tables
    lines.push('## Form Templates');
    lines.push('');

    for (const form of formData) {
        lines.push(`### ${form.name}`);
        lines.push('');
        lines.push('| Field Name | Config | Likely Model | Match | Initial Value |');
        lines.push('| :--------- | :----: | :----------- | :---: | :------------ |');
        for (const field of form.fields) {
            const reasonSuffix = field.reason ? ` — ${field.reason}` : '';
            lines.push(
                `| ${field.name} | **${field.configId}** | ${field.likelyModel} | ${field.match}${reasonSuffix} | ${field.initialValue} |`
            );
        }
        lines.push('');
    }

    return lines.join('\n');
}

// Main
let totalTemplates = 0;

const xmlFiles = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.xml'))
    .sort();

totalTemplates = xmlFiles.length;

const formData = [];
const configSummary = {};
const assessmentSummary = { '✅': 0, '⚠️': 0, '❌': 0 };

for (const file of xmlFiles) {
    const filePath = path.join(TEMPLATES_DIR, file);
    const fields = parseTemplate(filePath);
    if (fields.length === 0) continue;

    const formName = file.replace('.xml', '');
    formData.push({ name: formName, fields });

    for (const field of fields) {
        if (!configSummary[field.configId]) {
            configSummary[field.configId] = { count: 0, model: field.model };
        }
        configSummary[field.configId].count++;
        assessmentSummary[field.match]++;
    }
}

const markdown = generateMarkdown(formData, configSummary, assessmentSummary);
fs.writeFileSync(OUTPUT_FILE, markdown + '\n');

// Console summary
const totalFields = formData.reduce((sum, f) => sum + f.fields.length, 0);
console.log(`Parsed ${xmlFiles.length} templates`);
console.log(`Found ${formData.length} templates with calendar fields`);
console.log(`Total calendar fields: ${totalFields}`);
console.log('');
console.log('Config distribution:');
for (const [id, data] of Object.entries(configSummary).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${id} (${data.model}): ${data.count} fields`);
}
console.log('');
console.log('Assessment:');
console.log(`  ✅ Correct:  ${assessmentSummary['✅']}`);
console.log(`  ⚠️ Review:   ${assessmentSummary['⚠️']}`);
console.log(`  ❌ Mismatch: ${assessmentSummary['❌']}`);
console.log('');
console.log(`Output: ${OUTPUT_FILE}`);
