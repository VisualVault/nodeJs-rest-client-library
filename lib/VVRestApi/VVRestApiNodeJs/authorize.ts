///<reference path='dts\node.d.ts' />
///<reference path='dts\express.d.ts' />
///<reference path='dts\general.d.ts' />
///<reference path='serviceCore.ts' />
///<reference path='Vault\Common\sessionToken.ts' />

/* Copyright 2013 Auersoft */

require('./serviceCore');

//(module).exports = new ApiServiceCoreSettings();

var HTTP = require('http');
var jwt = require('./jwtSupport');
var requestSigning = require('./requestSigning');
var jsyaml = require('js-yaml');
var nodeJsRequest = require('request');
var Q = require('q');


class authorize {

    public getVaultApi(loginToken: string, developerId: string, developerSecret: string, baseVaultUrl: string, customerAlias: string, databaseAlias: string) {
        var config = require('./config.yml');

        if (this.endsWith(baseVaultUrl, '/')) {
            baseVaultUrl = baseVaultUrl.substring(0, baseVaultUrl.length - 1);
        }

        var apiUrl = config.ApiUri.replace('{custalias}', customerAlias).replace('{custdbalias}', databaseAlias);
        var authenticationUrl = config.AutheticateUri.replace('{custalias}', customerAlias).replace('{custdbalias}', databaseAlias);

        return this.acquireSecurityToken(loginToken, developerId, developerSecret, baseVaultUrl, apiUrl, customerAlias, databaseAlias, authenticationUrl);
       
    }

    private acquireSecurityToken(loginToken: string, developerId: string, developerSecret: string, baseUrl: string, apiUrl : string, customerAlias: string, databaseAlias: string, authenticationUrl : string) {
        var self = this;

        var deferred = Q.defer();
        

        Q.when(this.__getToken(loginToken, developerId, developerSecret, baseUrl, customerAlias, databaseAlias, authenticationUrl, true))
            .then(function (response) {
                console.log('acquireSecurityToken Success');

                var api = null;
                if (typeof (response) != 'undefined' && response != null) {

                    var sessionToken: sessionToken = require('./vault/common/sessionToken');
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
            })
            .fail(function (error) {
                console.log('acquireSecurityToken Failed');
                
                deferred.reject(new Error(error));
            });

      
        //return deferred.promise;
        return deferred.promise;
    }

    private endsWith(source, suffix) {
        return source.indexOf(suffix, source.length - suffix.length) !== -1;
    }

    private __getToken(loginToken: string, developerId: string, developerSecret: string, baseUrl: string, customerAlias: string, databaseAlias: string, authenticationUrl : string, isDebugMode: bool): sessionToken {
        var self = this;

        console.log("Getting token");

        //create deferred object containing promise
        var deferred = Q.defer();

        //read token key from config file
        var buff = new Buffer(developerSecret, "base64");

        var initiatedAtDate = new Date();
        var initiatedAtSeconds = parseInt((initiatedAtDate.getTime() / 1000).toString());
        //console.log('Initiated at date set to: ' + initiatedAtDate);

        var expireDate = new Date();
        expireDate.setMinutes(expireDate.getMinutes() + 30);
        var expireSeconds = parseInt((expireDate.getTime() / 1000).toString());
        //console.log('Expire date set to: ' + expireDate);


        var notBeforeDate = new Date();
        notBeforeDate.setMinutes(notBeforeDate.getMinutes() - 5);
        var notBeforeSeconds = parseInt((notBeforeDate.getTime() / 1000).toString());
        //console.log('Not before date set to: ' + notBeforeDate);

        // console.log("Creating claim");

        //setup claim portion of jwt token
        var claim = {
            iss: 'self:user',
            devid: developerId,
            prn: loginToken,
            aud: 'http://VisualVault/api',
            exp: expireSeconds,
            nbf: notBeforeSeconds,
            iat: initiatedAtSeconds
        };


        // console.log(claim);

        //create JWT token and sign it
        var token = jwt.encode(claim, buff, 'HS256');

        //setup response callback that will be called when request has completed
        var getTokenCallback = function (error, response, body): sessionToken {
            var sessionToken : sessionToken = require('./vault/common/sessionToken');
           
            if (error) {
                sessionToken.isAuthenticated = false;
                console.log('Error from acquiring token: ' + error);
                deferred.reject(new Error(error));
            } else {
                if (isDebugMode) {
                    console.log('Returned Status: ' + response.statusCode);
                    console.log('Returned Body: ' + response.body);
                }
                //console.log(response.body);
                if (response.statusCode == 200) {
                    var responseObject = JSON.parse(body);
                    sessionToken.tokenBase64 = responseObject.data.token;
                    sessionToken.expirationDateUtc = new Date(responseObject.data.expires);
                    sessionToken.isAuthenticated = true;

                    deferred.resolve(sessionToken);
                } else if (response.statusCode == 401 || response.statusCode == 403) {
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


        //determine url to request security token
        var urlSecurity = baseUrl + authenticationUrl;

        //setup authorization header section to be added to request headers
        //THIS IS WHERE WE NEED TO ADD THE HEADERS REQUIRED BY REST API
        // X-Authorization, X-VV-RequestDate
        var headers = {};
        headers["Authorization"] = "Bearer " + token;

        var rs = require('./requestSigning.js');
        rs.sign(headers, urlSecurity, 'GET', null, developerId, developerSecret, "SHA256");

        //create the options object for the request
        var options = { method: 'GET', uri: urlSecurity, headers: headers };

        //console.log(options);

        console.log("\n\nSending request for access token to " + urlSecurity + "\n\n");
        console.log("token: " + token);
        //make request for security token using signed JWT token
        nodeJsRequest(options, function (error, response, body) {
            getTokenCallback(error, response, body);
        });

        //return promise object
        return deferred.promise;
    }
}



(module).exports = new authorize();
