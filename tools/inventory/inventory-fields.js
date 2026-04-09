/**
 * inventory-wadnr-fields.js
 *
 * Parses all WADNR form template XML exports, extracts every calendar field,
 * maps its configuration to Config A–H (per temporal-models.md), assesses
 * whether the config matches the likely intended model based on field name
 * heuristics, and generates a markdown inventory document.
 *
 * Usage:
 *   node tools/inventory/inventory-fields.js
 *
 * Output:
 *   projects/wadnr/analysis/field-inventory.md
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const TEMPLATES_DIR = path.resolve(__dirname, '../../projects/wadnr/exports/form-templates');
const OUTPUT_FILE = path.resolve(__dirname, '../../projects/wadnr/analysis/field-inventory.md');

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

// ─── Script Analysis ─────────────────────────────────────────────────────────

const EVENT_NAMES = {
    1: 'onChange',
    3: 'onBlur',
    4: 'onClick',
    15: 'formLevel',
    16: 'onDataLoad',
};

/**
 * Extract scripts and their assignments from a parsed XML document.
 * Returns a Map of scriptId → { name, code, type, assignments[] }
 */
function extractScripts(doc) {
    const scripts = new Map();
    const scriptItems = doc?.FormEntity?.ScriptLibrary?.FormScriptItem;
    if (!scriptItems) return scripts;
    const itemList = Array.isArray(scriptItems) ? scriptItems : [scriptItems];
    for (const item of itemList) {
        scripts.set(item.ScriptItemId, {
            name: item.Name || '(unnamed)',
            code: String(item.Script || ''),
            type: item.ScriptItemType || '',
            assignments: [],
        });
    }
    return scripts;
}

/**
 * Resolve script assignments to control names using the control map.
 */
function resolveAssignments(doc, scripts, controlMap) {
    const assignments = doc?.FormEntity?.ScriptAssignments?.FormScriptAssignment;
    if (!assignments) return;
    const assignList = Array.isArray(assignments) ? assignments : [assignments];
    for (const assign of assignList) {
        const script = scripts.get(assign.ScriptItemId);
        if (!script) continue;
        const control = controlMap.get(assign.ControlId);
        const eventId = Number(assign.EventId) || 0;
        script.assignments.push({
            controlName: control ? control.name : assign.ControlId,
            eventName: EVENT_NAMES[eventId] || `event-${eventId}`,
        });
    }
}

/**
 * Analyze a script's code for all date-relevant interactions.
 * Returns {
 *   reads: string[],           — explicit GetFieldValue field names
 *   writes: string[],          — explicit SetFieldValue field names
 *   webServices: string[],     — WS names called
 *   globals: string[],         — VV.Form.Global.X function names
 *   bulkRead: boolean,         — uses getFormDataCollection (sends ALL fields to WS)
 *   rawReads: string[],        — getValueObjectValue field names (raw access)
 *   fillinRelate: boolean,     — calls FillinAndRelateForm (copies fields to new records)
 *   copyFields: boolean,       — calls CopyFieldValues or SetFieldValuesFromObj
 *   formSave: boolean,         — calls DoAjaxFormSave (persists in-memory values)
 *   dateApis: string[],        — date manipulation APIs used (new Date, toISOString, moment, etc.)
 * }
 */
