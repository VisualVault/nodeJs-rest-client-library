/**
 * Admin Override rules (atomic)
 *
 * Exports 2 rules: admin-override-container, admin-override-security
 */

module.exports = [
    {
        id: 'admin-override-container',
        name: 'Template Must Have Admin Override Container',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'warning',

        check(context) {
            const findings = [];

            // Look for a container with "admin" and "override" in name
            const adminContainer = context.fields.find(
                (f) => f.type === 'FieldContainer' && /admin/i.test(f.name) && /override/i.test(f.name)
            );

            if (!adminContainer) {
                // Also check for common variants
                const altContainer = context.fields.find(
                    (f) => f.type === 'FieldContainer' && /admin\s*section/i.test(f.name)
                );

                if (!altContainer) {
                    findings.push({
                        ruleId: 'admin-override-container',
                        severity: 'warning',
                        field: '—',
                        page: '—',
                        message: 'Template does not have an Admin Override container',
                    });
                    return findings;
                }
            }

            const containerId = (
                adminContainer || context.fields.find((f) => f.type === 'FieldContainer' && /admin/i.test(f.name))
            )?.id;

            if (!containerId) return findings;

            // Check container has an "Admin Override" checkbox
            const hasCheckbox = context.fields.some(
                (f) => f.type === 'FieldCheckbox' && f.containerId === containerId && /admin\s*override/i.test(f.name)
            );

            if (!hasCheckbox) {
                findings.push({
                    ruleId: 'admin-override-container',
                    severity: 'warning',
                    field: adminContainer?.name || '(admin container)',
                    page: adminContainer?.pageName || '—',
                    message: 'Admin container missing "Admin Override" checkbox',
                });
            }

            // Check container has a button (Admin Save)
            const hasButton = context.fields.some((f) => f.type === 'FormButton' && f.containerId === containerId);

            if (!hasButton) {
                findings.push({
                    ruleId: 'admin-override-container',
                    severity: 'warning',
                    field: adminContainer?.name || '(admin container)',
                    page: adminContainer?.pageName || '—',
                    message: 'Admin container missing Admin Save button',
                });
            }

            return findings;
        },
    },

    {
        id: 'admin-override-security',
        name: 'Admin Override Container Must Have Security Visibility',
        component: 'form-templates',
        appliesTo: 'template',
        severity: 'warning',

        check(context) {
            const findings = [];

            // Find the admin override container
            const adminContainer = context.fields.find(
                (f) =>
                    f.type === 'FieldContainer' && (/admin\s*override/i.test(f.name) || /admin\s*section/i.test(f.name))
            );

            if (!adminContainer) return findings; // No container → handled by admin-override-container

            // Check if the container is in a group with security members
            const containerInGroup = context.groups.find((g) =>
                g.fieldMembers.some((m) => m.fieldId === adminContainer.id)
            );

            if (!containerInGroup) {
                findings.push({
                    ruleId: 'admin-override-security',
                    severity: 'warning',
                    field: adminContainer.name,
                    page: adminContainer.pageName,
                    message: 'Admin Override container is not in any group — must have VaultAccess-only visibility',
                });
                return findings;
            }

            // Check the group has SecurityMemberCollection (visibility restricted by security group)
            if (!containerInGroup.securityMembers) {
                findings.push({
                    ruleId: 'admin-override-security',
                    severity: 'warning',
                    field: adminContainer.name,
                    page: adminContainer.pageName,
                    message: `Group "${containerInGroup.name}" has no security visibility — Admin Override must be restricted to VaultAccess users`,
                });
            }

            return findings;
        },
    },
];
