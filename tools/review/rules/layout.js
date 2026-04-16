/**
 * Layout rules (atomic)
 *
 * Exports 2 rules: distance-to-border, label-overlap
 */

const DISTANCE_CHECK_TYPES = [
    'FormButton',
    'FieldCalendar3',
    'CellField',
    'FieldCheckbox',
    'FieldDropDownList3',
    'FormIDStamp',
    'ImageFormControl',
    'UserIDStamp',
    'FieldTextbox3',
    'FieldTextArea3',
    'UploadButton',
];

module.exports = [
    {
        id: 'distance-to-border',
        name: 'Distance to Page Border',
        component: 'form-templates',
        appliesTo: DISTANCE_CHECK_TYPES,
        severity: 'warning',

        check(context) {
            const findings = [];
            const MIN_DISTANCE = 30;

            for (const field of context.fields) {
                if (!DISTANCE_CHECK_TYPES.includes(field.type)) continue;

                const page = context.pages[field.pageIndex];
                if (!page || !page.width) continue;

                const fieldRight = field.layoutLeft + field.width;
                const distanceToRight = page.width - fieldRight;

                if (distanceToRight < MIN_DISTANCE) {
                    findings.push({
                        ruleId: 'distance-to-border',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Field is ${Math.round(distanceToRight)}px from the right border (minimum: ${MIN_DISTANCE}px)`,
                    });
                }
            }

            return findings;
        },
    },

    {
        id: 'label-overlap',
        name: 'Label Overlapping Adjacent Field',
        component: 'form-templates',
        appliesTo: ['FieldLabel'],
        severity: 'warning',

        check(context) {
            const findings = [];
            const OVERLAP_THRESHOLD = 5;
            const VERTICAL_TOLERANCE = 15;

            // Pre-filter labels and non-labels by page
            const labelsByPage = new Map();
            const fieldsByPage = new Map();

            for (const field of context.fields) {
                const page = field.pageIndex;
                if (field.type === 'FieldLabel') {
                    if (!labelsByPage.has(page)) labelsByPage.set(page, []);
                    labelsByPage.get(page).push(field);
                } else if (field.type !== 'FormIDStamp') {
                    if (!fieldsByPage.has(page)) fieldsByPage.set(page, []);
                    fieldsByPage.get(page).push(field);
                }
            }

            for (const [pageIdx, labels] of labelsByPage) {
                const pageFields = fieldsByPage.get(pageIdx) || [];

                for (const label of labels) {
                    const labelRight = label.layoutLeft + label.width;

                    for (const field of pageFields) {
                        const sameRow = Math.abs(field.layoutTop - label.layoutTop) <= VERTICAL_TOLERANCE;
                        if (!sameRow) continue;
                        if (field.layoutLeft <= label.layoutLeft) continue;

                        const overlap = labelRight - field.layoutLeft;
                        if (overlap >= OVERLAP_THRESHOLD) {
                            findings.push({
                                ruleId: 'label-overlap',
                                severity: 'warning',
                                field: field.name,
                                page: field.pageName,
                                message: `Label "${label.name}" overlaps field by ${Math.round(overlap)}px`,
                            });
                        }
                    }
                }
            }

            return findings;
        },
    },

    {
        id: 'button-min-size',
        name: 'Button Minimum Size',
        component: 'form-templates',
        appliesTo: ['FormButton'],
        severity: 'warning',

        check(context) {
            const findings = [];
            const MIN_SIZE = 24;

            for (const field of context.fields) {
                if (field.type !== 'FormButton') continue;
                const width = Number(field._raw.Width || 0);
                const height = Number(field._raw.Height || 0);

                if (width < MIN_SIZE || height < MIN_SIZE) {
                    findings.push({
                        ruleId: 'button-min-size',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Button is ${width}x${height}px — minimum is ${MIN_SIZE}x${MIN_SIZE}px (508 compliance)`,
                    });
                }
            }

            return findings;
        },
    },
];
