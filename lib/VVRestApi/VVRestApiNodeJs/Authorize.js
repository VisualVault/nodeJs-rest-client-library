require('./serviceCore');
var HTTP = require('http');
var jwt = require('./jwtSupport');
var requestSigning = require('./requestSigning');
var jsyaml = require('js-yaml');
var nodeJsRequest = require('request');
var Q = require('q');
var authorize = (function () {
    function authorize() { }
    authorize.prototype.getVaultApi = function (loginToken, developerId, developerSecret, baseVaultUrl, customerAlias, databaseAlias) {
        var config = require('./config.yml');
        if(this.endsWith(baseVaultUrl, '/')) {
            baseVaultUrl = baseVaultUrl.substring(0, baseVaultUrl.length - 1);
        }
        var apiUrl = config.ApiUri.replace('{custalias}', customerAlias).replace('{custdbalias}', databaseAlias);
        var authenticationUrl = config.AutheticateUri.replace('{custalias}', customerAlias).replace('{custdbalias}', databaseAlias);
        return this.acquireSecurityToken(loginToken, developerId, developerSecret, baseVaultUrl, apiUrl, customerAlias, databaseAlias, authenticationUrl);
    };
    authorize.prototype.acquireSecurityToken = function (loginToken, developerId, developerSecret, baseUrl, apiUrl, customerAlias, databaseAlias, authenticationUrl) {
        var self = this;
        var deferred = Q.defer();
        Q.when(this.__getToken(loginToken, developerId, developerSecret, baseUrl, customerAlias, databaseAlias, authenticationUrl, true)).then(function (response) {
            console.log('acquireSecurityToken Success');
            var api = null;
            if(typeof (response) != 'undefined' && response != null) {
                var sessionToken = require('./vault/common/sessionToken');
                sessionToken.baseUrl = baseUrl;
                sessionToken.apiUrl = apiUrl;
                sessionToken.loginToken = loginToken;
                sessionToken.authenticationUrl = authenticationUrl;
                sessionToken.customerAlias = customerAlias;
                sessionToken.databaseAlias = databaseAlias;
                sessionToken.developerId = developerId;
                sessionToken.developerSecret = developerSecret;
                sessionToken.isAuthenticated = true;
                sessionToken.tokenType = 0;
                sessionToken.expirationDateUtc = response.expirationDateUtc;
                sessionToken.tokenBase64 = response.tokenBase64;
                var api = require('./VVRestApi');
                api.init(sessionToken);
            }
            deferred.resolve(api);
        }).fail(function (error) {
            console.log('acquireSecurityToken Failed');
            deferred.reject(new Error(error));
        });
        return deferred.promise;
    };
    authorize.prototype.endsWith = function (source, suffix) {
        return source.indexOf(suffix, source.length - suffix.length) !== -1;
    };
    authorize.prototype.__getToken = function (loginToken, developerId, developerSecret, baseUrl, customerAlias, databaseAlias, authenticationUrl, isDebugMode) {
        var self = this;
        console.log("Getting token");
        var deferred = Q.defer();
        var buff = new Buffer(developerSecret, "base64");
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
            devid: developerId,
            prn: loginToken,
            aud: 'http://VisualVault/api',
            exp: expireSeconds,
            nbf: notBeforeSeconds,
            iat: initiatedAtSeconds
        };
        var token = jwt.encode(claim, buff, 'HS256');
        var getTokenCallback = function (error, response, body) {
            var sessionToken = require('./vault/common/sessionToken');
            if(error) {
                sessionToken.isAuthenticated = false;
                console.log('Error from acquiring token: ' + error);
                deferred.reject(new Error(error));
            } else {
                if(isDebugMode) {
                    console.log('Returned Status: ' + response.statusCode);
                    console.log('Returned Body: ' + response.body);
                }
                if(response.statusCode == 200) {
                    var responseObject = JSON.parse(body);
                    sessionToken.tokenBase64 = responseObject.data.token;
                    sessionToken.expirationDateUtc = new Date(responseObject.data.expires);
                    sessionToken.isAuthenticated = true;
                    deferred.resolve(sessionToken);
                } else if(response.statusCode == 401 || response.statusCode == 403) {
                    sessionToken.isAuthenticated = false;
                    console.log("Authorization has been refused for current credentials");
                    deferred.reject(new Error("Authorization has been refused for current credentials"));
                } else {
                    sessionToken.isAuthenticated = false;
                    console.log("Unknown response for access token");
                    deferred.reject(new Error("Unknown response for access token"));
                }
            }
            return sessionToken;
        };
        var urlSecurity = baseUrl + authenticationUrl;
        var headers = {
        };
        headers["Authorization"] = "Bearer " + token;
        var rs = require('./requestSigning.js');
        rs.sign(headers, urlSecurity, 'GET', null, developerId, developerSecret, "SHA256");
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
    return authorize;
})();
(module).exports = new authorize();
