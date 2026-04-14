/**
 * Accessibility rule (atomic)
 *
 * Exports 1 rule: accessibility-label
 */

const NEEDS_ACCESSIBILITY = [
    'FieldTextbox3',
    'FieldTextArea3',
    'FieldCalendar3',
    'FieldDropDownList3',
    'FieldCheckbox',
    'CellField',
    'UploadButton',
    'UserIDStamp',
];

module.exports = [
    {
        id: 'accessibility-label',
        name: 'Accessibility Labels',
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (!NEEDS_ACCESSIBILITY.includes(field.type)) continue;
                const label = field.accessibilityLabel;
                if (!label || !String(label).trim()) {
                    findings.push({
                        ruleId: 'accessibility-label',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: 'Missing AccessibilityLabel',
                    });
                }
            }
            return findings;
        },
    },
];
