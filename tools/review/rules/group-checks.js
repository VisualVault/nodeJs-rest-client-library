/**
 * Group structural checks (atomic)
 *
 * Exports 2 rules: field-multiple-groups, group-override-condition
 */

const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

/**
 * Extract all condition FieldIDs from a condition collection object.
 * Handles both single ConditionBase and arrays.
 */
function extractConditionFieldIds(conditionCollection) {
    if (!conditionCollection) return [];
    const ids = [];
    const bases = conditionCollection.ConditionBase;
    if (!bases) return ids;
    const list = Array.isArray(bases) ? bases : [bases];
    for (const cond of list) {
        const fid = cond?.FieldValue1?.FieldID;
        if (fid && fid !== ZERO_GUID) ids.push(fid);
    }
    return ids;
}

module.exports = [
    {
        id: 'field-multiple-groups',
        name: 'Fields Must Not Appear in Multiple Groups',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'warning',

        check(context) {
            const findings = [];
            // Map fieldId → list of group names it appears in
            const fieldGroups = new Map();

            for (const group of context.groups) {
                for (const member of group.fieldMembers) {
                    const fid = member.fieldId;
                    if (!fid || fid === ZERO_GUID) continue;
                    if (fid.startsWith('00000001-')) continue;

                    if (!fieldGroups.has(fid)) fieldGroups.set(fid, []);
                    fieldGroups.get(fid).push(group.name);
                }
            }

            for (const [fid, groupNames] of fieldGroups) {
                if (groupNames.length <= 1) continue;
                const fieldName = context.controlMap.get(fid)?.name || fid;
                findings.push({
                    ruleId: 'field-multiple-groups',
                    severity: 'warning',
                    field: fieldName,
                    page: '—',
                    message: `Field appears in ${groupNames.length} groups: ${groupNames.join(', ')}`,
                });
            }

            return findings;
        },
    },

    {
        id: 'group-override-condition',
        name: 'Group Override Condition',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'info',

        check(context) {
            const findings = [];

            for (const group of context.groups) {
                // Skip admin groups (they ARE the override)
                if (group.name.toLowerCase().includes('admin')) continue;

                // Collect all condition field IDs from both condition collections
                const fieldIds = [
                    ...extractConditionFieldIds(group.conditions),
                    ...extractConditionFieldIds(group.readOnlyConditions),
                ];

                // Check if any referenced field has "override" in its name
                const hasOverride = fieldIds.some((fid) => {
                    const fieldName = context.controlMap.get(fid)?.name || '';
                    return fieldName.toLowerCase().includes('override');
                });

                if (!hasOverride) {
                    findings.push({
                        ruleId: 'group-override-condition',
                        severity: 'info',
                        field: group.name,
                        page: '—',
                        message: `Group does not reference an override field in its conditions`,
                    });
                }
            }

            return findings;
        },
    },

    {
        id: 'group-meaningful-name',
        name: 'Group Names Should Be Descriptive',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'info',

        check(context) {
            const findings = [];
            const defaultPattern = /^Group\d*$/i;

            for (const group of context.groups) {
                const name = group.name;
                if (!name || name === '(unnamed)' || defaultPattern.test(name) || name.trim().length < 3) {
                    findings.push({
                        ruleId: 'group-meaningful-name',
                        severity: 'info',
                        field: name || '(empty)',
                        page: '—',
                        message: `Group name "${name}" is not descriptive — use a meaningful name (e.g., "Hidden Fields", "BTN Manage Tab")`,
                    });
                }
            }

            return findings;
        },
    },

    {
        id: 'label-unnamed-in-group',
        name: 'Labels Should Only Be Named If Used in Groups',
        component: 'form-templates',
        appliesTo: ['FieldLabel'],
        severity: 'info',

        check(context) {
            const findings = [];

            // Collect all field IDs that appear in any group
            const idsInGroups = new Set();
            for (const group of context.groups) {
                for (const member of group.fieldMembers) {
                    if (member.fieldId) idsInGroups.add(member.fieldId);
                }
            }

            for (const field of context.fields) {
                if (field.type !== 'FieldLabel') continue;
                // Skip default-named labels — they weren't renamed
                if (/^Label\d+$/.test(field.name)) continue;
                if (!field.name || !field.name.trim()) continue;

                // If the label was renamed but isn't in any group, flag it
                if (!idsInGroups.has(field.id)) {
                    findings.push({
                        ruleId: 'label-unnamed-in-group',
                        severity: 'info',
                        field: field.name,
                        page: field.pageName,
                        message: `Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions`,
                    });
                }
            }

            return findings;
        },
    },

    {
        id: 'group-consolidate-conditions',
        name: 'Groups With Identical Conditions Should Be Consolidated',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'info',

        check(context) {
            const findings = [];
            if (context.groups.length < 2) return findings;

            // Create a fingerprint for each group's conditions
            function fingerprint(group) {
                const parts = [];
                if (group.conditions) parts.push(JSON.stringify(group.conditions));
                if (group.readOnlyConditions) parts.push(JSON.stringify(group.readOnlyConditions));
                return parts.join('|') || '';
            }

            const seen = new Map(); // fingerprint → first group name

            for (const group of context.groups) {
                const fp = fingerprint(group);
                if (!fp) continue; // No conditions — skip

                if (seen.has(fp)) {
                    findings.push({
                        ruleId: 'group-consolidate-conditions',
                        severity: 'info',
                        field: group.name,
                        page: '—',
                        message: `Group has identical conditions to "${seen.get(fp)}" — consider consolidating`,
                    });
                } else {
                    seen.set(fp, group.name);
                }
            }

            return findings;
        },
    },
];
