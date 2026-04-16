/**
 * Container configuration rules (atomic)
 *
 * Exports 1 rule: container-responsive-flow
 */

module.exports = [
    {
        id: 'container-responsive-flow',
        name: 'Container Responsive Flow',
        component: 'form-templates',
        appliesTo: ['FieldContainer'],
        severity: 'warning',

        check(context) {
            const findings = [];
            const ONE_COLUMN = '3';
            const TWO_COLUMNS = '4';

            // Count fields per container
            const containerChildCount = new Map();
            for (const field of context.fields) {
                const cid = field.containerId;
                if (!cid || cid === '00000000-0000-0000-0000-000000000000') continue;
                containerChildCount.set(cid, (containerChildCount.get(cid) || 0) + 1);
            }

            for (const field of context.fields) {
                if (field.type !== 'FieldContainer') continue;
                const childCount = containerChildCount.get(field.id) || 0;
                if (childCount <= 1) continue;

                const flow = String(field.responsiveFlow);
                if (flow !== ONE_COLUMN && flow !== TWO_COLUMNS) {
                    findings.push({
                        ruleId: 'container-responsive-flow',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Container has ${childCount} fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: ${flow || 'none'})`,
                    });
                }
            }

            return findings;
        },
    },
];
