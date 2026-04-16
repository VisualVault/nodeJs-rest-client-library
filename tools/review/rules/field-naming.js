/**
 * Field naming rules (atomic)
 *
 * Exports 5 independent rules:
 *   title-case, default-name, duplicate-name, empty-name, valid-identifier
 */

// --- Shared constants ---

const LOWERCASE_EXCEPTIONS = ['of', 'to', 'a', 'and', 'the', 'in', 'on', 'for', 'at', 'by', 'or'];
const ACRONYM_EXCEPTIONS = ['ID', 'SSN', 'EIN', 'DOB', 'POA', 'POC', 'POI', 'POE', 'CSV', 'MPI', 'DBA', 'DP'];
const TITLE_CASE_EXCEPTIONS = [...ACRONYM_EXCEPTIONS, ...LOWERCASE_EXCEPTIONS];

const DEFAULT_NAME_PATTERNS = {
    FieldTextbox3: /^DataField\d+$/,
    FieldTextArea3: /^DataField\d+$/,
    FieldCalendar3: /^DataField\d+$/,
    FieldDropDownList3: /^DataField\d+$/,
    FieldCheckbox: /^DataField\d+$/,
    UploadButton: /^UploadButton\d+$/,
    ImageFormControl: /^Image\d+$/,
    RepeatingRowControl: /^RepeatingRowControl\d+$/,
    FieldDataGrid: /^DataGrid\d+$/,
    FormIDStamp: /^FormIDStamp\d*$/,
    CellField: /^DataField\d+$/,
};

const TITLE_CASE_FIELD_TYPES = [
    'FieldTextbox3',
    'FieldTextArea3',
    'FieldCalendar3',
    'FieldDropDownList3',
    'FieldCheckbox',
    'CellField',
    'UserIDStamp',
];

// --- Shared helpers ---

function isExceptionWord(word) {
    return TITLE_CASE_EXCEPTIONS.some((exc) => exc.toLowerCase() === word.toLowerCase());
}

function isTitleCase(name) {
    const words = name.split(/\s+/).filter(Boolean);
    for (const word of words) {
        if (isExceptionWord(word)) continue;
        const firstUpper = word[0] === word[0].toUpperCase();
        const restLower = word.slice(1) === word.slice(1).toLowerCase();
        if (!firstUpper || !restLower) return false;
    }
    return true;
}

function isValidIdentifier(name) {
    const nameNoSpaces = name.replace(/ /g, '_');
    try {
        return /^[\p{ID_Start}][\p{ID_Continue}\u200C\u200D]*$/u.test(nameNoSpaces);
    } catch {
        return true;
    }
}

// --- Atomic rules ---

module.exports = [
    {
        id: 'title-case',
        name: 'Title Case Field Names',
        component: 'form-templates',
        appliesTo: TITLE_CASE_FIELD_TYPES,
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (!field.name || !field.name.trim()) continue;
                if (!TITLE_CASE_FIELD_TYPES.includes(field.type)) continue;
                // Skip default names — they have their own rule
                const pattern = DEFAULT_NAME_PATTERNS[field.type];
                if (pattern && pattern.test(field.name)) continue;

                if (!isTitleCase(field.name)) {
                    findings.push({
                        ruleId: 'title-case',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Field name "${field.name}" is not in Title Case`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'default-name',
        name: 'Default Field Names',
        component: 'form-templates',
        appliesTo: Object.keys(DEFAULT_NAME_PATTERNS),
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                const pattern = DEFAULT_NAME_PATTERNS[field.type];
                if (pattern && pattern.test(field.name)) {
                    findings.push({
                        ruleId: 'default-name',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Default field name "${field.name}" — use a descriptive name`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'duplicate-name',
        name: 'Duplicate Field Names',
        component: 'form-templates',
        appliesTo: '*',
        severity: 'error',

        check(context) {
            const findings = [];
            const nameCount = new Map();

            for (const field of context.fields) {
                if (!field.name || !field.name.trim()) continue;
                const lower = field.name.toLowerCase();
                nameCount.set(lower, (nameCount.get(lower) || 0) + 1);
            }

            const reported = new Set();
            for (const field of context.fields) {
                if (!field.name || !field.name.trim()) continue;
                const lower = field.name.toLowerCase();
                if (nameCount.get(lower) > 1 && !reported.has(lower)) {
                    reported.add(lower);
                    findings.push({
                        ruleId: 'duplicate-name',
                        severity: 'error',
                        field: field.name,
                        page: field.pageName,
                        message: `Duplicate field name "${field.name}" (${nameCount.get(lower)} occurrences)`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'empty-name',
        name: 'Empty Field Names',
        component: 'form-templates',
        appliesTo: '*',
        severity: 'error',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (!field.name || !field.name.trim()) {
                    findings.push({
                        ruleId: 'empty-name',
                        severity: 'error',
                        field: `(${field.type})`,
                        page: field.pageName,
                        message: 'Field has an empty name',
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'valid-identifier',
        name: 'Valid Identifier Characters',
        component: 'form-templates',
        appliesTo: '*',
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (!field.name || !field.name.trim()) continue;
                if (!isValidIdentifier(field.name)) {
                    findings.push({
                        ruleId: 'valid-identifier',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Field name "${field.name}" contains invalid identifier characters`,
                    });
                }
            }
            return findings;
        },
    },
];
