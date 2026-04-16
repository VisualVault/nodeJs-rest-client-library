/**
 * Rule registry for standards review.
 * Each module exports an array of atomic rules. This index flattens them
 * and provides query helpers for filtering by component and field type.
 */

const ruleGroups = [
    require('./field-naming'), // 5 rules
    require('./accessibility'), // 2 rules
    require('./tab-order'), // 2 rules
    require('./calendar-config'), // 3 rules
    require('./script-hygiene'), // 6 rules
    require('./orphan-refs'), // 2 rules
    require('./group-checks'), // 5 rules
    require('./container-config'), // 1 rule
    require('./default-text'), // 1 rule
    require('./upload-config'), // 1 rule
    require('./layout'), // 3 rules
    require('./accessibility-match'), // 1 rule
    require('./spelling'), // 1 rule
    require('./naming-conventions'), // 1 rule
    require('./field-config'), // 2 rules
    require('./admin-override'), // 2 rules
    require('./form-controls'), // 2 rules
];

const allRules = ruleGroups.flat();

/** Get rules that belong to a given component type (e.g., 'form-templates') */
function rulesForComponent(component) {
    return allRules.filter((r) => r.component === component);
}

/** Get rules that apply to a given field type (excludes template-level rules) */
function rulesForFieldType(fieldType) {
    return allRules.filter((r) => {
        if (!r.appliesTo || r.appliesTo === '*') return true;
        if (r.appliesTo === 'template') return false;
        return Array.isArray(r.appliesTo) && r.appliesTo.includes(fieldType);
    });
}

/** Build a matrix of field types → rule IDs (for documentation/queries) */
function fieldTypeMatrix() {
    const matrix = {};
    for (const rule of allRules) {
        if (!rule.appliesTo || rule.appliesTo === 'template') continue;
        if (rule.appliesTo === '*') continue;
        if (!Array.isArray(rule.appliesTo)) continue;
        for (const ft of rule.appliesTo) {
            if (!matrix[ft]) matrix[ft] = [];
            matrix[ft].push(rule.id);
        }
    }
    return matrix;
}

// Default export: flat array (backward compat with require('./rules'))
module.exports = allRules;
module.exports.rules = allRules;
module.exports.rulesForComponent = rulesForComponent;
module.exports.rulesForFieldType = rulesForFieldType;
module.exports.fieldTypeMatrix = fieldTypeMatrix;
