// Stands in for the `visualvault-api` package in the route tests. The routes log in before they
// call a script, and a test must not reach the network to see which identity they logged in with.
// `installedInto` replaces the package in the module cache; the login it records is what the test
// asserts on.
var logins = [];

function Authorize() { }

Authorize.prototype.getVaultApi = function (clientId, clientSecret, userId, password, audience, baseUrl, customerAlias, databaseAlias) {
    logins.push({
        clientId: clientId,
        clientSecret: clientSecret,
        userId: userId,
        password: password,
        audience: audience,
        baseUrl: baseUrl,
        customerAlias: customerAlias,
        databaseAlias: databaseAlias
    });

    return Promise.resolve({ setCompletionTarget: function () { } });
};

function FormFieldCollection(fields) {
    this.fields = fields;
}

var packageExport = {
    Authorize: Authorize,
    default: {
        authorize: Authorize,
        forms: { formFieldCollection: FormFieldCollection }
    }
};

/**
 * Puts this stub in the module cache under the real package's path.
 *
 * Call it before the routes are required: they resolve the client once, at load.
 * @param {object} moduleCache - `require.cache`.
 * @param {string} resolvedPath - What `require.resolve('visualvault-api')` returns.
 * @returns {void}
 */
function installedInto(moduleCache, resolvedPath) {
    moduleCache[resolvedPath] = {
        id: resolvedPath,
        filename: resolvedPath,
        loaded: true,
        exports: packageExport
    };
}

exports.installedInto = installedInto;
exports.logins = logins;
