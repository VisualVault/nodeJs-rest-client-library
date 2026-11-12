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

exports.readRunFields = readRunFields;
exports.acknowledgeCompletionTarget = acknowledgeCompletionTarget;
exports.routeCompletionsTo = routeCompletionsTo;
