/**
 * Form control rules (atomic)
 *
 * Exports 2 rules: save-button-hidden, tab-control-visible
 *
 * These check platform FormControls (SaveButton, TabControl, etc.)
 * which appear as group members with FieldType "FormControls"
 * and a FormControlType property.
 */

module.exports = [
    {
        id: 'save-button-hidden',
        name: 'SaveButton Must Be Hidden',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'warning',

        check(context) {
            const findings = [];

            // Check if SaveButton appears in any group (meaning it's being controlled)
            const saveButtonInGroup = context.groups.some((g) => g.formControlMembers.includes('SaveButton'));

            if (!saveButtonInGroup) {
                findings.push({
                    ruleId: 'save-button-hidden',
                    severity: 'warning',
                    field: 'SaveButton',
                    page: '—',
                    message: 'SaveButton FormControl is not in any group — it should always be hidden',
                });
            }

            return findings;
        },
    },

    {
        id: 'tab-control-visible',
        name: 'TabControl Must Not Be Hidden',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'warning',

        check(context) {
            const findings = [];

            // Check if TabControl appears in any hidden group
            for (const group of context.groups) {
                if (!group.formControlMembers.includes('TabControl')) continue;

                findings.push({
                    ruleId: 'tab-control-visible',
                    severity: 'warning',
                    field: 'TabControl',
                    page: '—',
                    message: `TabControl is in group "${group.name}" — tab visibility should be controlled via Menu tab, not groups`,
                });
            }

            return findings;
        },
    },
];
