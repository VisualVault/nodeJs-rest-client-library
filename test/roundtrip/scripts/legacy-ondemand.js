// Legacy (v1 client) on-demand script: getCredentials, Q chains, putIndexFields, returnField.
// {{PLACEHOLDERS}} are filled in by the round-trip runner.
function markRan(name) {
    if (process.env.RT_MARKER_DIR) {
        require('fs').writeFileSync(require('path').join(process.env.RT_MARKER_DIR, name), 'ran');
    }
}

function status(resp) {
    var parsed = typeof resp === 'string' ? JSON.parse(resp) : resp;

    return parsed && parsed.meta ? parsed.meta.status : null;
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

module.exports.main = function (ffCollection, vvClient, response) {
    markRan('{{MARKER}}');

    var steps = [];
    var nameField = ffCollection.getFormFieldByName('Name');

    steps.push({ step: 'field', value: nameField ? nameField.value : null });

    // v1 returnField returns nothing; it sets id and name on the forms manager.
    vvClient.forms.returnField('f1', 'Field One', 'v1', false, '');

    steps.push({ step: 'returnField', managerId: vvClient.forms.id, managerName: vvClient.forms.name });

    vvClient.users.getUser({ q: "[userid] eq 'nobody'" })
        .then(function (resp) {
            steps.push({ step: 'getUser', status: status(resp) });

            return vvClient.indexFields.putIndexFields('index-field-1', 'folder-1');
        })
        .then(function (resp) {
            steps.push({ step: 'putIndexFields', status: status(resp) });
        })
        .fail(function (err) {
            steps.push({ step: 'fail', error: String(err) });
        })
        .fin(function () {
            response.json(200, [{ name: 'steps', value: steps }]);
        })
        .done();
};
