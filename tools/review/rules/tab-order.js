/**
 * Tab order rules (atomic)
 *
 * Exports 2 rules: tab-order-zero, tab-order-unique
 */

const TAB_ORDER_FIELDS = [
    'FieldTextbox3',
    'FieldTextArea3',
    'FieldCalendar3',
    'FieldDropDownList3',
    'FieldCheckbox',
    'CellField',
    'UploadButton',
    'FormButton',
];

module.exports = [
    {
        id: 'tab-order-zero',
        name: 'Tab Order Auto-Calculated',
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (!TAB_ORDER_FIELDS.includes(field.type)) continue;
                if (field.tabOrder !== 0) {
                    findings.push({
                        ruleId: 'tab-order-zero',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `TabOrder is ${field.tabOrder} — should be 0 (auto-calculated)`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'tab-order-unique',
        name: 'Tab Order Unique Per Page',
        severity: 'error',

        check(context) {
            const findings = [];
            const byPage = new Map();

            for (const field of context.fields) {
                if (!TAB_ORDER_FIELDS.includes(field.type)) continue;
                if (field.tabOrder === 0) continue;

                const key = String(field.pageIndex);
                if (!byPage.has(key)) byPage.set(key, new Map());
                const pageOrders = byPage.get(key);
                if (!pageOrders.has(field.tabOrder)) pageOrders.set(field.tabOrder, []);
                pageOrders.get(field.tabOrder).push(field);
            }

            for (const [, pageOrders] of byPage) {
                for (const [order, fields] of pageOrders) {
                    if (fields.length > 1) {
                        const names = fields.map((f) => f.name).join(', ');
                        findings.push({
                            ruleId: 'tab-order-unique',
                            severity: 'error',
                            field: names,
                            page: fields[0].pageName,
                            message: `Duplicate TabOrder ${order} on ${fields.length} fields`,
                        });
                    }
                }
            }
            return findings;
        },
    },
];
