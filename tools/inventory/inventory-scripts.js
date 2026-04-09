/**
 * inventory-wadnr-scripts.js
 *
 * Parses all WADNR form template XML exports, extracts every inline script,
 * analyzes each for date-field interactions (GetFieldValue, SetFieldValue,
 * round-trips, web service calls, global function usage), and cross-references
 * against calendar field configurations to identify FORM-BUG-5 exposure.
 *
 * Usage:
 *   node tools/inventory/inventory-scripts.js
 *
 * Output:
 *   projects/wadnr/analysis/script-inventory.md
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const TEMPLATES_DIR = path.resolve(__dirname, '../../projects/wadnr/extracts/form-templates');
const OUTPUT_FILE = path.resolve(__dirname, '../../projects/wadnr/analysis/script-inventory.md');

// ─── Config mapping (same as inventory-wadnr-fields.js) ─────────────────────

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

const EVENT_NAMES = {
    1: 'onChange',
    3: 'onBlur',
    4: 'onClick',
    15: 'formLevel',
    16: 'onDataLoad',
};

function toBool(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
}

function getConfig(enableTime, ignoreTimezone, useLegacy) {
    const key = `${enableTime}|${ignoreTimezone}|${useLegacy}`;
    return CONFIG_MAP[key] || { id: '?', model: 'Unknown' };
}

// ─── XML Parsing ─────────────────────────────────────────────────────────────

function parseTemplate(filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        // Ensure arrays for repeated elements
        isArray: (name) => ['BaseField', 'FormScriptItem', 'FormScriptAssignment', 'FormPage'].includes(name),
    });
    const doc = parser.parse(xml);

    // 1. Build control map: ID → { name, fieldType }
    const controlMap = new Map();
    // 2. Build calendar field set: name → { configId, model, enableTime, ignoreTimezone, useLegacy }
    const calendarFields = new Map();

    const formPages = doc?.FormEntity?.FormPages?.FormPage;
    if (formPages) {
        const pageList = Array.isArray(formPages) ? formPages : [formPages];
        for (const page of pageList) {
            const baseFields = page?.FieldList?.BaseField;
            if (!baseFields) continue;
            const fieldList = Array.isArray(baseFields) ? baseFields : [baseFields];

            for (const field of fieldList) {
                const id = field.ID;
                const name = field.Name || '(unnamed)';
                const fieldType = field['@_xsi:type'] || field.FieldType || '';

                controlMap.set(id, { name, fieldType });

                if (fieldType === 'FieldCalendar3') {
                    const enableTime = toBool(field.EnableTime);
                    const ignoreTimezone = toBool(field.IgnoreTimezone);
                    const useLegacy = toBool(field.UseLegacy);
                    const config = getConfig(enableTime, ignoreTimezone, useLegacy);
                    calendarFields.set(name, {
                        configId: config.id,
                        model: config.model,
                        enableTime,
                        ignoreTimezone,
                        useLegacy,
                    });
                }
            }
        }
    }

    // 3. Extract scripts
    const scripts = new Map();
    const scriptItems = doc?.FormEntity?.ScriptLibrary?.FormScriptItem;
    if (scriptItems) {
        const itemList = Array.isArray(scriptItems) ? scriptItems : [scriptItems];
        for (const item of itemList) {
            scripts.set(item.ScriptItemId, {
                name: item.Name || '(unnamed)',
                arguments: item.Arguments || '',
                code: String(item.Script || ''),
                type: item.ScriptItemType || '',
                assignments: [],
            });
        }
    }

    // 4. Extract assignments and resolve to control names
    const assignments = doc?.FormEntity?.ScriptAssignments?.FormScriptAssignment;
    if (assignments) {
        const assignList = Array.isArray(assignments) ? assignments : [assignments];
        for (const assign of assignList) {
            const script = scripts.get(assign.ScriptItemId);
            if (!script) continue;
            const control = controlMap.get(assign.ControlId);
            const eventId = Number(assign.EventId) || 0;
            script.assignments.push({
                controlName: control ? control.name : assign.ControlId,
                controlType: control ? control.fieldType : 'unknown',
                eventName: EVENT_NAMES[eventId] || `event-${eventId}`,
                eventId,
            });
        }
    }

    return { controlMap, calendarFields, scripts };
}

// ─── Script Analysis ─────────────────────────────────────────────────────────

function analyzeScript(code, calendarFields) {
    const analysis = {
        getFieldValueCalls: [], // field names read
        setFieldValueCalls: [], // field names written
        webServiceCalls: [], // WS names
        globalFunctions: [], // VV.Form.Global.X function names
        dateManipulation: false, // uses Date/moment/dayjs
        calendarReads: [], // { fieldName, configId } for calendar fields read
        calendarWrites: [], // { fieldName, configId } for calendar fields written
        roundTrips: [], // { fieldName, configId } where same field is read AND written
        configDInteractions: [], // any interaction with Config D fields
    };

    if (!code || code.trim().length === 0) return analysis;

    // GetFieldValue
    const gfvPattern = /GetFieldValue\s*\(\s*['"](.+?)['"]\s*\)/g;
    let match;
    while ((match = gfvPattern.exec(code)) !== null) {
        const fieldName = match[1];
        if (!analysis.getFieldValueCalls.includes(fieldName)) {
            analysis.getFieldValueCalls.push(fieldName);
        }
    }

    // SetFieldValue
    const sfvPattern = /SetFieldValue\s*\(\s*['"](.+?)['"]\s*/g;
    while ((match = sfvPattern.exec(code)) !== null) {
        const fieldName = match[1];
        if (!analysis.setFieldValueCalls.includes(fieldName)) {
            analysis.setFieldValueCalls.push(fieldName);
        }
    }

    // Web service calls
    const wsPattern1 = /scripts\?name=(\w+)/g;
    while ((match = wsPattern1.exec(code)) !== null) {
        if (!analysis.webServiceCalls.includes(match[1])) {
            analysis.webServiceCalls.push(match[1]);
        }
    }
    // Also check for CallWS-style patterns
    const wsPattern2 = /(?:CallWS|callWS|CallWebService)\s*\(\s*['"](\w+)['"]/g;
    while ((match = wsPattern2.exec(code)) !== null) {
        if (!analysis.webServiceCalls.includes(match[1])) {
            analysis.webServiceCalls.push(match[1]);
        }
    }
    // VV.Form.Global.CallWS with name param
    const wsPattern3 = /Global\.CallWS\s*\(\s*\{[^}]*name\s*:\s*['"](\w+)['"]/g;
    while ((match = wsPattern3.exec(code)) !== null) {
        if (!analysis.webServiceCalls.includes(match[1])) {
            analysis.webServiceCalls.push(match[1]);
        }
    }

    // Global functions
    const globalPattern = /VV\.Form\.Global\.(\w+)/g;
    while ((match = globalPattern.exec(code)) !== null) {
        if (!analysis.globalFunctions.includes(match[1])) {
            analysis.globalFunctions.push(match[1]);
        }
    }

    // Date manipulation
    const datePatterns = [
        /new\s+Date\s*\(/,
        /\.toISOString\s*\(/,
        /\bmoment\s*\(/,
        /\bdayjs\s*\(/,
        /\.getTime\s*\(/,
        /Date\.parse\s*\(/,
        /\.format\s*\(\s*['"][^'"]*[YMDHhms]/, // format with date tokens
    ];
    analysis.dateManipulation = datePatterns.some((p) => p.test(code));

    // Cross-reference with calendar fields
    for (const fieldName of analysis.getFieldValueCalls) {
        const cal = calendarFields.get(fieldName);
        if (cal) {
            analysis.calendarReads.push({ fieldName, configId: cal.configId, model: cal.model });
            if (cal.configId === 'D') {
                analysis.configDInteractions.push({ fieldName, operation: 'read', configId: 'D' });
            }
        }
    }

    for (const fieldName of analysis.setFieldValueCalls) {
        const cal = calendarFields.get(fieldName);
        if (cal) {
            analysis.calendarWrites.push({ fieldName, configId: cal.configId, model: cal.model });
            if (cal.configId === 'D') {
                analysis.configDInteractions.push({ fieldName, operation: 'write', configId: 'D' });
            }
        }
    }

    // Round-trips: same calendar field appears in both GFV and SFV
    for (const read of analysis.calendarReads) {
        const isAlsoWritten = analysis.calendarWrites.some((w) => w.fieldName === read.fieldName);
        if (isAlsoWritten) {
            analysis.roundTrips.push({ fieldName: read.fieldName, configId: read.configId });
        }
    }

    return analysis;
}

// ─── Markdown Generation ─────────────────────────────────────────────────────

function generateMarkdown(allTemplates) {
    const lines = [];

    // Aggregate stats
    let totalScripts = 0;
    let totalWithDateInteraction = 0;
    let totalWithConfigD = 0;
    let totalWithRoundTrip = 0;
    let totalCalendarFields = 0;
    const highRiskScripts = []; // scripts with calendar round-trips
    const dateInteractions = []; // all calendar field interactions
    const allWebServiceCalls = []; // all WS calls across templates
    const globalFunctionUsage = {}; // globalName → Set of template names
    const templatesWithCalendar = []; // templates that have calendar fields

    for (const tmpl of allTemplates) {
        const hasCalendar = tmpl.calendarFields.size > 0;
        if (hasCalendar) {
            totalCalendarFields += tmpl.calendarFields.size;
            templatesWithCalendar.push(tmpl);
        }

        for (const [, script] of tmpl.scripts) {
            totalScripts++;
            const a = script.analysis;
            if (!a) continue;

            const hasDateInteraction = a.calendarReads.length > 0 || a.calendarWrites.length > 0;
            if (hasDateInteraction) totalWithDateInteraction++;
            if (a.configDInteractions.length > 0) totalWithConfigD++;
            if (a.roundTrips.length > 0) {
                totalWithRoundTrip++;
                for (const rt of a.roundTrips) {
                    highRiskScripts.push({
                        template: tmpl.name,
                        scriptName: script.name,
                        fieldName: rt.fieldName,
                        configId: rt.configId,
                        event:
                            script.assignments.map((as) => `${as.controlName}:${as.eventName}`).join(', ') ||
                            'unassigned',
                    });
                }
            }

            // Collect all calendar interactions
            for (const read of a.calendarReads) {
                dateInteractions.push({
                    template: tmpl.name,
                    scriptName: script.name,
                    fieldName: read.fieldName,
                    configId: read.configId,
                    operation: 'GetFieldValue',
                    hasRoundTrip: a.roundTrips.some((r) => r.fieldName === read.fieldName),
                });
            }
            for (const write of a.calendarWrites) {
                // Avoid duplicate if already captured as round-trip read
                const alreadyCaptured = a.calendarReads.some((r) => r.fieldName === write.fieldName);
                if (!alreadyCaptured) {
                    dateInteractions.push({
                        template: tmpl.name,
                        scriptName: script.name,
                        fieldName: write.fieldName,
                        configId: write.configId,
                        operation: 'SetFieldValue',
                        hasRoundTrip: false,
                    });
                } else {
                    // Add the write entry too for completeness
                    dateInteractions.push({
                        template: tmpl.name,
                        scriptName: script.name,
                        fieldName: write.fieldName,
                        configId: write.configId,
                        operation: 'SetFieldValue (round-trip)',
                        hasRoundTrip: true,
                    });
                }
            }

            // Web service calls
            for (const ws of a.webServiceCalls) {
                allWebServiceCalls.push({
                    template: tmpl.name,
                    scriptName: script.name,
                    webService: ws,
                });
            }

            // Global function usage
            for (const fn of a.globalFunctions) {
                if (!globalFunctionUsage[fn]) globalFunctionUsage[fn] = new Set();
                globalFunctionUsage[fn].add(tmpl.name);
            }
        }
    }

    // ─── Header ──────────────────────────────────────────────────────────────

    lines.push('# WADNR Script Inventory — Date Field Interactions');
    lines.push('');
    lines.push('Automated analysis of inline form scripts across all WADNR form templates,');
    lines.push('identifying interactions with calendar fields and exposure to date handling bugs.');
    lines.push('');
    lines.push(
        `Generated: ${new Date().toISOString().split('T')[0]} | Source: ${allTemplates.length} templates parsed`
    );
    lines.push('');
    lines.push('> **Scope**: Template scripts only. `VV.Form.Global.*` implementations are site-level');
    lines.push('> and not included in template XML — calls to Global functions are flagged for separate review.');
    lines.push('');
    lines.push('---');
    lines.push('');

    // ─── Executive Summary ───────────────────────────────────────────────────

    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`| --- | ---: |`);
    lines.push(`| Total templates parsed | ${allTemplates.length} |`);
    lines.push(`| Templates with calendar fields | ${templatesWithCalendar.length} |`);
    lines.push(`| Total calendar fields | ${totalCalendarFields} |`);
    lines.push(`| Total scripts extracted | ${totalScripts} |`);
    lines.push(`| Scripts with calendar field interactions | ${totalWithDateInteraction} |`);
    lines.push(`| Scripts with Config D interactions | ${totalWithConfigD} |`);
    lines.push(`| **Scripts with calendar round-trips (GFV→SFV)** | **${totalWithRoundTrip}** |`);
    lines.push('');

    // ─── High-Risk Scripts ───────────────────────────────────────────────────

    lines.push('## High-Risk Scripts — Calendar Field Round-Trips');
    lines.push('');
    lines.push('Scripts where the same calendar field is read with `GetFieldValue` and written back');
    lines.push(
        'with `SetFieldValue`. Each round-trip on a Config D field triggers [FORM-BUG-5](../analysis/temporal-models.md)'
    );
    lines.push('drift (±TZ offset per cycle).');
    lines.push('');

    if (highRiskScripts.length === 0) {
        lines.push('**No calendar field round-trips detected.**');
    } else {
        lines.push('| Template | Script | Field | Config | Trigger |');
        lines.push('| :------- | :----- | :---- | :----: | :------ |');
        for (const hr of highRiskScripts) {
            const configTag = hr.configId === 'D' ? `**${hr.configId}** ⚠️` : hr.configId;
            lines.push(`| ${hr.template} | ${hr.scriptName} | ${hr.fieldName} | ${configTag} | ${hr.event} |`);
        }
    }
    lines.push('');

    // ─── All Calendar Field Interactions ─────────────────────────────────────

    lines.push('## Calendar Field Interactions');
    lines.push('');
    lines.push('Every script that reads or writes a calendar field via `GetFieldValue`/`SetFieldValue`.');
    lines.push('');

    if (dateInteractions.length === 0) {
        lines.push('**No calendar field interactions detected.**');
    } else {
        // Group by template for readability
        const byTemplate = {};
        for (const di of dateInteractions) {
            if (!byTemplate[di.template]) byTemplate[di.template] = [];
            byTemplate[di.template].push(di);
        }

        lines.push('| Template | Script | Field | Config | Operation | Round-Trip? |');
        lines.push('| :------- | :----- | :---- | :----: | :-------- | :---------: |');
        for (const [template, interactions] of Object.entries(byTemplate).sort(([a], [b]) => a.localeCompare(b))) {
            for (const di of interactions) {
                const rtFlag = di.hasRoundTrip ? '**YES**' : '';
                const configTag = di.configId === 'D' ? `**${di.configId}**` : di.configId;
                lines.push(
                    `| ${template} | ${di.scriptName} | ${di.fieldName} | ${configTag} | ${di.operation} | ${rtFlag} |`
                );
            }
        }
    }
    lines.push('');

    // ─── Web Service Calls ───────────────────────────────────────────────────

    lines.push('## Web Service Calls');
    lines.push('');
    lines.push('Server-side web services invoked from form scripts. These execute on the Node.js');
    lines.push('microservice server and may also read/write date fields via the VV REST API.');
    lines.push('Server-side code is not available in this repo — flagged for separate review.');
    lines.push('');

    if (allWebServiceCalls.length === 0) {
        lines.push('**No web service calls detected.**');
    } else {
        // Deduplicate by WS name + template
        const wsUnique = {};
        for (const ws of allWebServiceCalls) {
            const key = `${ws.webService}|${ws.template}`;
            if (!wsUnique[key]) wsUnique[key] = { ...ws, scripts: [] };
            wsUnique[key].scripts.push(ws.scriptName);
        }

        lines.push('| Web Service | Template | Called From |');
        lines.push('| :---------- | :------- | :---------- |');
        for (const ws of Object.values(wsUnique).sort((a, b) => a.webService.localeCompare(b.webService))) {
            lines.push(`| ${ws.webService} | ${ws.template} | ${ws.scripts.join(', ')} |`);
        }
    }
    lines.push('');

    // ─── Global Function Usage ───────────────────────────────────────────────

    lines.push('## Global Function Usage');
    lines.push('');
    lines.push('`VV.Form.Global.*` functions called from template scripts. Implementations are');
    lines.push('site-level (not in template XML). Functions that may handle dates are flagged.');
    lines.push('');

    const dateRelatedGlobals = ['CentralDateValidation', 'SetDate', 'GetDate', 'FormatDate', 'ParseDate'];

    const sortedGlobals = Object.entries(globalFunctionUsage)
        .map(([name, templates]) => ({ name, count: templates.size, templates: [...templates].sort() }))
        .sort((a, b) => b.count - a.count);

    if (sortedGlobals.length === 0) {
        lines.push('**No Global function calls detected.**');
    } else {
        lines.push('| Function | Templates Using | Date-Related? |');
        lines.push('| :------- | :-------------: | :-----------: |');
        for (const g of sortedGlobals) {
            const dateFlag = dateRelatedGlobals.some((d) => g.name.toLowerCase().includes(d.toLowerCase()))
                ? '⚠️ Review'
                : '';
            lines.push(`| ${g.name} | ${g.count} | ${dateFlag} |`);
        }
    }
    lines.push('');

    // ─── Per-Template Detail ─────────────────────────────────────────────────

    lines.push('## Per-Template Detail');
    lines.push('');
    lines.push('Templates with calendar fields and their script interactions.');
    lines.push('');

    for (const tmpl of templatesWithCalendar.sort((a, b) => a.name.localeCompare(b.name))) {
        // Collect scripts with any meaningful analysis
        const scriptsWithInteractions = [];
        for (const [, script] of tmpl.scripts) {
            const a = script.analysis;
            if (!a) continue;
            if (
                a.calendarReads.length > 0 ||
                a.calendarWrites.length > 0 ||
                a.webServiceCalls.length > 0 ||
                a.dateManipulation
            ) {
                scriptsWithInteractions.push(script);
            }
        }

        // Calendar fields summary
        const calFields = [...tmpl.calendarFields.entries()].map(([name, cfg]) => `${name} (${cfg.configId})`);

        lines.push(`### ${tmpl.name}`);
        lines.push('');
        lines.push(`**Calendar fields**: ${calFields.join(', ') || 'None'}`);
        lines.push(
            `**Total scripts**: ${tmpl.scripts.size} | **With date interactions**: ${scriptsWithInteractions.length}`
        );
        lines.push('');

        if (scriptsWithInteractions.length > 0) {
            for (const script of scriptsWithInteractions) {
                const a = script.analysis;
                const parts = [];
                if (a.calendarReads.length > 0)
                    parts.push(`Reads: ${a.calendarReads.map((r) => `${r.fieldName} (${r.configId})`).join(', ')}`);
                if (a.calendarWrites.length > 0)
                    parts.push(`Writes: ${a.calendarWrites.map((w) => `${w.fieldName} (${w.configId})`).join(', ')}`);
                if (a.roundTrips.length > 0)
                    parts.push(
                        `**Round-trips: ${a.roundTrips.map((r) => `${r.fieldName} (${r.configId})`).join(', ')}**`
                    );
                if (a.webServiceCalls.length > 0) parts.push(`WS: ${a.webServiceCalls.join(', ')}`);
                if (a.dateManipulation) parts.push('Uses Date/moment APIs');

                const trigger =
                    script.assignments.length > 0
                        ? script.assignments.map((as) => `${as.controlName}:${as.eventName}`).join(', ')
                        : 'unassigned';

                lines.push(`- **${script.name}** (${script.type}, trigger: ${trigger})`);
                for (const part of parts) {
                    lines.push(`  - ${part}`);
                }
            }
        } else {
            lines.push('_No scripts interact with calendar fields or date APIs._');
        }
        lines.push('');
    }

    return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

const xmlFiles = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.xml'))
    .sort();

console.log(`Parsing ${xmlFiles.length} template XMLs...`);

const allTemplates = [];

for (const file of xmlFiles) {
    const filePath = path.join(TEMPLATES_DIR, file);
    const { calendarFields, scripts } = parseTemplate(filePath);
    const name = file.replace('.xml', '');

    // Analyze each script
    for (const [, script] of scripts) {
        script.analysis = analyzeScript(script.code, calendarFields);
    }

    allTemplates.push({ name, calendarFields, scripts });
}

const markdown = generateMarkdown(allTemplates);
fs.writeFileSync(OUTPUT_FILE, markdown + '\n');

// Console summary
let totalScripts = 0;
let totalWithCalendar = 0;
let totalRoundTrips = 0;
let totalConfigD = 0;

for (const tmpl of allTemplates) {
    for (const [, script] of tmpl.scripts) {
        totalScripts++;
        const a = script.analysis;
        if (!a) continue;
        if (a.calendarReads.length > 0 || a.calendarWrites.length > 0) totalWithCalendar++;
        if (a.roundTrips.length > 0) totalRoundTrips++;
        if (a.configDInteractions.length > 0) totalConfigD++;
    }
}

console.log(`\nResults:`);
console.log(`  Templates:        ${allTemplates.length}`);
console.log(`  Total scripts:    ${totalScripts}`);
console.log(`  Calendar interactions: ${totalWithCalendar}`);
console.log(`  Config D interactions: ${totalConfigD}`);
console.log(`  Round-trips (GFV→SFV): ${totalRoundTrips}`);
console.log(`\nOutput: ${OUTPUT_FILE}`);
