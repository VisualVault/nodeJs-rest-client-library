// Notifications API
var common = require('./common');

module.exports = class NotificationsApi {
    constructor(sessionToken, notificationsApiConfig) {
        if(!sessionToken['tokenType'] && sessionToken['tokenType'] != 'jwt'){
            return;
        }

        var yaml = require('js-yaml');
        var fs = require('fs');
        var yamlConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/config.yml', 'utf8'));
        console.log("Before")
        this._httpHelper = new common.httpHelper(sessionToken, yamlConfig);
        console.log('After');

        this.isEnabled = notificationsApiConfig['isEnabled'] || false;
        this.baseUrl = notificationsApiConfig['apiUrl'] || null;

        if (this.isEnabled) {
            this.users = new UserNotificationsManager(this._httpHelper);
        }
    }
}

class UserNotificationsManager {
    constructor (httpHelper) {
        this._httpHelper = httpHelper;
    }

    async forceUIRefresh(userGuid) {
        var resourceUri = this._httpHelper._config.ResourceUri.NotificationsApi.ForceUIRefresh.replace('{id}', userGuid);
        var url = this._httpHelper.getUrl(resourceUri);
        var opts = { method: 'POST' };
        var params = {};
        var data = {};
        return this._httpHelper.doVvClientRequest(url, opts, params, data);
    }
}