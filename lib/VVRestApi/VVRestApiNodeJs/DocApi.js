//DocApi
var common = require('./common');

module.exports = class DocApi {
    constructor(sessionToken, docApiConfig) {
        if (!sessionToken['tokenType'] && sessionToken['tokenType'] != 'jwt') {
            return;
        }

        var yaml = require('js-yaml');
        var fs = require('fs');
        var yamlConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/config.yml', 'utf8'));
        this._httpHelper = new common.httpHelper(sessionToken, yamlConfig);

        this.isEnabled = docApiConfig['isEnabled'] || false;
        this.baseUrl = docApiConfig['apiUrl'] || null;
        this.roleSecurity = docApiConfig['roleSecurity'] || false;

    }

    async GetRevision(documentRevisionId) {
        let resourceUri = this._httpHelper._config.ResourceUri.DocApi.GetRevision;
        resourceUri = resourceUri.replace('{id}', documentRevisionId);
        const url = this._httpHelper.getUrl(resourceUri);
        const opts = { method: 'GET' };

        return this._httpHelper.doVvClientRequest(url, opts, null, null);
    }

    async getDocumentOcrStatus(documentRevisionId) {
        let resourceUri = this._httpHelper._config.ResourceUri.DocApi.OcrStatus;
        resourceUri = resourceUri.replace('{id}', documentRevisionId);
        const url = this._httpHelper.getUrl(resourceUri);

        const opts = { method: 'GET' };
        return this._httpHelper.doVvClientRequest(url, opts, null, null);
    }

    async updateDocumentOcrStatus(documentRevisionId, data) {
        let resourceUri = this._httpHelper._config.ResourceUri.DocApi.OcrStatus;
        resourceUri = resourceUri.replace('{id}', documentRevisionId);
        const url = this._httpHelper.getUrl(resourceUri);

        const opts = { method: 'PUT' };
        return this._httpHelper.doVvClientRequest(url, opts, null, data);
    }

    async search(criteriaList, searchFolders, excludeFolders, sortBy, sortDirection = 'desc', page = 0, take = 15, archiveType = 0, roleSecurity = false) {
        const url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.DocApi.AdvancedSearch);

        var data = {
            criteriaList,
            searchFolders,
            excludeFolders,
            sortBy,
            sortDirection,
            page,
            take,
            archiveType,
            roleSecurity
        };

        const options = { method: 'POST'};
        return this._httpHelper.doVvClientRequest(url, options, null, data);
    }

}
