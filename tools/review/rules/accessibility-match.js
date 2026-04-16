/**
 * Accessibility label matching rule (atomic)
 *
 * Exports 1 rule: accessibility-label-match
 *
 * Distinct from accessibility-label (which checks presence only).
 * This rule checks that the AccessibilityLabel value matches the
 * visible label text (found by geometric proximity) or the field's
 * own Text property for self-labeled types.
 */

const SELF_LABELED_TYPES = ['FieldCheckbox', 'FormButton', 'FormIDStamp', 'UploadButton'];

const LABELED_INPUT_TYPES = [
    'FieldTextbox3',
    'FieldTextArea3',
    'FieldCalendar3',
    'FieldDropDownList3',
    'CellField',
    'UserIDStamp',
];

const ALL_CHECKED_TYPES = [...LABELED_INPUT_TYPES, ...SELF_LABELED_TYPES];

/**
 * Find the closest label to the left of a field on the same row.
 * Matches xml-fixer logic: same row (±15px vertical), label right edge
 * within 60px of field left edge.
 */
function findNearestLabel(field, labels) {
    let bestLabel = null;
    let bestDistance = Infinity;

    for (const label of labels) {
        const verticalDiff = Math.abs(label.layoutTop - field.layoutTop);
        if (verticalDiff > 15) continue;

        const labelRight = label.layoutLeft + label.width;
        const gap = field.layoutLeft - labelRight;
        if (gap < 0 || gap > 60) continue;

        if (gap < bestDistance) {
            bestDistance = gap;
            bestLabel = label;
        }
    }

    return bestLabel;
}

/**
 * Clean label text: strip HTML, strip trailing colon, trim.
 */
function cleanLabelText(text) {
    if (!text) return '';
    // Strip HTML tags and everything after <
    let cleaned = String(text).split('<')[0];
    // Strip trailing colon
    cleaned = cleaned.split(':')[0];
    return cleaned.trim();
}

module.exports = [
    {
        id: 'accessibility-label-match',
        name: 'Accessibility Label Matches Visible Text',
        component: 'form-templates',
        appliesTo: ALL_CHECKED_TYPES,
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

            for (const field of context.fields) {
                if (!ALL_CHECKED_TYPES.includes(field.type)) continue;

                const currentAcc = String(field.accessibilityLabel || '').trim();
                if (!currentAcc) continue; // Empty label is caught by accessibility-label rule

                let expectedText;

                if (SELF_LABELED_TYPES.includes(field.type)) {
                    // Self-labeled: use field's own Text property
                    expectedText = cleanLabelText(field.text);
                } else {
                    // Label-based: find nearest label by proximity
                    const labels = labelsByPage.get(field.pageIndex) || [];
                    const label = findNearestLabel(field, labels);
                    if (!label) continue; // No label found — can't compare
                    expectedText = cleanLabelText(label.text);
                }

                if (!expectedText) continue; // No expected text to compare against

                // Strip " field Required" suffix from current accessibility label for comparison
                const normalizedAcc = currentAcc.replace(/\s*field\s+Required$/i, '').trim();

                if (normalizedAcc.toLowerCase() !== expectedText.toLowerCase()) {
                    findings.push({
                        ruleId: 'accessibility-label-match',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `AccessibilityLabel "${currentAcc}" does not match expected "${expectedText}"`,
                    });
                }
            }

            return findings;
        },
    },
];
