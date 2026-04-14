/**
 * Rule registry for form template review.
 * Each module exports an array of atomic rules. This index flattens them.
 */

const ruleGroups = [
    require('./field-naming'), // 5 rules
    require('./accessibility'), // 1 rule
    require('./tab-order'), // 2 rules
    require('./calendar-config'), // 3 rules
    require('./script-hygiene'), // 5 rules
    require('./orphan-refs'), // 2 rules
];

module.exports = ruleGroups.flat();
