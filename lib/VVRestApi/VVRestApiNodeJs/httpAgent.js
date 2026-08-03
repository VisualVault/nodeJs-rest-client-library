var http = require('http');
var https = require('https');
var CacheableLookup = require('cacheable-lookup');

// AWS ALB/ELB DNS names resolve to multiple IPs and rotate which ones are
// returned over time. cacheable-lookup resolves every A/AAAA record for a
// host and round-robins across them on each lookup, so a fresh connection
// attempt after a failure is likely to land on a different IP than the one
// that just failed.
var cacheableLookup = new CacheableLookup();

var httpsAgent = new https.Agent({ keepAlive: true, lookup: cacheableLookup.lookup });
var httpAgent = new http.Agent({ keepAlive: true, lookup: cacheableLookup.lookup });

var RETRYABLE_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'EAI_AGAIN'];

function agentForUrl(url) {
    return typeof url === 'string' && url.indexOf('https:') === 0 ? httpsAgent : httpAgent;
}

function isRetryableConnectionError(error) {
    if (!error) {
        return false;
    }
    var code = error.code || (error.cause && error.cause.code);
    return RETRYABLE_CODES.indexOf(code) !== -1;
}

// Wraps a `request`-style call (fn(options, callback)) with retries on
// connection-level failures (the node never responded at all, as opposed to
// an HTTP-level error response). Assigns a keep-alive agent using the
// cacheable-lookup resolver above if the caller hasn't already set one.
function requestWithRetry(requestFn, options, callback, maxRetries) {
    if (!options.agent) {
        options.agent = agentForUrl(options.uri || options.url);
    }

    var retries = typeof maxRetries === 'number' ? maxRetries : 3;
    var attempt = 0;

    function attemptRequest() {
        requestFn(options, function (error, response, body) {
            if (error && isRetryableConnectionError(error) && attempt < retries) {
                attempt++;
                console.log('Connection error (' + error.code + ') calling ' + (options.uri || options.url) + ' - retrying, attempt ' + attempt + ' of ' + retries);
                setTimeout(attemptRequest, 250 * attempt);
            } else {
                callback(error, response, body);
            }
        });
    }

    attemptRequest();
}

module.exports = {
    httpAgent: httpAgent,
    httpsAgent: httpsAgent,
    agentForUrl: agentForUrl,
    isRetryableConnectionError: isRetryableConnectionError,
    requestWithRetry: requestWithRetry
};
