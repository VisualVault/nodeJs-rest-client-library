/**
 * Orphan reference rules (atomic)
 *
 * Exports 2 rules: orphan-container-ref, orphan-group-member
 */

const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

module.exports = [
    {
        id: 'orphan-container-ref',
        name: 'Container References Valid',
        severity: 'error',

        check(context) {
            const findings = [];
            const containerIds = new Set();
            for (const field of context.fields) {
                if (field.type === 'FieldContainer') containerIds.add(field.id);
            }

            for (const field of context.fields) {
                const cid = field.containerId;
                if (!cid || cid === ZERO_GUID) continue;
                if (!containerIds.has(cid)) {
                    findings.push({
                        ruleId: 'orphan-container-ref',
                        severity: 'error',
                        field: field.name,
                        page: field.pageName,
                        message: `ContainerId references non-existent container: ${cid}`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'orphan-group-member',
        name: 'Group Members Reference Valid Fields',
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const group of context.groups) {
                for (const member of group.fieldMembers) {
                    const fid = member.fieldId;
                    if (!fid || fid === ZERO_GUID) continue;
                    if (fid.startsWith('00000001-')) continue;
                    if (!context.controlMap.has(fid)) {
                        findings.push({
                            ruleId: 'orphan-group-member',
                            severity: 'warning',
                            field: group.name,
                            page: '—',
                            message: `Group member references non-existent field ID: ${fid}`,
                        });
                    }
                }
            }
            return findings;
        },
    },
];
