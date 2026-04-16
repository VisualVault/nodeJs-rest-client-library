/**
 * Naming convention rules (atomic)
 *
 * Exports 1 rule: button-label-camelcase
 *
 * Complements field-naming.js which handles data field naming (Title Case).
 * This file covers the inverse convention: buttons and labels use camelCase
 * with specific prefixes (btn, lbl).
 */

module.exports = [
    {
        id: 'button-label-camelcase',
        name: 'Button and Label CamelCase Naming',
        component: 'form-templates',
        appliesTo: ['FormButton', 'FieldLabel'],
        severity: 'warning',

        check(context) {
            const findings = [];

            for (const field of context.fields) {
                if (field.type !== 'FormButton' && field.type !== 'FieldLabel') continue;
                if (!field.name || !field.name.trim()) continue;

                // Skip default names — they have their own rule
                if (/^DataField\d+$/.test(field.name)) continue;
                if (/^Label\d+$/.test(field.name)) continue;

                const expectedPrefix = field.type === 'FormButton' ? 'btn' : 'lbl';
                const hasPrefix = field.name.startsWith(expectedPrefix);

                if (!hasPrefix) {
                    findings.push({
                        ruleId: 'button-label-camelcase',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `${field.type === 'FormButton' ? 'Button' : 'Label'} name should start with "${expectedPrefix}" prefix (camelCase convention)`,
                    });
                }
            }

            return findings;
        },
    },
];
