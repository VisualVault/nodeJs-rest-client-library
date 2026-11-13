// A script with no getCredentials. Sent without runContext.secrets, it must never reach main().
function markRan(name) {
    if (process.env.RT_MARKER_DIR) {
        require('fs').writeFileSync(require('path').join(process.env.RT_MARKER_DIR, name), 'ran');
    }
}

module.exports.main = function () {
    markRan('{{MARKER}}');

    // A legacy scheduled main has (vvClient, response, token), an on-demand main
    // (ffCollection, vvClient, response); answer on whichever is the response.
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] && typeof arguments[i].json === 'function') {
            return arguments[i].json(200, { message: 'main ran' });
        }
    }
};
