require('./serviceCore');
var HTTP = require('http');
var jwt = require('./jwtSupport');
var requestSigning = require('./requestSigning');
var jsyaml = require('js-yaml');
var nodeJsRequest = require('request');
var Q = require('q');
var VVRestApi = (function () {
    function VVRestApi() {
        this._config = null;
        this._sessionToken = null;
    }
    VVRestApi.prototype.init = function (sessionToken) {
        this._config = require('./config.yml');
        this._sessionToken = sessionToken;
    };
    VVRestApi.prototype.endsWith = function (source, suffix) {
        return source.indexOf(suffix, source.length - suffix.length) !== -1;
    };
    VVRestApi.prototype.acquireSecurityToken = function () {
        var self = this;
        var deferred = Q.defer();
        Q.when(this.__getToken()).then(function (response) {
            console.log('acquireSecurityToken Success');
            deferred.resolve(response);
        }).fail(function (error) {
            console.log('acquireSecurityToken Failed');
            deferred.reject(new Error(error));
        });
        return deferred.promise;
    };
    VVRestApi.prototype.getFormTemplates = function (params) {
        var url = this.__getUrl(this._config.ResourceUri.FormTemplates);
        var opts = {
            method: 'GET'
        };
        return this.__doVvClientRequest(url, opts, params, null);
    };
    VVRestApi.prototype.getForms = function (params, formTemplateId) {
        var resourceUri = this._config.ResourceUri.Forms.replace('{id}', formTemplateId);
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'GET'
        };
        return this.__doVvClientRequest(url, opts, params, null);
    };
    VVRestApi.prototype.postForms = function (params, data, formTemplateId) {
        var resourceUri = this._config.ResourceUri.Forms.replace('{id}', formTemplateId);
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'POST'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.postFormRevision = function (params, data, formTemplateId, formId) {
        var resourceUri = this._config.ResourceUri.Forms.replace('{id}', formTemplateId);
        var url = this.__getUrl(resourceUri + '/' + formId);
        var opts = {
            method: 'POST'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.getSites = function (params) {
        var url = this.__getUrl(this._config.ResourceUri.Sites);
        var opts = {
            method: 'GET'
        };
        return this.__doVvClientRequest(url, opts, params, null);
    };
    VVRestApi.prototype.postSites = function (params, data) {
        var resourceUri = this._config.ResourceUri.Sites;
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'POST'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.putSites = function (params, data, siteId) {
        var resourceUri = this._config.ResourceUri.Sites;
        var url = this.__getUrl(resourceUri + '/' + siteId);
        var opts = {
            method: 'PUT'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.getUsers = function (params, siteId) {
        var resourceUri = this._config.ResourceUri.Users.replace('{id}', siteId);
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'GET'
        };
        return this.__doVvClientRequest(url, opts, params, null);
    };
    VVRestApi.prototype.postUsers = function (params, data, siteId) {
        var resourceUri = this._config.ResourceUri.Users.replace('{id}', siteId);
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'POST'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.putUsers = function (params, data, siteId, usId) {
        var resourceUri = this._config.ResourceUri.Users.replace('{id}', siteId);
        var url = this.__getUrl(resourceUri + '/' + usId);
        var opts = {
            method: 'PUT'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.getGroups = function (params, siteId) {
        var resourceUri = this._config.ResourceUri.Groups.replace('{id}', siteId);
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'GET'
        };
        return this.__doVvClientRequest(url, opts, params, null);
    };
    VVRestApi.prototype.postGroups = function (params, data, siteId) {
        var resourceUri = this._config.ResourceUri.Groups.replace('{id}', siteId);
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'POST'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.putGroups = function (params, data, siteId, grId) {
        var resourceUri = this._config.ResourceUri.Groups.replace('{id}', siteId);
        var url = this.__getUrl(resourceUri + '/' + grId);
        var opts = {
            method: 'PUT'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.getFolders = function (params) {
        var url = this.__getUrl(this._config.ResourceUri.Folders);
        var opts = {
            method: 'GET'
        };
        return this.__doVvClientRequest(url, opts, params, null);
    };
    VVRestApi.prototype.getDocuments = function (params, folderId) {
        var resourceUri = this._config.ResourceUri.Documents.replace('{id}', folderId);
        var url = this.__getUrl(resourceUri);
        var opts = {
            method: 'GET'
        };
        return this.__doVvClientRequest(url, opts, params, null);
    };
    VVRestApi.prototype.postEmails = function (params, data) {
        var url = this.__getUrl(this._config.ResourceUri.Emails);
        var opts = {
            method: 'POST'
        };
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.getSecurityToken = function () {
        return this._sessionToken.tokenBase64;
    };
    VVRestApi.prototype.isAuthenticated = function () {
        return this._sessionToken.isAuthenticated;
    };
    VVRestApi.prototype.getBaseUrl = function () {
        return this._sessionToken.baseUrl;
    };
    VVRestApi.prototype.request = function (httpVerb, url, params, data) {
        var opts = {
            method: ''
        };
        if(httpVerb.toLowerCase() === 'post') {
            opts.method = 'POST';
        } else if(httpVerb.toLowerCase() === 'put') {
            opts.method = 'PUT';
        } else if(httpVerb.toLowerCase() === 'delete') {
            opts.method = 'DELETE';
        } else {
            opts.method = 'GET';
        }
        return this.__doVvClientRequest(url, opts, params, data);
    };
    VVRestApi.prototype.httpGet = function (url, params, requestCallback) {
        var self = this;
        var options = {
            method: 'GET',
            uri: url,
            qs: params
        };
        if(this._sessionToken.tokenBase64 == null) {
            this.__acquireNewTokenWithRequest(options, requestCallback);
        } else {
            params.token = this._sessionToken.tokenBase64;
            console.log("Performing GET request to url:" + url);
            nodeJsRequest(options, function (error, response, body) {
                requestCallback(error, response, body);
            });
        }
    };
    VVRestApi.prototype.httpPost = function (url, params, data, requestCallback) {
        var self = this;
        var options = {
            method: 'POST',
            uri: url,
            qs: params,
            json: data
        };
        if(this._sessionToken.tokenBase64 == null) {
            this.__acquireNewTokenWithRequest(options, requestCallback);
        } else {
            params.token = this._sessionToken.tokenBase64;
            console.log("Performing POST request to url:" + url);
            nodeJsRequest(options, function (error, response, body) {
                requestCallback(error, response, body);
            });
        }
    };
    VVRestApi.prototype.httpPut = function (url, params, data, requestCallback) {
        var self = this;
        var options = {
            method: 'PUT',
            uri: url,
            qs: params,
            json: data
        };
        if(this._sessionToken.tokenBase64 == null) {
            this.__acquireNewTokenWithRequest(options, requestCallback);
        } else {
            params.token = this._sessionToken.tokenBase64;
            console.log("Performing PUT request to url:" + url);
            nodeJsRequest(options, function (error, response, body) {
                requestCallback(error, response, body);
            });
        }
    };
    VVRestApi.prototype.httpDelete = function (url, params, requestCallback) {
        var self = this;
        var options = {
            method: 'DELETE',
            uri: url,
            qs: params
        };
        if(this._sessionToken.tokenBase64 == null) {
            this.__acquireNewTokenWithRequest(options, requestCallback);
        } else {
            params.token = this._sessionToken.tokenBase64;
            console.log("Performing DELETE request to url:" + url);
            nodeJsRequest(options, function (error, response, body) {
                requestCallback(error, response, body);
            });
        }
    };
    VVRestApi.prototype.__acquireNewTokenWithRequest = function (options, requestCallback) {
        var attemptCount = 0;
        Q.when(this.__getToken()).then(function () {
            options.qs.token = this._token;
            nodeJsRequest(options, function (error, response, body) {
                requestCallback(error, response, body);
            });
        }).fail(function (tokenError) {
            attemptCount++;
            this.__recursiveAttemptAcquireToken(options, requestCallback, attemptCount);
        });
    };
    VVRestApi.prototype.__recursiveAttemptAcquireToken = function (options, requestCallback, attemptCount) {
        Q.when(this.__getToken()).then(function () {
            options.qs.token = this._token;
            nodeJsRequest(options, function (error, response, body) {
                requestCallback(error, response, body);
            });
        }).fail(function (tokenError) {
            if(attemptCount < 6) {
                attemptCount++;
                this.__recursiveAttemptAcquireToken(options, requestCallback, attemptCount);
            }
        });
    };
    VVRestApi.prototype.__doVvClientRequest = function (url, opts, params, data) {
        var self = this;
        var deferred = Q.defer();
        var vvClientRequestCallback = function (error, response, responseData) {
            if(error) {
                console.log('In vvClientRequestCallback with error condition');
                deferred.reject(new Error(error));
            } else {
                if(response.statusCode === 403) {
                    self._sessionToken.tokenBase64 = null;
                    self._sessionToken.isAuthenticated = false;
                    var errorData = JSON.parse(responseData);
                    deferred.reject(new Error(errorData.meta));
                } else {
                    console.log('In vvClientRequestCallback with success: ' + responseData);
                    deferred.resolve(responseData);
                }
            }
        };
        if(opts.method === 'GET') {
            this.httpGet(url, params, vvClientRequestCallback);
        } else if(opts.method === 'POST') {
            this.httpPost(url, params, data, vvClientRequestCallback);
        } else if(opts.method === 'PUT') {
            this.httpPut(url, params, data, vvClientRequestCallback);
        } else if(opts.method === 'DELETE') {
            this.httpDelete(url, params, vvClientRequestCallback);
        } else {
            throw new Error('http request method name error');
        }
        return deferred.promise;
    };
    VVRestApi.prototype.__getUrl = function (resourceUrl) {
        return this._sessionToken.baseUrl + this._sessionToken.apiUrl + resourceUrl;
    };
    VVRestApi.prototype.__getToken = function () {
        var self = this;
        console.log("Getting token");
        var deferred = Q.defer();
        var buff = new Buffer(this._sessionToken.developerSecret, "base64");
        var initiatedAtDate = new Date();
        var initiatedAtSeconds = parseInt((initiatedAtDate.getTime() / 1000).toString());
        var expireDate = new Date();
        expireDate.setMinutes(expireDate.getMinutes() + 30);
        var expireSeconds = parseInt((expireDate.getTime() / 1000).toString());
        var notBeforeDate = new Date();
        notBeforeDate.setMinutes(notBeforeDate.getMinutes() - 5);
        var notBeforeSeconds = parseInt((notBeforeDate.getTime() / 1000).toString());
        var claim = {
            iss: 'self:user',
            devid: this._sessionToken.developerId,
            prn: this._sessionToken.loginToken,
            aud: 'http://VisualVault/api',
            exp: expireSeconds,
            nbf: notBeforeSeconds,
            iat: initiatedAtSeconds
        };
        var token = jwt.encode(claim, buff, 'HS256');
        var getTokenCallback = function (error, response, body) {
            if(error) {
                self._sessionToken.isAuthenticated = false;
                console.log('Error from acquiring token: ' + error);
                deferred.reject(new Error(error));
            } else {
                if(response.statusCode == 200) {
                    var responseObject = JSON.parse(body);
                    self._sessionToken.expirationDateUtc = new Date(responseObject.data.expires);
                    self._sessionToken.tokenBase64 = responseObject.data.expires;
                    self._sessionToken.isAuthenticated = true;
                    deferred.resolve(null);
                } else if(response.statusCode == 401 || response.statusCode == 403) {
                    self._sessionToken.isAuthenticated = false;
                    console.log("Authorization has been refused for current credentials");
                    deferred.reject(new Error("Authorization has been refused for current credentials"));
                } else {
                    self._sessionToken.isAuthenticated = false;
                    console.log("Unknown response for access token");
                    deferred.reject(new Error("Unknown response for access token"));
                }
            }
        };
        var urlSecurity = this._sessionToken.baseUrl + this._sessionToken.authenticationUrl;
        var headers = {
        };
        headers["Authorization"] = "Bearer " + token;
        var rs = require('./requestSigning.js');
        rs.sign(headers, urlSecurity, 'GET', null, this._sessionToken.developerId, this._sessionToken.developerSecret, "SHA256");
        var options = {
            method: 'GET',
            uri: urlSecurity,
            headers: headers
        };
        console.log("\n\nSending request for access token to " + urlSecurity + "\n\n");
        console.log("token: " + token);
        nodeJsRequest(options, function (error, response, body) {
            getTokenCallback(error, response, body);
        });
        return deferred.promise;
    };
    return VVRestApi;
})();
(module).exports = new VVRestApi();
