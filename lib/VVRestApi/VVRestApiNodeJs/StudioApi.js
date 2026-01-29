//studio api
var common = require('./common');

module.exports = class StudioApi {
    constructor(sessionToken, studioApiConfig){
        if(!sessionToken['tokenType'] && sessionToken['tokenType'] != 'jwt'){
            return;
        }
        
        var yaml = require('js-yaml');
        var fs = require('fs');
        var yamlConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/config.yml', 'utf8'));
        this._httpHelper = new common.httpHelper(sessionToken, yamlConfig);

        this.isEnabled = studioApiConfig['isEnabled'] || false;
        this.baseUrl = studioApiConfig['studioApiUrl'] || null;
        this.apiUrl = '';
        
        if(this.isEnabled){
            this.workflow = new WorkflowManager(this._httpHelper);
            this.permissions = new RolesAndPermissionsManager(this._httpHelper);
        }
    }
}

/** Manage Workflows */
class WorkflowManager{
    constructor(httpHelper){
        this._httpHelper = httpHelper;
    }

    /** Gets the latest published workflow by Id*/
    async getWorkflow(workflowId){
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.WorkflowLatestPublishedId.replace('{id}', workflowId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };
        var data = {};
        var params = {};

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /** Gets the latest published workflow by Name */
    async getWorkflowByName(workflowName){
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.WorkflowLatestPublished;
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };
        var data = {};
        var params = { name: workflowName };

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /** Gets workflow variables assigned to the workflow */
    async getWorkflowVariables(params, workflowId){
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.WorkflowVariables.replace('{id}', workflowId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };
        var data = {};
        params = params || {};

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /** 
     * Triggers workflow
     * @param {string} workflowId
     * @param {number} workflowRevision
     * @param {string} objectId
     * @param {object[]} workflowVariables - workflow values to be submitted to the workflow
     * * @param {string} workflowVariables[].name = name of variable
     * * @param {*} workflowVariables[].value - value to be passed
     * * @param {number} workflowVariables[].dataType - Text: 1, Number: 2, Date: 3, Boolean: 4
     */
    async triggerWorkflow(workflowId, workflowRevision, objectId, workflowVariables){
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.WorkflowRun.replace('{id}', workflowId).replace('{revision}', workflowRevision);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'POST' };
        var data ={
            objectId: objectId,
            reference: 'API',
            data: {
                workflowVariables: workflowVariables,
                dataSetVariables: []
            }
        };
        var params = {};

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /**
     * Terminates the workflow instance
     * @param {string} workflowId 
     * @param {string} instanceId 
     * @returns 
     */
    async terminateWorkflow(workflowId, instanceId){
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.WorkflowTerminate.replace('{workflowId}', workflowId).replace('{instanceId}', instanceId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'POST' };
        var data ={}
        var params = {};
        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /**
         * Returns workflow history for an object under the provided workflow
         * @param {string} workflowId 
         * @param {string} objectId 
         * @returns 
         */
    async GetWorkflowHistoryForObject(objectId, workflowId){
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.WorkflowHistoryObject.replace('{workflowId}', workflowId).replace('{objectId}', objectId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };
        var data ={}
        var params = {};
        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }

    /**
     * Returns the running workflow, if any, for an object under the provided workflow
     * @param {string} workflowId 
     * @param {string} objectId 
     * @returns 
     */
    async GetRunningWorkflowForObject(objectId, workflowId){
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.WorkflowHistoryRunningObject.replace('{workflowId}', workflowId).replace('{objectId}', objectId);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };
        var data ={}
        var params = {};
        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }
}

class RolesAndPermissionsManager {
    constructor(httpHelper) {
        this._httpHelper = httpHelper;
    }

    /**
     * Retrieves available features for the requesting user
     * @param {string} resource - Optional string representing the ID or name of a specific resource to filter results to only include that resource
     */
    async getUserFeatures(resource) {
        var resourceUri = this._httpHelper._config.ResourceUri.StudioApi.ResourceUserFeatures;
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'GET' };
        var data = {};
        var params = {};

        if (resource)
            params['resource'] = resource;

        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }
}
