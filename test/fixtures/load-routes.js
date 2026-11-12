// Entry point for the route-loading test. The route modules read
// require.main.filename at load, so they need a real entry point; vitest does
// not give them one.
var path = require('path');
var routes = path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'routes');

var scripts = require(path.join(routes, 'scripts'));
var scheduledScripts = require(path.join(routes, 'scheduledscripts'));
var testScheduledScripts = require(path.join(routes, 'testScheduledScripts'));

process.stdout.write(JSON.stringify({
    testsite: typeof scripts.testsite,
    scripts: typeof scripts.scripts,
    processRequest: typeof scheduledScripts.processRequest,
    testProcessRequest: typeof testScheduledScripts.processRequest
}));
