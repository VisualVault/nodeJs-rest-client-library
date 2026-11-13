// Completion targets this server accepts. Any other value is ignored: the run then keeps the
// completion route its client authenticated with, and no acknowledgment header is set.
var KNOWN_COMPLETION_TARGETS = ['studioapi'];

function knownCompletionTarget(value) {
    if (!value) {
        return null;
    }

    if (KNOWN_COMPLETION_TARGETS.indexOf(value) > -1) {
        return value;
    }

    // Required lazily: loading the logger opens its file transports, which a unit test must not do.
    require('../log').info('Ignoring unknown completionTarget "' + value + '"');

    return null;
}

function parseRunContext(value) {
    if (typeof value !== 'string') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (ex) {
        // Logs no detail: the parse error repeats the runContext text, which carries an API key.
        require('../log').error('Ignoring a runContext that is not readable JSON');

        return null;
    }
}

/**
 * Reads the completion target and run context out of a script-run request body.
 * @param {object|Array} body - The request body, either an array of Key/Value pairs or an object.
 * @returns {{completionTarget: string|null, runContext: object|null}} completionTarget is null when
 *   the body names none or names one this server does not accept; runContext is null when the body
 *   carries none or carries JSON that will not parse.
 */
function readRunFields(body) {
    var completionTarget = null;
    var runContext = null;

    if (body instanceof Array) {
        for (var x = 0; x < body.length; x++) {
            if (body[x].Key === 'completionTarget') {
                completionTarget = body[x].Value;
            } else if (body[x].Key === 'runContext') {
                runContext = parseRunContext(body[x].Value);
            }
        }
    } else if (body) {
        completionTarget = body.completionTarget;
        runContext = parseRunContext(body.runContext);
    }

    return {
        completionTarget: knownCompletionTarget(completionTarget),
        runContext: runContext || null
    };
}

// The error a run gets when neither the script nor the request carries an identity to log in with.
var IDENTITY_MISSING = 'identity-missing';

// The identities a run can log in as, as reported in the `vv-identity-source` response header.
var SCRIPT_CREDENTIALS = 'script-credentials';
var RUN_AS_USER = 'run-as-user';

/**
 * Decides which identity a run logs in as.
 *
 * The script's own `getCredentials` wins; a run context's `secrets` are used only when the script
 * exports none. `params` holds a live API secret, so a caller must not log or echo it.
 * @param {object} script - The loaded script module.
 * @param {object|null} runContext - The run context from `readRunFields`.
 * @returns {{source: string|null, params: object|null}} source is `'script-credentials'`,
 *   `'run-as-user'`, or null when the run carries neither identity; params is null with a null
 *   source.
 */
function resolveIdentity(script, runContext) {
    if (script && typeof script.getCredentials === 'function') {
        return { source: SCRIPT_CREDENTIALS, params: script.getCredentials() };
    }

    var secrets = runContext && runContext.secrets;

    // The login needs both fields, so secrets that carry only one are not an identity: the run
    // would answer `run-as-user` and then fail to authenticate.
    if (secrets && secrets.clientId && secrets.clientSecret) {
        // The key doubles as the username and password: the client refreshes with the password it
        // holds, so a run keeps working past the 20-minute access token.
        return {
            source: RUN_AS_USER,
            params: {
                clientId: secrets.clientId,
                clientSecret: secrets.clientSecret,
                userId: secrets.clientId,
                password: secrets.clientSecret,
                audience: secrets.audience || null,
                customerAlias: secrets.customerAlias,
                databaseAlias: secrets.databaseAlias
            }
        };
    }

    return { source: null, params: null };
}

/**
 * Sets the `vv-completion-target` response header to the target this server accepted.
 *
 * Call it before the script can respond: a header cannot be set once the response has been sent.
 * @param {object} res - The response for the script run.
 * @param {string|null} target - A completion target from `readRunFields`. Null sets no header.
 * @returns {void}
 */
function acknowledgeCompletionTarget(res, target) {
    if (target) {
        res.setHeader('vv-completion-target', target);
    }
}

/**
 * Sets the `vv-identity-source` response header to the identity the run logged in with.
 *
 * Call it before `main()`: a header cannot be set once the script has answered the request.
 * @param {object} res - The response for the script run.
 * @param {string|null} source - A source from `resolveIdentity`. Null sets no header.
 * @returns {void}
 */
function acknowledgeIdentitySource(res, source) {
    if (source) {
        res.setHeader('vv-identity-source', source);
    }
}

/**
 * Answers a run that carries no identity, leaving the script uncalled.
 *
 * Sends HTTP 200 with the 400 in the body: the error travels in `meta`, not in the status.
 * @param {object} res - The response for the script run.
 * @param {object} meta - The route's response envelope; this call fills in its error fields.
 * @param {string} [logPrefix] - Prefixes the log line to identify the run. Omitted sets no prefix.
 * @returns {void}
 */
function rejectMissingIdentity(res, meta, logPrefix) {
    meta.code = 400;
    meta.error = IDENTITY_MISSING;

    // Required lazily: loading the logger opens its file transports, which a unit test must not do.
    require('../log').error((logPrefix ? logPrefix + ' ' : '') + IDENTITY_MISSING + '. http 400 response returned.');

    res.json(200, meta);
}

/**
 * Loads a script module, or answers the run with a 500 when the script cannot load.
 *
 * A script that throws while it loads (a syntax error, a top-level throw, a `require` of a module that
 * is not there) must fail only its own run. The routes load scripts inside callbacks, where an uncaught
 * throw ends the whole server process and every other script it is running.
 * @param {string} modulePath - The path to `require`.
 * @param {object} res - The response for the script run.
 * @param {object} meta - The route's response envelope; a failed load fills in its error fields.
 * @param {string} [logPrefix] - Prefixes the log line to identify the run. Omitted sets no prefix.
 * @returns {object|null} The loaded module, or null after the run has been answered.
 */
function loadScript(modulePath, res, meta, logPrefix) {
    try {
        return require(modulePath);
    } catch (ex) {
        meta.code = 500;
        meta.error = 'Unable to load script: ' + ex.message;

        // Required lazily: loading the logger opens its file transports, which a unit test must not do.
        require('../log').error((logPrefix ? logPrefix + ' ' : '') + 'Unable to load script ' + modulePath + '. http 500 response returned. ' + ex.message);

        res.json(200, meta);

        return null;
    }
}

/**
 * Points an authenticated client at the completion target the request named.
 *
 * Call it before handing the client to a script. A null target leaves the client's completion
 * route unchanged.
 * @param {object} client - An authenticated `VVClient`.
 * @param {string|null} target - A completion target from `readRunFields`.
 * @returns {void}
 */
function routeCompletionsTo(client, target) {
    if (target) {
        client.setCompletionTarget(target);
    }
}

exports.IDENTITY_MISSING = IDENTITY_MISSING;
exports.loadScript = loadScript;
exports.rejectMissingIdentity = rejectMissingIdentity;
exports.readRunFields = readRunFields;
exports.resolveIdentity = resolveIdentity;
exports.acknowledgeCompletionTarget = acknowledgeCompletionTarget;
exports.acknowledgeIdentitySource = acknowledgeIdentitySource;
exports.routeCompletionsTo = routeCompletionsTo;
