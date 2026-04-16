/**
 * Accessibility rules (atomic)
 *
 * Exports 2 rules: accessibility-label, accessibility-required
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
        component: 'form-templates',
        appliesTo: NEEDS_ACCESSIBILITY,
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

    {
        id: 'accessibility-required',
        name: 'Required Fields Must Have "field Required" in Accessibility Label',
        component: 'form-templates',
        appliesTo: NEEDS_ACCESSIBILITY,
        severity: 'warning',

        check(context) {
            const findings = [];

            // Pre-collect labels by page for proximity lookups
            const labelsByPage = new Map();
            for (const field of context.fields) {
                if (field.type === 'FieldLabel') {
                    if (!labelsByPage.has(field.pageIndex)) labelsByPage.set(field.pageIndex, []);
                    labelsByPage.get(field.pageIndex).push(field);
                }
            }

            // Self-labeled types use their own Text property for required indicator
            const selfLabeled = ['FieldCheckbox', 'FormButton', 'UploadButton'];

            for (const field of context.fields) {
                if (!NEEDS_ACCESSIBILITY.includes(field.type)) continue;
                const accLabel = String(field.accessibilityLabel || '').trim();
                if (!accLabel) continue; // Empty label is caught by accessibility-label rule

                // Determine if field is required
                let isRequired = false;

                if (selfLabeled.includes(field.type)) {
                    // Self-labeled: check own Text for asterisk
                    isRequired = String(field.text || '').includes('*');
                } else {
                    // Find nearest label by proximity and check for asterisk
                    const labels = labelsByPage.get(field.pageIndex) || [];
                    for (const label of labels) {
                        const verticalDiff = Math.abs(label.layoutTop - field.layoutTop);
                        if (verticalDiff > 15) continue;
                        const labelRight = label.layoutLeft + label.width;
                        const gap = field.layoutLeft - labelRight;
                        if (gap < 0 || gap > 60) continue;

                        // Found the nearest label — check for required indicator
                        if (String(label.text || '').includes('*')) {
                            isRequired = true;
                        }
                        break;
                    }
                }

                if (isRequired && !/field\s+Required/i.test(accLabel)) {
                    findings.push({
                        ruleId: 'accessibility-required',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Required field AccessibilityLabel "${accLabel}" should end with "field Required"`,
                    });
                }
            }

            return findings;
        },
    },
];
