// Legacy (v1 client) scheduled script: answers early, then calls postCompletion with the token.
function markRan(name) {
    if (process.env.RT_MARKER_DIR) {
        require('fs').writeFileSync(require('path').join(process.env.RT_MARKER_DIR, name), 'ran');
    }
}

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = '{{CUSTOMER_ALIAS}}';
    options.databaseAlias = '{{DATABASE_ALIAS}}';
    options.userId = '{{SCRIPT_USER}}';
    options.password = '{{SCRIPT_PASSWORD}}';
    options.clientId = '{{SCRIPT_CLIENT_ID}}';
    options.clientSecret = '{{SCRIPT_CLIENT_SECRET}}';
    return options;
};

module.exports.main = function (vvClient, response, token) {
    markRan('{{MARKER}}');

    response.json(200, { message: 'legacy scheduled script started' });

    vvClient.sites.getSites({})
        .then(function () {
            return vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'legacy scheduled done');
        })
        .fail(function (err) {
            console.log('legacy scheduled completion failed: ' + err);
        });
};
