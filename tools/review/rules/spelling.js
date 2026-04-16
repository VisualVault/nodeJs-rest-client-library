/**
 * Spelling rule (atomic)
 *
 * Exports 1 rule: spelling
 *
 * Uses nspell (Hunspell) to check field names for misspellings.
 * Only checks fields that have non-default, title-case names.
 */

const fs = require('fs');
const path = require('path');
const nspell = require('nspell');

// --- Dictionary setup ---

const dictDir = path.resolve(__dirname, '../dictionaries');
const aff = fs.readFileSync(path.join(dictDir, 'en_US.aff'), 'utf-8');
const dic = fs.readFileSync(path.join(dictDir, 'en_US.dic'), 'utf-8');
const spellchecker = nspell({ aff, dic });

// --- Exceptions ---

const ACRONYM_EXCEPTIONS = ['ID', 'SSN', 'EIN', 'DOB', 'POA', 'POC', 'POI', 'POE', 'CSV', 'MPI', 'DBA', 'DP'];
const LOWERCASE_EXCEPTIONS = ['of', 'to', 'a', 'and', 'the', 'in', 'on', 'for', 'at', 'by', 'or'];
const SPELLING_EXCEPTIONS = new Set([...ACRONYM_EXCEPTIONS, ...LOWERCASE_EXCEPTIONS].map((w) => w.toLowerCase()));

// Default name patterns — skip these (they have their own rule)
const DEFAULT_PATTERNS = [
    /^DataField\d+$/,
    /^UploadButton\d+$/,
    /^Image\d+$/,
    /^RepeatingRowControl\d+$/,
    /^DataGrid\d+$/,
    /^FormIDStamp\d*$/,
];

const SPELLING_FIELD_TYPES = [
    'FieldTextbox3',
    'FieldTextArea3',
    'FieldCalendar3',
    'FieldDropDownList3',
    'FieldCheckbox',
    'CellField',
    'FieldDataGrid',
    'FormIDStamp',
    'RepeatingRowControl',
];

function isDefaultName(name) {
    return DEFAULT_PATTERNS.some((p) => p.test(name));
}

module.exports = [
    {
        id: 'spelling',
        name: 'Field Name Spelling',
        component: 'form-templates',
        appliesTo: SPELLING_FIELD_TYPES,
        severity: 'info',

        check(context) {
            const findings = [];

            for (const field of context.fields) {
                if (!SPELLING_FIELD_TYPES.includes(field.type)) continue;
                if (!field.name || !field.name.trim()) continue;
                if (isDefaultName(field.name)) continue;

                const words = field.name.split(/\s+/).filter(Boolean);
                for (const word of words) {
                    if (SPELLING_EXCEPTIONS.has(word.toLowerCase())) continue;
                    if (spellchecker.correct(word)) continue;

                    const suggestions = spellchecker.suggest(word);
                    const suggestMsg = suggestions.length > 0 ? suggestions.slice(0, 3).join(', ') : 'no suggestions';

                    findings.push({
                        ruleId: 'spelling',
                        severity: 'info',
                        field: field.name,
                        page: field.pageName,
                        message: `Possible misspelling: "${word}" (suggestions: ${suggestMsg})`,
                    });
                }
            }

            return findings;
        },
    },
];
