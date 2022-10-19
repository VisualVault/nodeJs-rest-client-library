//forms api
var common = require('./common');

module.exports = class FormsApi {
    constructor(sessionToken, formsApiConfig){
        if(!sessionToken['tokenType'] && sessionToken['tokenType'] != 'jwt'){
            return;
        }
        
        var yaml = require('js-yaml');
        var fs = require('fs');
        var yamlConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/config.yml', 'utf8'));
        this._httpHelper = new common.httpHelper(sessionToken, yamlConfig);

        this.isEnabled = formsApiConfig['isEnabled'] || false;
        this.baseUrl = formsApiConfig['formsApiUrl'] || null;
        
        if(this.isEnabled){
            this.formInstances = new FormInstanceManager(this._httpHelper);
        }
    }
}

class FormInstanceManager{
    constructor(httpHelper){
        this._httpHelper = httpHelper;
    }

    async postForm(params, data, formTemplateRevisionId) {
        var resourceUri = this._httpHelper._config.ResourceUri.FormsApi.FormInstance;
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'POST' };

        data['formTemplateId'] = formTemplateRevisionId || data['formTemplateId'];

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    async postFormRevision(params, data, formTemplateRevisionId, formId){
        var resourceUri = this._httpHelper._config.ResourceUri.FormsApi.FormInstance;
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'PUT' };

        // only add these if provided. params could already have the value
        data['formTemplateId'] = formTemplateRevisionId || data['formTemplateId'];
        data['formId'] = formId || data['formId'];

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }
}