function analyzeScriptCode(code) {
    const reads = new Set();
    const writes = new Set();
    const webServices = new Set();
    const globals = new Set();
    const rawReads = new Set();
    const dateApis = new Set();

    if (!code) {
        return {
            reads: [],
            writes: [],
            webServices: [],
            globals: [],
            rawReads: [],
            bulkRead: false,
            fillinRelate: false,
            copyFields: false,
            formSave: false,
            dateApis: [],
        };
    }

    let m;

    // Explicit GetFieldValue
    const gfvRe = /GetFieldValue\s*\(\s*['"](.+?)['"]\s*\)/g;
    while ((m = gfvRe.exec(code)) !== null) reads.add(m[1]);

    // Explicit SetFieldValue
    const sfvRe = /SetFieldValue\s*\(\s*['"](.+?)['"]\s*/g;
    while ((m = sfvRe.exec(code)) !== null) writes.add(m[1]);

    // Raw value access: getValueObjectValue
    const rawRe = /getValueObjectValue\s*\(\s*['"](.+?)['"]\s*\)/g;
    while ((m = rawRe.exec(code)) !== null) rawReads.add(m[1]);

    // GetDateObjectFromCalendar — returns JS Date object for calendar field
    const gdocRe = /GetDateObjectFromCalendar\s*\(\s*['"](.+?)['"]\s*\)/g;
    while ((m = gdocRe.exec(code)) !== null) reads.add(m[1]);

    // Web service names
    const wsRe1 = /scripts\?name=(\w+)/g;
    while ((m = wsRe1.exec(code)) !== null) webServices.add(m[1]);
    const wsRe2 = /(?:webServiceName|websvcName|wsName)\s*=\s*['"](\w+)['"]/g;
    while ((m = wsRe2.exec(code)) !== null) webServices.add(m[1]);

    // Global functions
    const globalRe = /VV\.Form\.Global\.(\w+)/g;
    while ((m = globalRe.exec(code)) !== null) globals.add(m[1]);

    // Bulk field collection (sends ALL fields to WS)
    const bulkRead = /getFormDataCollection\s*\(/.test(code);

    // FillinAndRelateForm (copies field values to related records)
    const fillinRelate = /FillinAndRelateForm|FillAndRelateForm|FillAndRelate\w+|FillinAndRelate\w+/i.test(code);

    // CopyFieldValues / SetFieldValuesFromObj
    const copyFields = /CopyFieldValues|SetFieldValuesFromObj/i.test(code);

    // DoAjaxFormSave (persists in-memory values — relevant for FORM-BUG-1 load shift)
    const formSave = /DoAjaxFormSave\s*\(/.test(code);

    // Date manipulation APIs
    if (/new\s+Date\s*\(/.test(code)) dateApis.add('new Date()');
    if (/\.toISOString\s*\(/.test(code)) dateApis.add('toISOString()');
    if (/\.toLocaleString\s*\(/.test(code)) dateApis.add('toLocaleString()');
    if (/\bmoment\s*\(/.test(code)) dateApis.add('moment()');
    if (/\bdayjs\s*\(/.test(code)) dateApis.add('dayjs()');
    if (/Date\.parse\s*\(/.test(code)) dateApis.add('Date.parse()');
    if (/\.getTime\s*\(/.test(code)) dateApis.add('getTime()');
    if (/\.getFullYear\s*\(|\.getMonth\s*\(|\.getDate\s*\(/.test(code)) dateApis.add('Date getters');

    return {
        reads: [...reads],
        writes: [...writes],
        webServices: [...webServices],
        globals: [...globals],
        rawReads: [...rawReads],
        bulkRead,
        fillinRelate,
        copyFields,
        formSave,
        dateApis: [...dateApis],
    };
}

/**
 * Build a per-field script interaction map for a template.
 * Returns Map<fieldName, {
 *   reads: [{script, trigger}],
 *   writes: [{script, trigger, source}],
 *   rawReads: [{script}],
 *   bulkReads: [{script, webServices}],  — scripts using getFormDataCollection that also call a WS
 *   fillinRelate: [{script}],
 *   copyFields: [{script}],
 *   formSaves: [{script}],               — scripts that save the form (persists load-shifted values)
 *   dateApis: [{script, apis}],           — scripts using date manipulation near field operations
 * }>
 */
function buildFieldScriptMap(scripts, calendarFieldNames) {
    const fieldMap = new Map();
    for (const name of calendarFieldNames) {
        fieldMap.set(name, {
            reads: [],
            writes: [],
            rawReads: [],
            bulkReads: [],
            fillinRelate: [],
            copyFields: [],
            formSaves: [],
            dateApis: [],
        });
    }

    // Track template-level patterns that affect ALL calendar fields
    const templateLevelPatterns = {
        bulkReadScripts: [], // scripts using getFormDataCollection
        fillinRelateScripts: [], // scripts calling FillinAndRelateForm
        copyFieldsScripts: [], // scripts calling CopyFieldValues
    };

    for (const [, script] of scripts) {
        const analysis = analyzeScriptCode(script.code);
        const trigger =
            script.assignments.length > 0
                ? script.assignments.map((a) => `${a.controlName}:${a.eventName}`).join(', ')
                : '';

        // Explicit reads
        for (const fieldName of analysis.reads) {
            if (!fieldMap.has(fieldName)) continue;
            fieldMap.get(fieldName).reads.push({ script: script.name, trigger });
        }

        // Raw reads
        for (const fieldName of analysis.rawReads) {
            if (!fieldMap.has(fieldName)) continue;
            fieldMap.get(fieldName).rawReads.push({ script: script.name });
        }

        // Explicit writes
        for (const fieldName of analysis.writes) {
            if (!fieldMap.has(fieldName)) continue;
            let source = 'inline';
            if (analysis.webServices.length > 0) source = `WS: ${analysis.webServices.join(', ')}`;
            else if (analysis.globals.some((g) => /date|time/i.test(g)))
                source = `Global: ${analysis.globals.filter((g) => /date|time/i.test(g)).join(', ')}`;
            fieldMap.get(fieldName).writes.push({ script: script.name, trigger, source });
        }

        // Template-level: bulkRead (getFormDataCollection) — affects ALL fields
        if (analysis.bulkRead && analysis.webServices.length > 0) {
            templateLevelPatterns.bulkReadScripts.push({
                script: script.name,
                webServices: [...analysis.webServices],
            });
        }

        // Template-level: FillinAndRelateForm
        if (analysis.fillinRelate) {
            templateLevelPatterns.fillinRelateScripts.push({ script: script.name });
        }

        // Template-level: CopyFieldValues
        if (analysis.copyFields) {
            templateLevelPatterns.copyFieldsScripts.push({ script: script.name });
        }

        // Date API usage — attach to fields that this script explicitly touches
        if (analysis.dateApis.length > 0) {
            const touchedFields = new Set([...analysis.reads, ...analysis.writes]);
            for (const fieldName of touchedFields) {
                if (!fieldMap.has(fieldName)) continue;
                fieldMap.get(fieldName).dateApis.push({ script: script.name, apis: analysis.dateApis });
            }
        }
    }

    // Apply template-level patterns to ALL calendar fields
    for (const name of calendarFieldNames) {
        const entry = fieldMap.get(name);
        entry.bulkReads = templateLevelPatterns.bulkReadScripts;
        entry.fillinRelate = templateLevelPatterns.fillinRelateScripts;
        entry.copyFields = templateLevelPatterns.copyFieldsScripts;
    }

    return fieldMap;
}

/**
 * Generate an auto-comment for a field based on its config, assessment, and script interactions.
 */
function generateComment(field, scriptInfo) {
    const parts = [];

    // FORM-BUG-6 awareness: check if any read script's code checks for "Invalid Date"
    if (field._invalidDateCheck) {
        parts.push('Script checks for "Invalid Date" (FORM-BUG-6 awareness)');
    }

    // Config D + written by WS
    if (field.configId === 'D') {
        const wsWrites = scriptInfo.writes.filter((w) => w.source.startsWith('WS:'));
        if (wsWrites.length > 0) {
            parts.push(`Value set from server WS — format unknown, may trigger normalizeCalValue shift`);
        }
        const globalWrites = scriptInfo.writes.filter((w) => w.source.startsWith('Global:'));
        if (globalWrites.length > 0) {
            parts.push(`Value set from ${globalWrites[0].source} — implementation unknown`);
        }
    }

    // Round-trip detection (GFV/GDOC → SFV in same script)
    if (scriptInfo.reads.length > 0 && scriptInfo.writes.length > 0) {
        const readScripts = new Set(scriptInfo.reads.map((r) => r.script));
        const writeScripts = new Set(scriptInfo.writes.map((w) => w.script));
        const overlap = [...readScripts].filter((s) => writeScripts.has(s));
        if (overlap.length > 0) {
            parts.push(`GFV→SFV round-trip in: ${overlap.join(', ')}`);
            if (field.configId === 'D') parts.push('⚠️ FORM-BUG-5 drift risk');
        }
    }

    // Bulk read: getFormDataCollection sends ALL field values to a WS
    if (scriptInfo.bulkReads.length > 0) {
        const wsNames = scriptInfo.bulkReads.flatMap((b) => b.webServices);
        parts.push(`Bulk-sent to WS via getFormDataCollection (${wsNames.join(', ')})`);
    }

    // FillinAndRelateForm: copies field values to new records
    if (scriptInfo.fillinRelate.length > 0) {
        const scripts = scriptInfo.fillinRelate.map((f) => f.script);
        parts.push(`Field may be copied via FillinAndRelateForm (${scripts.join(', ')})`);
    }

    // CopyFieldValues: explicit field copying
    if (scriptInfo.copyFields.length > 0) {
        const scripts = scriptInfo.copyFields.map((f) => f.script);
        parts.push(`Field may be copied via CopyFieldValues (${scripts.join(', ')})`);
    }

    // Date API usage on scripts that touch this field
    if (scriptInfo.dateApis.length > 0) {
        const apis = [...new Set(scriptInfo.dateApis.flatMap((d) => d.apis))];
        parts.push(`Date APIs in touching scripts: ${apis.join(', ')}`);
    }

    return parts.join('. ');
}

function parseTemplate(filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        isArray: (name) => ['BaseField', 'FormScriptItem', 'FormScriptAssignment', 'FormPage'].includes(name),
    });
    const doc = parser.parse(xml);

    // Navigate: FormEntity > FormPages > FormPage > FieldList > BaseField[]
    const formPages = doc?.FormEntity?.FormPages?.FormPage;
    if (!formPages) return { fields: [], scriptMap: new Map() };

    const pageList = Array.isArray(formPages) ? formPages : [formPages];
    const fields = [];
    const controlMap = new Map();
    const calendarFieldNames = [];

    for (const page of pageList) {
        const baseFields = page?.FieldList?.BaseField;
        if (!baseFields) continue;
        const fieldList = Array.isArray(baseFields) ? baseFields : [baseFields];

        for (const field of fieldList) {
            const fieldType = field['@_xsi:type'] || field.FieldType || '';
            const id = field.ID;
            const name = field.Name || '(unnamed)';
            controlMap.set(id, { name, fieldType });

            if (fieldType !== 'FieldCalendar3') continue;

            const enableTime = toBool(field.EnableTime);
            const ignoreTimezone = toBool(field.IgnoreTimezone);
            const useLegacy = toBool(field.UseLegacy);
            const config = getConfig(enableTime, ignoreTimezone, useLegacy);
            const assessment = assessField(name, config.id, enableTime);

            calendarFieldNames.push(name);
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

    // Extract and analyze scripts
    const scripts = extractScripts(doc);
    resolveAssignments(doc, scripts, controlMap);
    const scriptMap = buildFieldScriptMap(scripts, calendarFieldNames);

    // Detect "Invalid Date" checks in scripts that read calendar fields
    for (const [, script] of scripts) {
        if (/Invalid Date/i.test(script.code)) {
            const analysis = analyzeScriptCode(script.code);
            for (const fieldName of analysis.reads) {
                const f = fields.find((ff) => ff.name === fieldName);
                if (f) f._invalidDateCheck = true;
            }
        }
    }

    // Generate comments
    for (const field of fields) {
        const si = scriptMap.get(field.name) || { reads: [], writes: [] };
        field.scriptInteractions = si;
        field.comment = generateComment(field, si);
    }

    return { fields, scriptMap };
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

    // Script interaction summary
    const fieldsWithScripts = [];
    for (const form of formData) {
        for (const field of form.fields) {
            const si = field.scriptInteractions || {
                reads: [],
                writes: [],
                rawReads: [],
                bulkReads: [],
                fillinRelate: [],
                copyFields: [],
            };
            if (
                si.reads.length > 0 ||
                si.writes.length > 0 ||
                si.rawReads.length > 0 ||
                si.bulkReads.length > 0 ||
                si.fillinRelate.length > 0 ||
                si.copyFields.length > 0
            ) {
                fieldsWithScripts.push({ form: form.name, ...field });
            }
        }
    }

    lines.push('### Script Interactions Summary');
    lines.push('');
    lines.push(`**${fieldsWithScripts.length} calendar fields** are referenced by form scripts.`);
    lines.push('');

    if (fieldsWithScripts.length > 0) {
        lines.push('| Form | Field | Config | Reads | Writes | Other | Comment |');
        lines.push('| :--- | :---- | :----: | :---- | :----- | :---- | :------ |');
        for (const f of fieldsWithScripts) {
            const si = f.scriptInteractions;
            const reads = si.reads.map((r) => r.script).join(', ') || '—';
            const writes = si.writes.map((w) => `${w.script} (${w.source})`).join(', ') || '—';

            // "Other" column: bulk reads, fill&relate, copy fields, raw reads
            const otherParts = [];
            if (si.bulkReads.length > 0) {
                const wsNames = si.bulkReads.flatMap((b) => b.webServices);
                otherParts.push(`Bulk→WS: ${wsNames.join(', ')}`);
            }
            if (si.fillinRelate.length > 0)
                otherParts.push(`Fill&Relate: ${si.fillinRelate.map((f) => f.script).join(', ')}`);
            if (si.copyFields.length > 0) otherParts.push(`Copy: ${si.copyFields.map((f) => f.script).join(', ')}`);
            if (si.rawReads.length > 0) otherParts.push(`Raw: ${si.rawReads.map((r) => r.script).join(', ')}`);
            const other = otherParts.join('; ') || '—';

            const configTag = f.configId === 'D' ? `**${f.configId}**` : f.configId;
            lines.push(
                `| ${f.form} | ${f.name} | ${configTag} | ${reads} | ${writes} | ${other} | ${f.comment || ''} |`
            );
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');

    // Per-form tables
    lines.push('## Form Templates');
    lines.push('');

    for (const form of formData) {
        lines.push(`### ${form.name}`);
        lines.push('');

        // Check if any field has script interactions
        const hasScripts = form.fields.some((f) => {
            if (!f.scriptInteractions) return false;
            const si = f.scriptInteractions;
            return (
                si.reads.length > 0 ||
                si.writes.length > 0 ||
                si.rawReads.length > 0 ||
                si.bulkReads.length > 0 ||
                si.fillinRelate.length > 0 ||
                si.copyFields.length > 0
            );
        });

        if (hasScripts) {
            lines.push('| Field Name | Config | Likely Model | Match | Initial Value | Scripts | Comment |');
            lines.push('| :--------- | :----: | :----------- | :---: | :------------ | :------ | :------ |');
        } else {
            lines.push('| Field Name | Config | Likely Model | Match | Initial Value |');
            lines.push('| :--------- | :----: | :----------- | :---: | :------------ |');
        }

        for (const field of form.fields) {
            const reasonSuffix = field.reason ? ` — ${field.reason}` : '';
            const si = field.scriptInteractions || { reads: [], writes: [] };

            if (hasScripts) {
                const scriptParts = [];
                if (si.reads.length > 0) scriptParts.push(`R: ${si.reads.map((r) => r.script).join(', ')}`);
                if (si.writes.length > 0) scriptParts.push(`W: ${si.writes.map((w) => w.script).join(', ')}`);
                if (si.rawReads.length > 0) scriptParts.push(`Raw: ${si.rawReads.map((r) => r.script).join(', ')}`);
                if (si.bulkReads.length > 0) scriptParts.push(`Bulk→WS`);
                if (si.fillinRelate.length > 0) scriptParts.push(`Fill&Relate`);
                if (si.copyFields.length > 0) scriptParts.push(`CopyFields`);
                const scriptsCell = scriptParts.join(' · ') || '—';
                lines.push(
                    `| ${field.name} | **${field.configId}** | ${field.likelyModel} | ${field.match}${reasonSuffix} | ${field.initialValue} | ${scriptsCell} | ${field.comment || ''} |`
                );
            } else {
                lines.push(
                    `| ${field.name} | **${field.configId}** | ${field.likelyModel} | ${field.match}${reasonSuffix} | ${field.initialValue} |`
                );
            }
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
    const { fields } = parseTemplate(filePath);
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
