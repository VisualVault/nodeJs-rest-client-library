var Q = require('q');

// Methods the visualvault-api 2.x client renamed: old name -> current name, keyed by the manager that holds them.
var RENAMED_METHODS = {
    indexFields: {
        putIndexFields: 'addIndexFieldToFolder'
    }
};

// Methods that visualvault-api 2.x moved from an API object (docApi, objectsApi) down onto one of
// its sub-managers, keyed by API then sub-manager. A disabled API is null or carries no
// sub-managers, and so gets no aliases.
var MOVED_METHODS = {
    docApi: {
        documents: ['GetRevision', 'getDocumentOcrStatus', 'updateDocumentOcrStatus', 'search']
    },
    objectsApi: {
        models: ['getModels', 'getModelById'],
        objects: ['getObject', 'getObjectsByModelId', 'createObject', 'updateObject', 'deleteObject']
    }
};

function isThenable(value) {
    return value !== null && typeof value === 'object' && typeof value.then === 'function';
}

function methodNamesOf(target) {
    var names = [];
    var level = target;

    while (level && level !== Object.prototype) {
        Object.getOwnPropertyNames(level).forEach(function (name) {
            if (name === 'constructor' || name.indexOf('_') === 0 || names.indexOf(name) > -1) {
                return;
            }

            var descriptor = Object.getOwnPropertyDescriptor(level, name);

            if (descriptor && typeof descriptor.value === 'function') {
                names.push(name);
            }
        });

        level = Object.getPrototypeOf(level);
    }

    return names;
}

function installAlias(target, name, source, sourceName) {
    target[name] = function () {
        return source[sourceName].apply(source, arguments);
    };
}

function wrapMethodsInQ(manager) {
    methodNamesOf(manager).forEach(function (name) {
        var method = manager[name];

        manager[name] = function () {
            var result = method.apply(this, arguments);

            return isThenable(result) ? Q(result) : result;
        };
    });
}

function managersOf(client) {
    var managers = [];

    Object.keys(client).forEach(function (name) {
        if (name.indexOf('_') === 0 || name === 'yamlConfig') {
            return;
        }

        var manager = client[name];

        if (manager === null || typeof manager !== 'object') {
            return;
        }

        managers.push(manager);

        // docApi, formsApi, objectsApi, studioApi and notificationsApi hold their methods
        // one level further down, on sub-managers such as docApi.documents.
        Object.keys(manager).forEach(function (childName) {
            if (childName.indexOf('_') === 0) {
                return;
            }

            var child = manager[childName];

            if (child !== null && typeof child === 'object') {
                managers.push(child);
            }
        });
    });

    return managers;
}

function addRenamedAliases(client) {
    Object.keys(RENAMED_METHODS).forEach(function (managerName) {
        var manager = client[managerName];

        if (!manager) {
            return;
        }

        var aliases = RENAMED_METHODS[managerName];

        Object.keys(aliases).forEach(function (oldName) {
            installAlias(manager, oldName, manager, aliases[oldName]);
        });
    });
}

function copyReturnFieldOntoManager(client) {
    var forms = client.forms;

    if (!forms || typeof forms.returnField !== 'function') {
        return;
    }

    var returnField = forms.returnField;

    forms.returnField = function (id, name, value, isError, errorMessage) {
        var field = returnField.apply(this, arguments);

        this.id = id;
        this.name = name;
        this.value = value;
        this.isError = isError;
        this.errorMessage = errorMessage;

        return field;
    };
}

function addMovedAliases(client) {
    Object.keys(MOVED_METHODS).forEach(function (apiName) {
        var api = client[apiName];

        if (!api) {
            return;
        }

        var subManagers = MOVED_METHODS[apiName];

        Object.keys(subManagers).forEach(function (subManagerName) {
            var subManager = api[subManagerName];

            if (!subManager) {
                return;
            }

            subManagers[subManagerName].forEach(function (methodName) {
                installAlias(api, methodName, subManager, methodName);
            });
        });
    });
}

/**
 * Restores the behavior of the 1.2.0 client that older scripts rely on.
 *
 * Call it on an authenticated client before handing the client to a script. It aliases the names and
 * locations that 2.x renamed or moved, and makes every manager method return a Q promise, so `.fail()`,
 * `.fin()` and `.progress()` work; the returned promise is no longer `instanceof Promise`. A script that
 * exports `clientCompatibility = 'v2'` gets the client with no shims applied. Any other value, including
 * none, applies them.
 * @param {object} client - An authenticated `VVClient`.
 * @param {object} [script] - The loaded script module, read for its `clientCompatibility` export.
 * @param {string} [scriptName] - Identifies the script in the log line that records v1 mode.
 * @returns {object} The same client, shimmed in place unless the script declared `v2`.
 */
function applyV1Shims(client, script, scriptName) {
    var declared = script && script.clientCompatibility;

    if (declared === 'v2') {
        return client;
    }

    managersOf(client).forEach(wrapMethodsInQ);
    addRenamedAliases(client);
    addMovedAliases(client);
    copyReturnFieldOntoManager(client);

    if (scriptName) {
        // Required lazily: loading the logger opens its file transports, which a unit test must not do.
        var logger = require('../log');

        if (declared && declared !== 'v1') {
            logger.info('Script ' + scriptName + ' declared an unknown clientCompatibility value; shims applied');
        }

        // Counting these lines is how the team knows when every script has been migrated and the
        // default can move to v2.
        logger.info('Script ' + scriptName + ' ran with v1 client compatibility shims');
    }

    return client;
}

/**
 * Adds the v1 `authorize` alias to the `visualvault-api` package export.
 *
 * Call it once at load. The package names the class `Authorize` on its root export and `authorize`
 * only on its default export; v1 scripts that require the package directly expect the lowercase name.
 * @returns {object} The package export.
 */
function applyModuleShims() {
    var clientLibrary = require('visualvault-api');

    if (typeof clientLibrary.authorize !== 'function') {
        Object.defineProperty(clientLibrary, 'authorize', {
            value: clientLibrary.Authorize,
            writable: true,
            configurable: true
        });
    }

    return clientLibrary;
}

exports.applyModuleShims = applyModuleShims;
exports.applyV1Shims = applyV1Shims;
