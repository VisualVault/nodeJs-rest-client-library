/**
 * Default text rule (atomic)
 *
 * Exports 1 rule: default-text
 */

const DEFAULT_TEXT_PATTERNS = {
    FieldCheckbox: /^Checkbox/,
    UserIDStamp: /^Signature Stamp/,
    FormButton: /^Next$/,
};

const DEFAULT_TEXT_FIELD_TYPES = Object.keys(DEFAULT_TEXT_PATTERNS);

module.exports = [
    {
        id: 'default-text',
        name: 'Default Text Values',
        component: 'form-templates',
        appliesTo: DEFAULT_TEXT_FIELD_TYPES,
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                const pattern = DEFAULT_TEXT_PATTERNS[field.type];
                if (!pattern) continue;
                const text = String(field.text || '');
                if (pattern.test(text)) {
                    findings.push({
                        ruleId: 'default-text',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Field text "${text}" is a default value`,
                    });
                }
            }
            return findings;
        },
    },
];
