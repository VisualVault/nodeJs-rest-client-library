// Entry point for the route tests. The route modules read require.main.filename at load, so they
// need a real entry point; vitest does not give them one. Takes a route name and a JSON request as
// command-line arguments and writes what the handler did to a line beginning "RESULT:".
var path = require('path');
var routes = path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'routes');

var handlers = {
    scripts: require(path.join(routes, 'scripts')).scripts,
    scheduledscripts: require(path.join(routes, 'scheduledscripts')).processRequest
};

var request = JSON.parse(process.argv[3]);
var recorded = { headers: {}, responses: [], error: null };

var res = {
    setHeader: function (name, value) {
        if (recorded.responses.length > 0) {
            throw new Error('ERR_HTTP_HEADERS_SENT: cannot set ' + name + ' after the response was sent');
        }

        recorded.headers[name] = value;
    },
    json: function (status, body) {
        recorded.responses.push({ status: status, body: body });
    },
    end: function () { }
};

process.on('exit', function () {
    process.stdout.write('\nRESULT:' + JSON.stringify(recorded) + '\n');
});

try {
    handlers[process.argv[2]]({ body: request.body, query: request.query || {} }, res);
} catch (ex) {
    // Some validation paths in the routes throw on an undefined variable. Recording the error
    // instead of rethrowing lets a test still see the headers the route set before it threw.
    recorded.error = String(ex);
}
