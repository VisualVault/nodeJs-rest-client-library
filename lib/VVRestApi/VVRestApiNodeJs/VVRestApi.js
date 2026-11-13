// Compatibility module for legacy scripts. The server once embedded its v1 client here, and scripts
// load it by relative path from the files/ folder: `var vvEntities = require("../VVRestApi");`.
// The client now comes from the visualvault-api package; this keeps that path working. The package's
// default export has the keys the v1 module exported (vvClient, authorize, forms).
// Without this file the require throws, and the script never runs.
module.exports = require('./compat/v1Shims').applyModuleShims().default;
