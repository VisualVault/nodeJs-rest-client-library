/**
 * Field configuration rules (atomic)
 *
 * Exports 2 rules: listener-disabled, field-max-length
 */

const LISTENER_FIELD_TYPES = [
    'FieldTextbox3',
    'FieldTextArea3',
    'FieldCalendar3',
    'FieldDropDownList3',
    'FieldCheckbox',
    'CellField',
];

const MAX_LENGTH_FIELD_TYPES = ['FieldTextbox3', 'FieldTextArea3'];

// Name patterns → expected MaxLength
const LENGTH_RULES = [
    { pattern: /\b(first|last|middle|maiden)\s*name\b/i, expected: 100, label: 'name field' },
    { pattern: /\bname\b/i, expected: 100, label: 'name field' },
    { pattern: /\b(street|mailing|physical|billing|shipping)\s*address\b/i, expected: 300, label: 'address field' },
    { pattern: /\baddress\b/i, expected: 300, label: 'address field' },
    {
        pattern: /\b(notes|comments|description|remarks|narrative|explanation)\b/i,
        expected: 3000,
        label: 'notes field',
    },
];
const DEFAULT_MAX_LENGTH = 50;

function toBool(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
}

module.exports = [
    {
        id: 'listener-disabled',
        name: 'Listener Should Be Disabled Unless Needed',
        component: 'form-templates',
        appliesTo: LISTENER_FIELD_TYPES,
        severity: 'info',

        check(context) {
            const findings = [];

            for (const field of context.fields) {
                if (!LISTENER_FIELD_TYPES.includes(field.type)) continue;
                const listenerEnabled = toBool(field._raw.EnableQListener);
                if (!listenerEnabled) continue;

                findings.push({
                    ruleId: 'listener-disabled',
                    severity: 'info',
                    field: field.name,
                    page: field.pageName,
                    message:
                        'EnableQListener is enabled — verify this field requires query string fill-in/relate capability',
                });
            }

            return findings;
        },
    },

    {
        id: 'field-max-length',
        name: 'Field MaxLength Appropriate for Content',
        component: 'form-templates',
        appliesTo: MAX_LENGTH_FIELD_TYPES,
        severity: 'info',

        check(context) {
            const findings = [];

            for (const field of context.fields) {
                if (!MAX_LENGTH_FIELD_TYPES.includes(field.type)) continue;
                if (!field.name || !field.name.trim()) continue;

                // Skip default names
                if (/^DataField\d+$/.test(field.name)) continue;

                const length = Number(field._raw.Length || 0);
                if (length === 0) continue; // No length set — platform default

                // TextArea defaults should be higher
                if (field.type === 'FieldTextArea3' && length < 3000) {
                    findings.push({
                        ruleId: 'field-max-length',
                        severity: 'info',
                        field: field.name,
                        page: field.pageName,
                        message: `TextArea MaxLength is ${length} — recommended minimum is 3000 for notes/text fields`,
                    });
                    continue;
                }

                // For textboxes, match name pattern to expected length
                if (field.type === 'FieldTextbox3') {
                    let matched = false;
                    for (const rule of LENGTH_RULES) {
                        if (rule.pattern.test(field.name)) {
                            matched = true;
                            if (length < rule.expected) {
                                findings.push({
                                    ruleId: 'field-max-length',
                                    severity: 'info',
                                    field: field.name,
                                    page: field.pageName,
                                    message: `MaxLength is ${length} for ${rule.label} — recommended minimum is ${rule.expected}`,
                                });
                            }
                            break;
                        }
                    }

                    if (!matched && length < DEFAULT_MAX_LENGTH) {
                        findings.push({
                            ruleId: 'field-max-length',
                            severity: 'info',
                            field: field.name,
                            page: field.pageName,
                            message: `MaxLength is ${length} — recommended minimum is ${DEFAULT_MAX_LENGTH}`,
                        });
                    }
                }
            }

            return findings;
        },
    },
];
