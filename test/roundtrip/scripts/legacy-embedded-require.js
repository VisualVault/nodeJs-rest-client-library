// Legacy scheduled script that loads the server's former embedded v1 client by relative path, as
// VVCore's TestCommunication script and the repo's NodeJSTestCommunicationScheduledProcess.js do.
var vvEntities = require("../VVRestApi");

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

    response.json(200, {
        message: 'embedded require loaded',
        authorize: typeof vvEntities.authorize,
        vvClient: typeof vvEntities.vvClient,
        formFieldCollection: typeof vvEntities.forms.formFieldCollection
    });

    vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'embedded require done')
        .fail(function (err) {
            console.log('embedded require completion failed: ' + err);
        });
};
