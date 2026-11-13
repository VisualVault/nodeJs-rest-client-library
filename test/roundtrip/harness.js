// Helpers for the round-trip tests: start the fake VV API and a Node script server as child
// processes, render the test scripts, and send requests shaped the way VVCore and the Worker send them.
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var repoRoot = path.join(__dirname, '..', '..');

/**
 * Starts a Node process and resolves once its output contains `readyText`.
 * @param {string} name - Label for errors.
 * @param {string} entry - The script to run.
 * @param {object} options - `env`, `cwd`, `readyText`.
 * @returns {Promise<{child: object, output: function(): string, stop: function(): Promise<void>}>}
 */
function startProcess(name, entry, options) {
    var output = '';
    var child = childProcess.spawn(process.execPath, [entry], {
        cwd: options.cwd,
        env: Object.assign({}, process.env, options.env),
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', function (chunk) { output += chunk; });
    child.stderr.on('data', function (chunk) { output += chunk; });

    var handle = {
        child: child,
        output: function () { return output; },
        stop: function () {
            return new Promise(function (resolve) {
                if (child.exitCode !== null) {
                    return resolve();
                }

                child.once('exit', function () { resolve(); });
                child.kill();
            });
        }
    };

    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
            child.kill();
            reject(new Error(name + ' did not start. Output:\n' + output));
        }, 15000);

        child.stdout.on('data', function () {
            if (output.indexOf(options.readyText) > -1) {
                clearTimeout(timer);
                resolve(handle);
            }
        });

        child.once('exit', function (code) {
            clearTimeout(timer);
            reject(new Error(name + ' exited with ' + code + '. Output:\n' + output));
        });
    });
}

function startFakeVv(port) {
    return startProcess('fake VV API', path.join(__dirname, 'fake-vv.js'), {
        cwd: repoRoot,
        env: { FAKE_VV_PORT: String(port) },
        readyText: 'fake VV API listening'
    });
}

/**
 * Starts a Node script server. The log file lands in `logDir`, so the test can read it.
 * @param {string} appJs - Path to the server's app.js (this branch, or a master worktree).
 * @param {number} port
 * @param {string} logDir
 * @param {string} markerDir - Where test scripts write a file when main() runs.
 */
function startServer(appJs, port, logDir, markerDir) {
    // The routes write each posted script to files/ next to app.js and fail the run when it is missing.
    fs.mkdirSync(path.join(path.dirname(appJs), 'files'), { recursive: true });

    return startProcess('Node script server', appJs, {
        cwd: logDir,
        env: { PORT: String(port), RT_MARKER_DIR: markerDir },
        readyText: 'Express server listening on port'
    });
}

function makeTempDir(prefix) {
    return fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), prefix));
}

function readLogFiles(dir) {
    return fs.readdirSync(dir)
        .filter(function (name) { return /\.log$/.test(name); })
        .map(function (name) { return fs.readFileSync(path.join(dir, name), 'utf8'); })
        .join('\n');
}

/**
 * Reads a test script and fills in its {{PLACEHOLDERS}}.
 * @param {string} name - File name under scripts/, without .js.
 * @param {object} values - Placeholder values. A missing one is left in place and fails loudly.
 */
function renderScript(name, values) {
    var text = fs.readFileSync(path.join(__dirname, 'scripts', name + '.js'), 'utf8');

    return text.replace(/\{\{([A-Z_]+)\}\}/g, function (match, key) {
        return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match;
    });
}

/**
 * The getCredentials export a v2 script gets when the runner wants it to carry Script credentials.
 */
function getCredentialsExport(creds) {
    return 'module.exports.getCredentials = function () { return ' + JSON.stringify({
        customerAlias: creds.customerAlias,
        databaseAlias: creds.databaseAlias,
        userId: creds.userId,
        password: creds.password,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret
    }) + '; };';
}

async function readResponse(response) {
    var text = await response.text();
    var body;

    try {
        body = JSON.parse(text);
    } catch (ex) {
        body = text;
    }

    return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: body
    };
}

/**
 * POST /scheduledscripts as multipart form data, the way VVCore's OutsideProcessNodeServer sends it.
 * @param {string} nodeUrl
 * @param {string} id - The script id (VVCore sends the OpID without dashes; the Worker the Run id).
 * @param {object} fields - script, baseUrl, token, and optionally completionTarget and runContext.
 */
async function postScheduledMultipart(nodeUrl, id, fields) {
    var form = new FormData();

    Object.keys(fields).forEach(function (key) {
        var value = fields[key];

        form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    });

    return readResponse(await fetch(nodeUrl + '/scheduledscripts?id=' + encodeURIComponent(id), { method: 'POST', body: form }));
}

function toKeyValueArray(fields) {
    return Object.keys(fields).map(function (key) {
        var value = fields[key];

        return { Key: key, Value: typeof value === 'string' ? value : JSON.stringify(value) };
    });
}

/**
 * POST a route with a JSON body of Key/Value pairs, the way VVCore's ScriptsController sends /scripts.
 */
async function postKeyValueJson(nodeUrl, route, id, fields) {
    return readResponse(await fetch(nodeUrl + '/' + route + '?id=' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toKeyValueArray(fields))
    }));
}

/**
 * POST a route with a plain JSON object body (the object branch).
 */
async function postObjectJson(nodeUrl, route, id, fields) {
    var body = {};

    Object.keys(fields).forEach(function (key) {
        var value = fields[key];

        body[key] = typeof value === 'string' ? value : JSON.stringify(value);
    });

    return readResponse(await fetch(nodeUrl + '/' + route + '?id=' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }));
}

function fakeClient(fakeUrl) {
    return {
        calls: async function () {
            return (await fetch(fakeUrl + '/__calls')).json();
        },
        reset: async function () {
            await fetch(fakeUrl + '/__reset', { method: 'POST' });
        },
        configure: async function (settings) {
            await fetch(fakeUrl + '/__config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
        },
        /**
         * Polls the recorded calls until `predicate` finds one, or times out.
         */
        waitFor: async function (predicate, timeoutMs) {
            var deadline = Date.now() + (timeoutMs || 10000);

            while (Date.now() < deadline) {
                var calls = await this.calls();
                var found = calls.filter(predicate);

                if (found.length > 0) {
                    return found;
                }

                await new Promise(function (resolve) { setTimeout(resolve, 200); });
            }

            throw new Error('Timed out waiting for a call. Recorded: ' + JSON.stringify(await this.calls(), null, 1));
        }
    };
}

module.exports = {
    repoRoot: repoRoot,
    startFakeVv: startFakeVv,
    startServer: startServer,
    makeTempDir: makeTempDir,
    readLogFiles: readLogFiles,
    renderScript: renderScript,
    getCredentialsExport: getCredentialsExport,
    postScheduledMultipart: postScheduledMultipart,
    postKeyValueJson: postKeyValueJson,
    postObjectJson: postObjectJson,
    fakeClient: fakeClient
};
