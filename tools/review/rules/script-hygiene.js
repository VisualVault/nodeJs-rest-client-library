/**
 * Script hygiene rules (atomic)
 *
 * Exports 5 rules: script-orphan-assignment, script-unassigned, script-unused-template, script-empty-body, script-field-reference
 */

// --- Shared helpers ---

function buildScriptMap(scripts) {
    const map = new Map();
    for (const s of scripts) {
        map.set(s.id, s);
    }
    return map;
}

function buildFieldNameSet(fields) {
    return new Set(fields.map((f) => f.name.toLowerCase()));
}

module.exports = [
    {
        id: 'script-orphan-assignment',
        name: 'Script Assignments Reference Valid Controls',
        severity: 'warning',

        check(context) {
            const findings = [];
            const { scripts, assignments, controlMap } = context;
            if (scripts.length === 0) return findings;

            const scriptMap = buildScriptMap(scripts);

            for (const assign of assignments) {
                const script = scriptMap.get(assign.scriptId);
                const scriptName = script ? script.name : assign.scriptId;

                const isFormLevel = assign.controlId === '00000000-0000-0000-0000-000000000000';
                const isBuiltIn = assign.controlId.startsWith('00000001-');
                if (!isFormLevel && !isBuiltIn && !controlMap.has(assign.controlId)) {
                    findings.push({
                        ruleId: 'script-orphan-assignment',
                        severity: 'warning',
                        field: scriptName,
                        page: '—',
                        message: `Script assignment references non-existent control ID: ${assign.controlId}`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'script-unassigned',
        name: 'Event Scripts Must Be Assigned to a Control',
        severity: 'warning',

        check(context) {
            const findings = [];
            const { scripts, assignments } = context;
            if (scripts.length === 0) return findings;

            const assignedScriptIds = new Set(assignments.map((a) => a.scriptId));

            for (const script of scripts) {
                // Only flag ControlEventScriptItem — TemplateScriptItems are
                // helper functions called via VV.Form.Template.<Name>() and
                // intentionally have no assignment (see script-unused-template)
                if (script.type !== 'ControlEventScriptItem') continue;

                if (!assignedScriptIds.has(script.id)) {
                    findings.push({
                        ruleId: 'script-unassigned',
                        severity: 'warning',
                        field: script.name,
                        page: '—',
                        message: `Event script "${script.name}" has no assignment to any control`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'script-unused-template',
        name: 'Template Helper Scripts Must Be Referenced',
        severity: 'warning',

        check(context) {
            const findings = [];
            const { scripts } = context;
            if (scripts.length === 0) return findings;

            // Only check TemplateScriptItem (helper functions)
            const templateScripts = scripts.filter((s) => s.type === 'TemplateScriptItem');
            if (templateScripts.length === 0) return findings;

            for (const ts of templateScripts) {
                // Build code from all OTHER scripts to search for references
                const otherCode = scripts
                    .filter((s) => s.id !== ts.id)
                    .map((s) => s.code)
                    .join('\n');

                // Check for VV.Form.Template.Name() or Name() call patterns
                const nameEscaped = ts.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(
                    '(?:VV\\.Form\\.Template\\.' + nameEscaped + '|\\b' + nameEscaped + '\\s*\\()'
                );

                if (!pattern.test(otherCode)) {
                    findings.push({
                        ruleId: 'script-unused-template',
                        severity: 'warning',
                        field: ts.name,
                        page: '—',
                        message: `Template helper "${ts.name}" is never referenced from any other script`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'script-empty-body',
        name: 'Scripts Have Non-Empty Bodies',
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const script of context.scripts) {
                if (!script.code.trim()) {
                    findings.push({
                        ruleId: 'script-empty-body',
                        severity: 'warning',
                        field: script.name,
                        page: '—',
                        message: `Script "${script.name}" has an empty body`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'script-field-reference',
        name: 'Script Field References Exist',
        severity: 'warning',

        check(context) {
            const findings = [];
            const { scripts } = context;
            if (scripts.length === 0) return findings;

            const fieldNames = buildFieldNameSet(context.fields);
            const fieldRefPattern = /(?:GetFieldValue|SetFieldValue)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

            for (const script of scripts) {
                if (!script.code.trim()) continue;

                const checked = new Set();
                const regex = new RegExp(fieldRefPattern.source, 'g');
                let match;

                while ((match = regex.exec(script.code)) !== null) {
                    const refName = match[1];
                    if (checked.has(refName.toLowerCase())) continue;
                    checked.add(refName.toLowerCase());

                    if (!fieldNames.has(refName.toLowerCase())) {
                        findings.push({
                            ruleId: 'script-field-reference',
                            severity: 'warning',
                            field: script.name,
                            page: '—',
                            message: `Script references non-existent field "${refName}" via ${match[0].split('(')[0]}()`,
                        });
                    }
                }
            }
            return findings;
        },
    },
];
