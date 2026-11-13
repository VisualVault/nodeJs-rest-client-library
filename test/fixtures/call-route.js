// Entry point for the route tests. The route modules read require.main.filename at load, so they
// need a real entry point; vitest does not give them one. Takes a route name and a JSON request as
// command-line arguments and writes what the handler did to a line beginning "RESULT:".
var fs = require('fs');
var os = require('os');
var path = require('path');
var stubClient = require('./stub-client');
var routes = path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'routes');
var request = JSON.parse(process.argv[3]);

// The routes write the posted script next to this entry point before they load it.
var scriptFiles = path.join(__dirname, 'files');

fs.mkdirSync(scriptFiles, { recursive: true });

// Scripts the server already holds, for the branches that run one by name rather than by posted
// text: { "<name>": "<script text>" }.
var writtenScripts = Object.keys(request.localScripts || {});

writtenScripts.forEach(function (name) {
    fs.writeFileSync(path.join(scriptFiles, name + '.js'), request.localScripts[name]);
});

// The route writes the posted script under the request's id; this run cleans that up too.
if (typeof request.query === 'object' && request.query !== null && typeof request.query.id === 'string') {
    writtenScripts.push(request.query.id);
}

stubClient.installedInto(require.cache, require.resolve('visualvault-api'));

// winston's file transport names its file relative to the working directory, so each run gets a
// directory of its own and the log file lands where the exit handler can read it back.
var repoRoot = process.cwd();
var logHome = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-route-log-'));

process.chdir(logHome);

var handlers = {
    scripts: require(path.join(routes, 'scripts')).scripts,
    scheduledscripts: require(path.join(routes, 'scheduledscripts')).processRequest
};

var recorded = { headers: {}, responses: [], error: null, logins: stubClient.logins };

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
    recorded.logFile = fs.readdirSync(logHome)
        .map(function (name) { return fs.readFileSync(path.join(logHome, name), 'utf8'); })
        .join('');

    process.chdir(repoRoot);
    fs.rmSync(logHome, { recursive: true, force: true });

    // Removes only this run's own files: the route tests run in parallel and share this directory.
    writtenScripts.forEach(function (name) {
        fs.rmSync(path.join(scriptFiles, name + '.js'), { force: true });
    });

    process.stdout.write('\nRESULT:' + JSON.stringify(recorded) + '\n');
});

try {
    handlers[process.argv[2]]({ body: request.body, query: request.query || {} }, res);
} catch (ex) {
    // Some validation paths in the routes throw on an undefined variable. Recording the error
    // instead of rethrowing lets a test still see the headers the route set before it threw.
    recorded.error = String(ex);
}
