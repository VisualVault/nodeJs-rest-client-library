/**
 * Upload button configuration rules (atomic)
 *
 * Exports 1 rule: simple-upload
 */

module.exports = [
    {
        id: 'simple-upload',
        name: 'Simple Upload Mode',
        component: 'form-templates',
        appliesTo: ['UploadButton'],
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (field.type !== 'UploadButton') continue;
                const val = String(field.displayUploadedFiles || '').toLowerCase();
                if (val !== 'false') {
                    findings.push({
                        ruleId: 'simple-upload',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `DisplayUploadedFiles is ${val || 'not set'} — should be false (simple upload mode)`,
                    });
                }
            }
            return findings;
        },
    },
];
