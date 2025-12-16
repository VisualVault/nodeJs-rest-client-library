//objects api
var common = require('./common');

module.exports = class ObjectsApi {
    constructor(sessionToken, objectsApiConfig) {
        if(!sessionToken['tokenType'] && sessionToken['tokenType'] != 'jwt') {
            return;
        }
        
        var yaml = require('js-yaml');
        var fs = require('fs');
        var yamlConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/config.yml', 'utf8'));
        this._httpHelper = new common.httpHelper(sessionToken, yamlConfig);

        this.isEnabled = objectsApiConfig['isEnabled'] || false;
        this.baseUrl = objectsApiConfig['apiUrl'] || null;
    }

    /**
     * Retrieves a list of available models
     * @param {object} params - Optional URL parameters to include in the request
     */
    async getModels(params) {
        var resourceUri = this._httpHelper._config.ResourceUri.ObjectsApi.Models;
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };

        params = params || {};

        return this._httpHelper.doVvClientRequest(url, opts, params, null);
    }

    /**
     * Retrieves a specific model by its ID
     * @param {string} modelId - The ID (Guid) for the requested model
     * @param {object} params - Optional URL parameters to include in the request
     */
    async getModelById(modelId, params) {
        var resourceUri = this._httpHelper._config.ResourceUri.ObjectsApi.ModelById;
        resourceUri = resourceUri.replace('{id}', modelId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };

        params = params || {};

        return this._httpHelper.doVvClientRequest(url, opts, params, null);
    }

    /**
     * Retrieves a specific object by its ID
     * @param {string} objectId - The ID (Guid) for the requested object
     * @param {object} params - Optional URL parameters to include in the request
     */
    async getObject(objectId, params) {
        var resourceUri = this._httpHelper._config.ResourceUri.ObjectsApi.ObjectById;
        resourceUri = resourceUri.replace('{id}', objectId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };

        params = params || {};

        return this._httpHelper.doVvClientRequest(url, opts, params, null);
    }

    /**
     * Retrieves a paged list of objects associated with a given model
     * @param {string} modelId - The ID (Guid) for the requested model to search
     * @param {object} data - Data to send in the request body
     * @param {object} params - Optional URL parameters to include in the request
     */
    async getObjectsByModelId(modelId, data, params) {
        var resourceUri = this._httpHelper._config.ResourceUri.ObjectsApi.ObjectSearchByModelId;
        resourceUri = resourceUri.replace('{modelId}', modelId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'POST' };

        data = data || {};
        params = params || {};

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /**
     * Creates a new object adhering to a given model
     * @param {string} modelId - The ID (Guid) used to create a new object for that model
     * @param {object} data - Data to send in the request body
     * @param {object} params - Optional URL parameters to include in the request
     */
    async createObject(modelId, data, params) {
        var resourceUri = this._httpHelper._config.ResourceUri.ObjectsApi.Object;
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'POST' };

        data = data || {};
        params = params || {};

        data['modelId'] = modelId || data['modelId'];

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /**
     * Updates an existing object by its ID (Guid) and revision ID (Guid)
     * @param {string} objectId - The ID (Guid) for the requested object to update
     * @param {string} objectRevisionId - The revision ID (Guid) for the requested object to update
     * @param {object} data - Data to send in the request body
     * @param {object} params - Optional URL parameters to include in the request
     */
    async updateObject(objectId, objectRevisionId, data, params) {
        var resourceUri = this._httpHelper._config.ResourceUri.ObjectsApi.ObjectById;
        resourceUri = resourceUri.replace('{id}', objectId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'PUT' };

        data = data || {};
        params = params || {};

        data['revisionId'] = objectRevisionId || data['revisionId'];

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /**
     * Deletes an existing object by its ID (Guid)
     * @param {string} objectId - The ID (Guid) for the requested object to delete
     * @param {object} params - Optional URL parameters to include in the request
     */
    async deleteObject(objectId, params) {
        var resourceUri = this._httpHelper._config.ResourceUri.ObjectsApi.ObjectById;
        resourceUri = resourceUri.replace('{id}', objectId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'DELETE' };

        params = params || {};

        return this._httpHelper.doVvClientRequest(url, opts, params, null);
    }
}
