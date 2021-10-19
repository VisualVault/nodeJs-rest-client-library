﻿
var vvRestApi;
var logger = require('./log');
var Q = require('q');

(function (vvRestApi) {
    var vvClient = (function () {

        function vvClient(sessionToken) {
            // var yamlConfig = require('./config.yml');
            var yaml = require('js-yaml');
            var fs = require('fs');
            var yamlConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/config.yml', 'utf8'));

            this._httpHelper = new common.httpHelper(sessionToken, yamlConfig);
            this.constants = new constants.constantsInitializer();

            this.customQuery = new customQuery.customQueryManager(this._httpHelper);
            this.documents = new documents.documentsManager(this._httpHelper);
            this.email = new email.emailManager(this._httpHelper);
            this.files = new files.filesManager(this._httpHelper);
            this.forms = new forms.formsManager(this._httpHelper);
            this.groups = new groups.groupsManager(this._httpHelper);
            this.library = new library.libraryManager(this._httpHelper);
            this.sites = new sites.sitesManager(this._httpHelper);
            this.users = new users.usersManager(this._httpHelper);
            this.scheduledProcess = new scheduledProcess.scheduledProcessManager(this._httpHelper);
            this.scripts = new scripts.scriptsManager(this._httpHelper);
            this.projects = new projects.projectsManager(this._httpHelper);
            this.customer = new customer.customerManager(this._httpHelper);
            this.indexFields = new indexFields.indexFieldsManager(this._httpHelper);
            this.outsideProcesses = new outsideProcesses.outsideProcessesManager(this._httpHelper);
            this.securityMembers = new securityMembers.securityMembersManager(this._httpHelper);
            this.layouts = new layouts.layoutsManager(this._httpHelper);
        }

        vvClient.prototype.endsWith = function (source, suffix) {
            return source.indexOf(suffix, source.length - suffix.length) !== -1;
        };

        vvClient.prototype.getSecurityToken = function () {
            return this._httpHelper._sessionToken.accessToken;
        };

        vvClient.prototype.isAuthenticated = function () {
            return this._httpHelper._sessionToken.isAuthenticated;
        };

        vvClient.prototype.getBaseUrl = function () {
            return this._httpHelper._sessionToken.baseUrl;
        };

        return vvClient;
    })();
    vvRestApi.vvClient = vvClient;

    var authorize = (function () {
        function authorize() {
            this.HTTP = require('http');
            this.jsyaml = require('js-yaml');
            this.nodeJsRequest = require('request');
            this.Q = require('q');
            this.fs = require('fs');
        }

        authorize.prototype.getVaultApi = function (clientId, clientSecret, userId, password, baseVaultUrl, customerAlias, databaseAlias) {
            console.log('getVaultApi has been called');

            // var config = require('./config.yml');
            var config = this.jsyaml.safeLoad(this.fs.readFileSync(__dirname + '/config.yml', 'utf8'));

            if (this.endsWith(baseVaultUrl, '/')) {
                baseVaultUrl = baseVaultUrl.substring(0, baseVaultUrl.length - 1);
            }

            baseVaultUrl = baseVaultUrl;

            var apiUrl = config.ApiUri.replace('{custalias}', customerAlias).replace('{custdbalias}', databaseAlias);
            var authenticationUrl = config.AutheticateUri;

            return this.acquireSecurityToken(clientId, clientSecret, userId, password, baseVaultUrl, apiUrl, customerAlias, databaseAlias, authenticationUrl);
        };

        authorize.prototype.getVaultApiFromJwt = function(jwt, baseVaultUrl, customerAlias, databaseAlias, expirationDate) {
            console.log('getVaultApiFromJwt has been called');

            // var config = require('./config.yml');
            var config = this.jsyaml.safeLoad(this.fs.readFileSync(__dirname + '/config.yml', 'utf8'));
            
            baseVaultUrl = baseVaultUrl;

            if (this.endsWith(baseVaultUrl, '/')) {
                baseVaultUrl = baseVaultUrl.substring(0, baseVaultUrl.length - 1);
            }

            var apiUrl = config.ApiUri.replace('{custalias}', customerAlias).replace('{custdbalias}', databaseAlias);
            var authenticationUrl = apiUrl + config.ResourceUri.UsersGetJwt;

            //Create the session token directly from JWT if the passed in expiration date is not near expiration (within next 30 seconds)
            if(expirationDate && expirationDate >= new Date(new Date().getTime() + 30 * 1000)) {
                var sessionToken = new common.sessionToken();

                sessionToken.accessToken = jwt;
                sessionToken.baseUrl = baseVaultUrl;
                sessionToken.apiUrl = apiUrl;
                sessionToken.authenticationUrl = authenticationUrl;
                sessionToken.customerAlias = customerAlias;
                sessionToken.databaseAlias = databaseAlias;
                sessionToken.expirationDate = expirationDate;
                sessionToken.isAuthenticated = true;
                sessionToken.isJwt = true;

                var client = new vvClient(sessionToken);
                return Promise.resolve(client);
            } else {
                //expiration date was not passed in or is about to expire - attempt to use JWT to acquire a new JWT
                return this.acquireJwt(jwt, baseVaultUrl, apiUrl, authenticationUrl, customerAlias, databaseAlias);
            }
        }

        authorize.prototype.acquireSecurityToken = function (clientId, clientSecret, userId, password, baseUrl, apiUrl, customerAlias, databaseAlias, authenticationUrl) {
            var self = this;

            var deferred = this.Q.defer();

            this.Q
                .when(
                    this.__getToken(
                        clientId,
                        clientSecret,
                        userId,
                        password,
                        baseUrl,
                        customerAlias,
                        databaseAlias,
                        authenticationUrl,
                        true)
                )
                .then(function (sessionToken) {

                    console.log('acquireSecurityToken Success');

                    if (typeof (sessionToken) != 'undefined' && sessionToken != null) {
                        sessionToken.baseUrl = baseUrl;
                        sessionToken.apiUrl = apiUrl;
                        sessionToken.authenticationUrl = authenticationUrl;
                        sessionToken.customerAlias = customerAlias;
                        sessionToken.databaseAlias = databaseAlias;
                        sessionToken.clientId = clientId;
                        sessionToken.clientSecret = clientSecret;
                        sessionToken.userId = userId;
                        sessionToken.password = password;
                        sessionToken.isAuthenticated = true;
                    }

                    var client = new vvClient(sessionToken);

                    deferred.resolve(client);
                })
                .fail(function (error) {
                    console.log('acquireSecurityToken Failed');

                    deferred.reject(new Error(error));
                });

            return deferred.promise;
        };

        authorize.prototype.acquireJwt = function(jwt, baseUrl, apiUrl, authenticationUrl, customerAlias, databaseAlias) {
            var self = this;

            var deferred = this.Q.defer();

            this.Q
                .when(
                    this.__getJwt(
                        jwt,
                        baseUrl,
                        customerAlias,
                        databaseAlias,
                        authenticationUrl,
                        true)
                )
                .then(function (sessionToken) {

                    console.log('acquireJwt Success');

                    if (typeof (sessionToken) != 'undefined' && sessionToken != null) {
                        sessionToken.baseUrl = baseUrl;
                        sessionToken.apiUrl = apiUrl;
                        sessionToken.authenticationUrl = authenticationUrl;
                        sessionToken.customerAlias = customerAlias;
                        sessionToken.databaseAlias = databaseAlias;
                        // sessionToken.clientId = clientId;
                        // sessionToken.clientSecret = clientSecret;
                        // sessionToken.userId = userId;
                        // sessionToken.password = password;
                        sessionToken.isAuthenticated = true;
                        sessionToken.isJwt = true;
                    }

                    var client = new vvClient(sessionToken);

                    deferred.resolve(client);
                })
                .fail(function (error) {
                    console.log('acquireSecurityToken Failed');

                    deferred.reject(new Error(error));
                });

            return deferred.promise;
        }

        authorize.prototype.reacquireSecurityToken = function (sessionToken) {
            var self = this;

            var deferred = this.Q.defer();

            if(sessionToken.isJwt) {
                this.Q
                .when(
                    this.__getJwt(
                        sessionToken.accessToken, 
                        sessionToken.baseUrl, 
                        sessionToken.customerAlias, 
                        sessionToken.databaseAlias, 
                        sessionToken.authenticationUrl, 
                        true
                    )
                )
                .then(function (sessionToken) {
                    console.log('reacquireSecurityToken Success');

                    deferred.resolve(sessionToken);
                })
                .fail(function (error) {
                    console.log('acquireSecurityToken Failed');

                    deferred.reject(new Error(error));
                });
            } else {
                this.Q
                .when(
                    this.__getToken(
                        sessionToken.clientId,
                        sessionToken.clientSecret,
                        sessionToken.userId,
                        sessionToken.password,
                        sessionToken.baseUrl,
                        sessionToken.customerAlias,
                        sessionToken.databaseAlias,
                        sessionToken.authenticationUrl,
                        true)
                )
                .then(function (sessionToken) {
                    console.log('reacquireSecurityToken Success');

                    deferred.resolve(sessionToken);
                })
                .fail(function (error) {
                    console.log('acquireSecurityToken Failed');

                    deferred.reject(new Error(error));
                });
            }
            

            return deferred.promise;
        };

        authorize.prototype.acquireRefreshToken = function (sessionToken) {
            var self = this;

            if(sessionToken.isJwt) {
                return this.reacquireSecurityToken(sessionToken);
            } else {
                var claim = {
                    grant_type: 'refresh_token',
                    refresh_token: sessionToken.refreshToken,
                    client_id: sessionToken.clientId,
                    client_secret: sessionToken.clientSecret
                };
    
                console.log('In authorize.acquireRefreshToken');
    
                var getTokenCallback = function (error, response, body) {
    
                    if (error) {
                        sessionToken.isAuthenticated = false;
    
                        console.log('In authorize.acquireRefreshToken - getTokenCallback, Error from acquiring refreshToken: ' + error);
                        logger.error('In authorize.acquireRefreshToken - getTokenCallback, Error from acquiring refreshToken: ' + error);
    
                        deferred.reject(new Error(error));
                    } else {
    
    
                        if (response.statusCode == 200) {
                            console.log('In authorize.acquireRefreshToken - getTokenCallback, Success');
    
                            var responseObject = JSON.parse(body);
                            sessionToken.accessToken = responseObject.access_token;
                            sessionToken.expiresIn = responseObject.expires_in;
                            sessionToken.refreshToken = responseObject.refresh_token;
                            sessionToken.tokenType = responseObject.token_type;
    
                            var expireDate = new Date();
                            expireDate.setSeconds(expireDate.getSeconds() + sessionToken.expiresIn);
                            //var expireSeconds = parseInt((expireDate.getTime() / 1000).toString());
    
                            sessionToken.expirationDate = expireDate;
                            sessionToken.isAuthenticated = true;
    
                            deferred.resolve(sessionToken);
                        } else if (response.statusCode == 401 || response.statusCode == 403 || response.statusCode == 400) {
                            sessionToken.isAuthenticated = false;
                            logger.info("In authorize.acquireRefreshToken - getTokenCallback, Authorization has been refused for current credentials. " + response.body);
                            deferred.reject(new Error("Authorization has been refused for current credentials"));
                        } else {
                            sessionToken.isAuthenticated = false;
                            console.log("In authorize.acquireRefreshToken - getTokenCallback, Unknown response for access token");
                            logger.info("In authorize.acquireRefreshToken - getTokenCallback, Unknown response for access token");
                            deferred.reject(new Error("Unknown response for access token"));
                        }
                    }
                };
    
                var urlSecurity = sessionToken.baseUrl + sessionToken.authenticationUrl;
    
                console.log('In acquireRefreshToken - authenticationUrl ' + urlSecurity);
    
                var options = { method: 'POST', uri: urlSecurity, qs: null, headers: null, form: claim };
    
                this.nodeJsRequest(options, function (error, response, body) {
                    getTokenCallback(error, response, body);
                });

                var deferred = this.Q.defer();

                return deferred.promise;
            }
            
        };


        authorize.prototype.__getToken = function (clientId, clientSecret, userId, password, baseUrl, customerAlias, databaseAlias, authenticationUrl, isDebugMode) {
            console.log('authorize.__getToken is being called');

            var self = this;

            var deferred = this.Q.defer();

            //var buff = new Buffer(developerSecret, "base64");

            //var initiatedAtDate = new Date();
            //var initiatedAtSeconds = parseInt((initiatedAtDate.getTime() / 1000).toString());

            //var expireDate = new Date();
            //expireDate.setMinutes(expireDate.getMinutes() + 30);
            //var expireSeconds = parseInt((expireDate.getTime() / 1000).toString());

            //var notBeforeDate = new Date();
            //notBeforeDate.setMinutes(notBeforeDate.getMinutes() - 5);
            //var notBeforeSeconds = parseInt((notBeforeDate.getTime() / 1000).toString());

            var claim = {
                grant_type: 'password',
                client_id: clientId,
                client_secret: clientSecret,
                username: userId,
                password: password,
                scope: 'vault'
            };


            var getTokenCallback = function (error, response, body) {
                var sessionToken = new common.sessionToken();

                if (error) {
                    sessionToken.isAuthenticated = false;
                    console.log('Error from acquiring token: ' + error);
                    deferred.reject(new Error(error));
                } else {
                    if (response.statusCode == 200) {
                        var responseObject = JSON.parse(body);
                        sessionToken.accessToken = responseObject.access_token;
                        sessionToken.expiresIn = responseObject.expires_in;
                        sessionToken.refreshToken = responseObject.refresh_token;
                        sessionToken.tokenType = responseObject.token_type;

                        var expireDate = new Date();
                        expireDate.setSeconds(expireDate.getSeconds() + sessionToken.expiresIn);
                        //var expireSeconds = parseInt((expireDate.getTime() / 1000).toString());

                        sessionToken.expirationDate = expireDate;
                        sessionToken.isAuthenticated = true;

                        deferred.resolve(sessionToken);
                    } else if (response.statusCode == 401 || response.statusCode == 403 || response.statusCode == 400) {
                        sessionToken.isAuthenticated = false;
                        logger.info("Authorization has been refused for current credentials." + response.body);
                        deferred.reject(new Error("Authorization has been refused for current credentials"));
                    } else {
                        sessionToken.isAuthenticated = false;
                        console.log("Unknown response for access token");
                        deferred.reject(new Error("Unknown response for access token"));
                    }
                }
            };

            var urlSecurity = baseUrl + authenticationUrl;

            console.log('authenticationUrl ' + urlSecurity);


            var options = { method: 'POST', uri: urlSecurity, qs: null, headers: null, form: claim };

            this.nodeJsRequest(options, function (error, response, body) {
                getTokenCallback(error, response, body);
            });

            return deferred.promise;
        };

        authorize.prototype.__getJwt = function (jwt, baseUrl, customerAlias, databaseAlias, authenticationUrl, isDebugMode) {
            console.log('authorize.__getJwt is being called');

            var self = this;

            var deferred = this.Q.defer();

            var headers = {
                Authorization: 'Bearer ' + jwt,
            };


            var getTokenCallback = function (error, response, body) {
                var sessionToken = new common.sessionToken();

                if (error) {
                    sessionToken.isAuthenticated = false;
                    console.log('Error from acquiring jwt: ' + error);
                    deferred.reject(new Error(error));
                } else {
                    if (response.statusCode == 200) {
                        var responseObject = JSON.parse(body);
                        sessionToken.accessToken = responseObject.token;
                        //sessionToken.expiresIn = responseObject.expires_in;
                        //sessionToken.refreshToken = responseObject.refresh_token;
                        //sessionToken.tokenType = responseObject.token_type;

                        // var expireDate = new Date();
                        // expireDate.setSeconds(expireDate.getSeconds() + sessionToken.expiresIn);
                        //var expireSeconds = parseInt((expireDate.getTime() / 1000).toString());

                        sessionToken.expirationDate = new Date(responseObject.expires);
                        sessionToken.isAuthenticated = true;
                        sessionToken.isJwt = true;

                        deferred.resolve(sessionToken);
                    } else if (response.statusCode == 401 || response.statusCode == 403 || response.statusCode == 400) {
                        sessionToken.isAuthenticated = false;
                        logger.info("Authorization has been refused for current credentials." + response.body);
                        deferred.reject(new Error("Authorization has been refused for current credentials"));
                    } else {
                        sessionToken.isAuthenticated = false;
                        console.log("Unknown response for jwt");
                        deferred.reject(new Error("Unknown response for jwt"));
                    }
                }
            };

            var urlSecurity = baseUrl + authenticationUrl;

            console.log('authenticationUrl ' + urlSecurity);


            var options = { method: 'GET', uri: urlSecurity, qs: null, headers: headers };

            this.nodeJsRequest(options, function (error, response, body) {
                getTokenCallback(error, response, body);
            });

            return deferred.promise;
        };


        authorize.prototype.endsWith = function (source, suffix) {
            return source.indexOf(suffix, source.length - suffix.length) !== -1;
        };


        return authorize;
    })();
    vvRestApi.authorize = authorize;

    (function (common) {
        var httpHelper = (function () {

            function httpHelper(sessionToken, yamlConfig) {
                this.HTTP = require('http');
                this.jsyaml = require('js-yaml');
                this.nodeJsRequest = require('request');
                this.Q = require('q');

                this._sessionToken = sessionToken;
                this._config = yamlConfig;
            }

            httpHelper.prototype.doVvClientRequest = function (url, options, params, data, buffer) {
                var self = this;

                //If the token is within 30 seconds of expiration, refresh it
                if (this._sessionToken.expirationDate < new Date(new Date().getTime() + 30 * 1000)) {
                    console.log('In doVvClientRequest - accessToken has expired, calling __acquireRefreshToken');

                    return this.Q
                        .when(
                            self.__acquireRefreshToken()
                        )
                        .then(
                            function (result) {
                                console.log('In doVvClientRequest - return success from __acquireRefreshToken');
                                return self.__doVvClientCallRequest(url, options, params, data, buffer);
                            }
                        )
                        .fail(
                            function (result) {
                                console.log('In doVvClientRequest - return fail from __acquireRefreshToken');
                                throw new Error('Unable to optain Authorization, error: ' + result);
                            }
                        );
                } else {
                    return this.__doVvClientCallRequest(url, options, params, data, buffer);
                }
            };

            httpHelper.prototype.__doVvClientCallRequest = function (url, options, params, data, buffer) {
                var self = this;

                var deferred = this.Q.defer();

                var vvClientRequestCallback = function (error, response, responseData) {
                    if (error) {
                        console.log('In __doVvClientCallRequest - vvClientRequestCallback with error condition');
                        deferred.reject(new Error(error));
                    } else {
                        if (response.statusCode === 401 || response.statusCode === 403) {
                            self._sessionToken.isAuthenticated = false;

                            var errorData = JSON.parse(responseData);
                            deferred.reject(new Error(errorData.meta));
                        } else {
                            if (typeof responseData == "object" && responseData != null) {
                                //console.log('In vvClientRequestCallback with success: ' + JSON.stringify(responseData));
                            } else {
                                //console.log('In vvClientRequestCallback with success: ' + responseData);
                            }

                            deferred.resolve(responseData);
                        }
                    }
                };

                // stream callback
                var vvClientRequestCallbackStream = function (data, code, message) {
                    var sd = require('string_decoder');
                    var os = require('os');
                    var decoder = new sd.StringDecoder();
                    if (code == 200) {
                        deferred.resolve(data);
                    }
                    else {
                        deferred.reject(new Error('Response Code: ' + code + os.EOL + 'Response Message: ' + message + os.EOL + decoder.write(data)));
                    }
                };

                if (options.method === 'GET') {
                    this.httpGet(url, params, vvClientRequestCallback);
                } else if (options.method === 'GETSTREAM') {
                    this.httpGetStream(url, params, vvClientRequestCallbackStream);
                } else if (options.method === 'POST') {
                    this.httpPost(url, params, data, vvClientRequestCallback);
                } else if (options.method === 'POSTSTREAM') {
                    this.httpPostStream(url, params, data, buffer, vvClientRequestCallback)
                } else if (options.method === 'PUT') {
                    this.httpPut(url, params, data, vvClientRequestCallback);
                } else if (options.method === 'DELETE') {
                    this.httpDelete(url, params, vvClientRequestCallback);
                } else {
                    throw new Error('http request method name error');
                }

                return deferred.promise;
            };

            httpHelper.prototype.__makeRequest = function (url, options, requestCallback) {
                options.headers["Authorization"] = 'Bearer ' + this._sessionToken.accessToken;

                console.log("In __makeRequest - Performing request to url:" + url);

                this.nodeJsRequest(options,
                    function (error, response, body) {
                        requestCallback(error, response, body);
                    }
                );
            };

            // request for stream
            httpHelper.prototype.__makeStreamRequest = function (url, options, requestCallback) {
                options.headers["Authorization"] = 'Bearer ' + this._sessionToken.accessToken;
                options.headers["Content-Type"] = 'application/json; charset=utf-8';

                console.log("In __makeStreamRequest - Performing request to url:" + url);
                var fs = require('fs');
                var stream = require('stream');
                var bf = require('buffer');

                var Duplex = stream.Duplex;
                Duplex.Readable = this.nodeJsRequest(options);
                var bufs = [];

                Duplex.Readable.on('data', function (chunk) {
                    console.log('got %d bytes of data', chunk.length);
                    bufs.push(chunk);
                });

                Duplex.Readable.on('end', function () {
                    console.log('end of stream');
                    var buf = new bf.Buffer.concat(bufs);

                    if (Duplex.Readable.response) {
                        requestCallback(buf, Duplex.Readable.response.statusCode, Duplex.Readable.response.statusMessage);
                    } else {
                        var msg = 'Unexpected stream response termination';
                        requestCallback(buf, 500, msg);
                    }
                });
            };

            // request for post stream
            httpHelper.prototype.__makePostStreamRequest = function (url, options, buffer, requestCallback) {
                console.log("In __makeRequest - Performing request to url:" + url);
                var streamRequest = require('request');

                var headers = {
                    "Authorization": 'Bearer ' + this._sessionToken.accessToken,
                };

                var multipart = [];
                for (var key in options.json) {
                    if (options.json.hasOwnProperty(key)) {
                        var obj = {
                            'Content-Disposition': 'form-Data; name="' + key + '"',
                            body: options.json[key]
                        }
                        multipart.push(obj);
                    }
                }

                //Add file(s) to multipart data
                if (Buffer.isBuffer(buffer)) {
                    //Single file
                    var headers = {
                        "Authorization": 'Bearer ' + this._sessionToken.accessToken,
                    };
                    var filePart = {
                        'Content-Disposition': 'form-data; name="fileUpload"; filename="' + options.json.fileName + '"',
                        body: buffer,
                    }
                    multipart.push(filePart);
                } else if (Array.isArray(buffer)) {
                    //Multiple files - Expect an array of objects with a "buffer" and "filename" properties
                    for(var i=0; i < buffer.length; i++) {
                        var fileInfoObj = buffer[i];
                        if(Buffer.isBuffer(fileInfoObj.buffer)) {
                            var fileName = `file${i}`;
                            if(fileInfoObj.fileName) {
                                fileName = fileInfoObj.fileName;
                            }
                            var filePart = {
                                'Content-Disposition': 'form-data; name="fileUpload"; filename="' + fileName + '"',
                                body: fileInfoObj.buffer,
                            }
                            multipart.push(filePart);
                        } else {
                            throw new Error(`Invalid 'buffer' property found on fileObj at index ${i}`);
                        }
                    }
                }
                else {
                    throw new Error('Expecting Buffer');
                }

                //Make request
                streamRequest({
                    method: 'POST',
                    preambleCRLF: true,
                    postambleCRLF: true,
                    uri: url,
                    multipart: multipart,
                    headers: headers
                },
                    function (error, response, body) {
                        return requestCallback(error, response, body);
                    }
                );
            };

            httpHelper.prototype.request = function (httpVerb, url, params, data) {
                var options = { method: 'GET' };

                console.log("In __makeStreamRequest - Performing request to url:" + url);

                if (httpVerb.toLowerCase() === 'post') {
                    options.method = 'POST';
                } else if (httpVerb.toLowerCase() === 'put') {
                    options.method = 'PUT';
                } else if (httpVerb.toLowerCase() === 'delete') {
                    options.method = 'DELETE';
                }

                return this.doVvClientRequest(url, options, params, data);
            };

            httpHelper.prototype.httpGet = function (url, params, requestCallback) {
                var self = this;

                var headers = {};

                var options = { method: 'GET', uri: url, qs: params || {}, headers: headers, json: null };

                if (this._sessionToken.accessToken == null) {
                    this.__acquireNewTokenWithRequest(options, requestCallback);
                } else {
                    this.__makeRequest(url, options, requestCallback);
                }
            };

            httpHelper.prototype.httpGetStream = function (url, params, requestCallback) {
                var self = this;

                var headers = {};

                var options = { method: 'GET', uri: url, qs: params || {}, headers: headers, json: null };

                if (this._sessionToken.accessToken == null) {
                    this.__acquireNewTokenWithRequest(options, requestCallback);
                } else {
                    this.__makeStreamRequest(url, options, requestCallback);
                }
            };

            httpHelper.prototype.httpPostStream = function (url, params, data, buffer, requestCallback) {
                var self = this;
                var headers = {};
                var options = { method: 'POST', uri: url, qs: params || {}, json: data, headers: headers };

                if (this._sessionToken.accessToken == null) {
                    this.__acquireNewTokenWithRequest(options, requestCallback);
                } else {
                    this.__makePostStreamRequest(url, options, buffer, requestCallback);
                }
            };

            httpHelper.prototype.httpPost = function (url, params, data, requestCallback) {
                var self = this;

                var headers = {};

                var options = { method: 'POST', uri: url, qs: params || {}, json: data, headers: headers };

                if (this._sessionToken.accessToken == null) {
                    this.__acquireNewTokenWithRequest(options, requestCallback);
                } else {
                    this.__makeRequest(url, options, requestCallback);
                }
            };

            httpHelper.prototype.httpPut = function (url, params, data, requestCallback) {
                var self = this;

                var headers = {};

                var options = { method: 'PUT', uri: url, qs: params || {}, json: data, headers: headers };

                if (this._sessionToken.accessToken == null) {
                    this.__acquireNewTokenWithRequest(options, requestCallback);
                } else {
                    this.__makeRequest(url, options, requestCallback);
                }
            };

            httpHelper.prototype.httpDelete = function (url, params, requestCallback) {
                var self = this;

                var headers = {};

                var options = { method: 'DELETE', uri: url, qs: params || {}, json: null, headers: headers };

                if (this._sessionToken.accessToken == null) {
                    this.__acquireNewTokenWithRequest(options, requestCallback);
                } else {
                    this.__makeRequest(url, options, requestCallback);
                }
            };

            httpHelper.prototype.__acquireNewTokenWithRequest = function (options, requestCallback) {
                var attemptCount = 0;
                this._sessionToken.isAuthenticated = false;

                var vvAuthorize = new vvRestApi.authorize();

                this.Q
                    .when(
                        vvAuthorize.reacquireSecurityToken(this._sessionToken)
                    )
                    .then(
                        function (result) {

                            options.headers["Authorization"] = 'Bearer ' + this._sessionToken.accessToken;

                            this.nodeJsRequest(options, function (error, response, body) {
                                requestCallback(error, response, body);
                            }
                            );
                        }
                    )
                    .fail(
                        function (tokenError) {
                            vvAuthorize.acquireSecurityToken(this._sessionToken)
                        }
                    );
            };

            httpHelper.prototype.__acquireRefreshToken = function () {
                var attemptCount = 0;
                this._sessionToken.isAuthenticated = false;

                var deferred = this.Q.defer();

                var vvAuthorize = new vvRestApi.authorize();

                this.Q
                    .when(
                        vvAuthorize.acquireRefreshToken(this._sessionToken)
                    )
                    .then(
                        function (result) {
                            deferred.resolve();
                        }
                    )
                    .fail(
                        function (result) {
                            this.Q
                                .when(
                                    vvAuthorize.reacquireSecurityToken(this._sessionToken)
                                )
                                .then(
                                    deferred.resolve(result)
                                )
                                .fail(
                                    deferred.reject(result)
                                );
                        }
                    );

                return deferred.promise;
            };

            httpHelper.prototype.__recursiveAttemptAcquireToken = function (options, requestCallback, attemptCount) {
                var vvAuthorize = new vvRestApi.authorize();

                this.Q
                    .when(
                        vvAuthorize.reacquireSecurityToken(this._sessionToken))
                    .then(function (result) {
                        var sessionToken = result;

                        options.headers["Authorization"] = 'Bearer ' + this._sessionToken.accessToken;

                        this.nodeJsRequest(options, function (error, response, body) {
                            requestCallback(error, response, body);
                        });
                    })
                    .fail(function (tokenError) {
                        if (attemptCount < 6) {
                            attemptCount++;
                            this.__recursiveAttemptAcquireToken(options, requestCallback, attemptCount);
                        }
                    });
            };

            httpHelper.prototype.getUrl = function (resourceUrl) {
                return this._sessionToken.baseUrl + this._sessionToken.apiUrl + resourceUrl;
            };

            return httpHelper;
        })();
        common.httpHelper = httpHelper;

        var sessionToken = (function () {
            function sessionToken() {
                this.isAuthenticated = false;
                this.apiUrl = null;
                this.baseUrl = null;
                this.authenticationUrl = null;
                this.customerAlias = null;
                this.databaseAlias = null;
                this.expirationDate = null;
                this.accessToken = null
                this.tokenType = null;
                this.refreshToken = null;
                this.expiresIn = 0;
                this.clientId = null;
                this.clientSecret = null;
                this.userId = null;
                this.password = null;
            }
            return sessionToken;
        })();
        common.sessionToken = sessionToken;

        (function (services) {
            var apiServiceCoreSettings = (function () {
                function apiServiceCoreSettings() {
                    this.VERSION = 'v1.0.0';
                    this.ServiceInterface = {};
                    this.Signers = {};
                    this.XML = {};

                    this.util = new vvRestApi.common.services.serviceCoreUtility(this);
                }
                return apiServiceCoreSettings;
            })();
            services.apiServiceCoreSettings = apiServiceCoreSettings;

            var base64Helper = (function () {
                function base64Helper(serviceCoreUtil) {
                    this._serviceCoreUtil = serviceCoreUtil;
                }
                base64Helper.prototype.encode = function (string) {
                    return new Buffer(string).toString('base64', null, null);
                };

                base64Helper.prototype.decode = function (string) {
                    return new Buffer(string, 'base64').toString(null, null, null);
                };
                return base64Helper;
            })();
            services.base64Helper = base64Helper;

            var bufferHelper = (function () {
                function bufferHelper(serviceCoreUtil) {
                    this._serviceCoreUtil = serviceCoreUtil;
                }
                bufferHelper.prototype.concat = function (buffers) {
                    var length = 0, offset = 0, buffer = null, i;

                    for (i = 0; i < buffers.length; i++) {
                        length += buffers[i].length;
                    }

                    buffer = new Buffer(length);

                    for (i = 0; i < buffers.length; i++) {
                        buffers[i].copy(buffer, offset);
                        offset += buffers[i].length;
                    }

                    return buffer;
                };
                return bufferHelper;
            })();
            services.bufferHelper = bufferHelper;

            var cryptoHelper = (function () {
                function cryptoHelper(serviceCoreUtil) {
                    this.crc32Table = [
                        0x00000000,
                        0x77073096,
                        0xEE0E612C,
                        0x990951BA,
                        0x076DC419,
                        0x706AF48F,
                        0xE963A535,
                        0x9E6495A3,
                        0x0EDB8832,
                        0x79DCB8A4,
                        0xE0D5E91E,
                        0x97D2D988,
                        0x09B64C2B,
                        0x7EB17CBD,
                        0xE7B82D07,
                        0x90BF1D91,
                        0x1DB71064,
                        0x6AB020F2,
                        0xF3B97148,
                        0x84BE41DE,
                        0x1ADAD47D,
                        0x6DDDE4EB,
                        0xF4D4B551,
                        0x83D385C7,
                        0x136C9856,
                        0x646BA8C0,
                        0xFD62F97A,
                        0x8A65C9EC,
                        0x14015C4F,
                        0x63066CD9,
                        0xFA0F3D63,
                        0x8D080DF5,
                        0x3B6E20C8,
                        0x4C69105E,
                        0xD56041E4,
                        0xA2677172,
                        0x3C03E4D1,
                        0x4B04D447,
                        0xD20D85FD,
                        0xA50AB56B,
                        0x35B5A8FA,
                        0x42B2986C,
                        0xDBBBC9D6,
                        0xACBCF940,
                        0x32D86CE3,
                        0x45DF5C75,
                        0xDCD60DCF,
                        0xABD13D59,
                        0x26D930AC,
                        0x51DE003A,
                        0xC8D75180,
                        0xBFD06116,
                        0x21B4F4B5,
                        0x56B3C423,
                        0xCFBA9599,
                        0xB8BDA50F,
                        0x2802B89E,
                        0x5F058808,
                        0xC60CD9B2,
                        0xB10BE924,
                        0x2F6F7C87,
                        0x58684C11,
                        0xC1611DAB,
                        0xB6662D3D,
                        0x76DC4190,
                        0x01DB7106,
                        0x98D220BC,
                        0xEFD5102A,
                        0x71B18589,
                        0x06B6B51F,
                        0x9FBFE4A5,
                        0xE8B8D433,
                        0x7807C9A2,
                        0x0F00F934,
                        0x9609A88E,
                        0xE10E9818,
                        0x7F6A0DBB,
                        0x086D3D2D,
                        0x91646C97,
                        0xE6635C01,
                        0x6B6B51F4,
                        0x1C6C6162,
                        0x856530D8,
                        0xF262004E,
                        0x6C0695ED,
                        0x1B01A57B,
                        0x8208F4C1,
                        0xF50FC457,
                        0x65B0D9C6,
                        0x12B7E950,
                        0x8BBEB8EA,
                        0xFCB9887C,
                        0x62DD1DDF,
                        0x15DA2D49,
                        0x8CD37CF3,
                        0xFBD44C65,
                        0x4DB26158,
                        0x3AB551CE,
                        0xA3BC0074,
                        0xD4BB30E2,
                        0x4ADFA541,
                        0x3DD895D7,
                        0xA4D1C46D,
                        0xD3D6F4FB,
                        0x4369E96A,
                        0x346ED9FC,
                        0xAD678846,
                        0xDA60B8D0,
                        0x44042D73,
                        0x33031DE5,
                        0xAA0A4C5F,
                        0xDD0D7CC9,
                        0x5005713C,
                        0x270241AA,
                        0xBE0B1010,
                        0xC90C2086,
                        0x5768B525,
                        0x206F85B3,
                        0xB966D409,
                        0xCE61E49F,
                        0x5EDEF90E,
                        0x29D9C998,
                        0xB0D09822,
                        0xC7D7A8B4,
                        0x59B33D17,
                        0x2EB40D81,
                        0xB7BD5C3B,
                        0xC0BA6CAD,
                        0xEDB88320,
                        0x9ABFB3B6,
                        0x03B6E20C,
                        0x74B1D29A,
                        0xEAD54739,
                        0x9DD277AF,
                        0x04DB2615,
                        0x73DC1683,
                        0xE3630B12,
                        0x94643B84,
                        0x0D6D6A3E,
                        0x7A6A5AA8,
                        0xE40ECF0B,
                        0x9309FF9D,
                        0x0A00AE27,
                        0x7D079EB1,
                        0xF00F9344,
                        0x8708A3D2,
                        0x1E01F268,
                        0x6906C2FE,
                        0xF762575D,
                        0x806567CB,
                        0x196C3671,
                        0x6E6B06E7,
                        0xFED41B76,
                        0x89D32BE0,
                        0x10DA7A5A,
                        0x67DD4ACC,
                        0xF9B9DF6F,
                        0x8EBEEFF9,
                        0x17B7BE43,
                        0x60B08ED5,
                        0xD6D6A3E8,
                        0xA1D1937E,
                        0x38D8C2C4,
                        0x4FDFF252,
                        0xD1BB67F1,
                        0xA6BC5767,
                        0x3FB506DD,
                        0x48B2364B,
                        0xD80D2BDA,
                        0xAF0A1B4C,
                        0x36034AF6,
                        0x41047A60,
                        0xDF60EFC3,
                        0xA867DF55,
                        0x316E8EEF,
                        0x4669BE79,
                        0xCB61B38C,
                        0xBC66831A,
                        0x256FD2A0,
                        0x5268E236,
                        0xCC0C7795,
                        0xBB0B4703,
                        0x220216B9,
                        0x5505262F,
                        0xC5BA3BBE,
                        0xB2BD0B28,
                        0x2BB45A92,
                        0x5CB36A04,
                        0xC2D7FFA7,
                        0xB5D0CF31,
                        0x2CD99E8B,
                        0x5BDEAE1D,
                        0x9B64C2B0,
                        0xEC63F226,
                        0x756AA39C,
                        0x026D930A,
                        0x9C0906A9,
                        0xEB0E363F,
                        0x72076785,
                        0x05005713,
                        0x95BF4A82,
                        0xE2B87A14,
                        0x7BB12BAE,
                        0x0CB61B38,
                        0x92D28E9B,
                        0xE5D5BE0D,
                        0x7CDCEFB7,
                        0x0BDBDF21,
                        0x86D3D2D4,
                        0xF1D4E242,
                        0x68DDB3F8,
                        0x1FDA836E,
                        0x81BE16CD,
                        0xF6B9265B,
                        0x6FB077E1,
                        0x18B74777,
                        0x88085AE6,
                        0xFF0F6A70,
                        0x66063BCA,
                        0x11010B5C,
                        0x8F659EFF,
                        0xF862AE69,
                        0x616BFFD3,
                        0x166CCF45,
                        0xA00AE278,
                        0xD70DD2EE,
                        0x4E048354,
                        0x3903B3C2,
                        0xA7672661,
                        0xD06016F7,
                        0x4969474D,
                        0x3E6E77DB,
                        0xAED16A4A,
                        0xD9D65ADC,
                        0x40DF0B66,
                        0x37D83BF0,
                        0xA9BCAE53,
                        0xDEBB9EC5,
                        0x47B2CF7F,
                        0x30B5FFE9,
                        0xBDBDF21C,
                        0xCABAC28A,
                        0x53B39330,
                        0x24B4A3A6,
                        0xBAD03605,
                        0xCDD70693,
                        0x54DE5729,
                        0x23D967BF,
                        0xB3667A2E,
                        0xC4614AB8,
                        0x5D681B02,
                        0x2A6F2B94,
                        0xB40BBE37,
                        0xC30C8EA1,
                        0x5A05DF1B,
                        0x2D02EF8D
                    ];
                    this._serviceCoreUtil = serviceCoreUtil;
                    this.cryptoLib = require('crypto');
                }
                cryptoHelper.prototype.crc32 = function (data) {
                    var tbl = this.crc32Table;
                    var crc = 0 ^ -1;

                    if (typeof data === 'string') {
                        data = new Buffer(data);
                    }

                    for (var i = 0; i < data.length; i++) {
                        crc = (crc >>> 8) ^ tbl[(crc ^ data[i]) & 0xFF];
                    }
                    return (crc ^ -1) >>> 0;
                };

                cryptoHelper.prototype.hmac = function (key, string, digest, fn) {
                    if (!digest)
                        digest = 'binary';
                    if (!fn)
                        fn = 'sha256';
                    return this.cryptoLib.createHmac(fn, key).update(string).digest(digest);
                };

                cryptoHelper.prototype.md5 = function (data, digest) {
                    if (!digest) {
                        digest = 'binary';
                    }
                    if (typeof data === 'string')
                        data = new Buffer(data);
                    return this.createHash('md5').update(data).digest(digest);
                };

                cryptoHelper.prototype.sha256 = function (string, digest) {
                    if (!digest) {
                        digest = 'binary';
                    }
                    if (typeof string === 'string')
                        string = new Buffer(string);
                    return this.createHash('sha256').update(string).digest(digest);
                };

                cryptoHelper.prototype.toHex = function (data) {
                    var out = [];
                    for (var i = 0; i < data.length; i++) {
                        out.push(('0' + data.charCodeAt(i).toString(16)).substr(-2, 2));
                    }
                    return out.join('');
                };

                cryptoHelper.prototype.createHash = function (algorithm) {
                    return this.cryptoLib.createHash(algorithm);
                };
                return cryptoHelper;
            })();
            services.cryptoHelper = cryptoHelper;

            var dateHelper = (function () {
                function dateHelper(serviceCoreUtil) {
                    this._serviceCoreUtil = serviceCoreUtil;
                }
                dateHelper.prototype.getDate = function () {
                    return new Date();
                };

                dateHelper.prototype.iso8601 = function (date) {
                    if (date === undefined) {
                        date = this.getDate();
                    }
                    return date.toISOString();
                };

                dateHelper.prototype.rfc822 = function (date) {
                    if (date === undefined) {
                        date = this.getDate();
                    }
                    return date.toUTCString();
                };

                dateHelper.prototype.unixTimestamp = function (date) {
                    if (date === undefined) {
                        date = this.getDate();
                    }
                    return date.getTime() / 1000;
                };

                dateHelper.prototype.from = function (date) {
                    if (typeof date === 'number') {
                        return new Date(date * 1000);
                    } else {
                        return new Date(date);
                    }
                };

                dateHelper.prototype.format = function (date, formatter) {
                    if (!formatter)
                        formatter = 'iso8601';
                    return this[formatter](this.from(date));
                };
                return dateHelper;
            })();
            services.dateHelper = dateHelper;

            var endpoint = (function () {
                function endpoint(endpoint, util) {
                    if (typeof endpoint === 'undefined' || endpoint === null) {
                        throw new Error('Invalid endpoint: ' + endpoint);
                    } else if (typeof endpoint !== 'string') {
                        return util.copy(endpoint);
                    }

                    util.update(this, util.urlParse(endpoint));

                    if (this.port) {
                        this.port = parseInt(this.port.toString(), 10);
                    } else {
                        this.port = this.protocol === 'https:' ? 443 : 80;
                    }
                }
                return endpoint;
            })();
            services.endpoint = endpoint;

            var httpRequest = (function () {
                function httpRequest(currentEndpoint, region, method, currentHeaders, data, util) {
                    currentEndpoint = new vvRestApi.common.services.endpoint(currentEndpoint, util);
                    this.method = method.toUpperCase();
                    this.path = currentEndpoint.path || '/';
                    this.headers = {};
                    for (var headerName in currentHeaders) {
                        this.headers[headerName] = currentHeaders[headerName];
                    }

                    var jsonData = '';

                    if (typeof data == "object" && data != null) {
                        jsonData = JSON.stringify(data);

                        this.body = jsonData || '';
                    } else {
                        this.body = data || '';
                    }

                    this.endpoint = currentEndpoint;
                    this.region = region;
                }
                httpRequest.prototype.pathname = function () {
                    return this.path.split('?', 1)[0];
                };

                httpRequest.prototype.search = function () {
                    return this.path.split('?', 2)[1] || '';
                };
                return httpRequest;
            })();
            services.httpRequest = httpRequest;

            var serviceCoreUtility = (function () {
                function serviceCoreUtility(apiServiceCoreSettings) {
                    this.abort = {};
                    this.serviceCoreSettings = apiServiceCoreSettings;
                    this.base64 = new base64Helper(this);
                    this.buffer = new bufferHelper(this);
                    this.string = new stringHelper(this);
                    this.date = new dateHelper(this);
                    this.crypto = new cryptoHelper(this);
                }
                serviceCoreUtility.prototype.engine = function () {
                    return process.platform + '/' + process.version;
                };

                serviceCoreUtility.prototype.userAgent = function () {
                    return 'vvclient-nodejs/' + this.serviceCoreSettings.VERSION + ' ' + this.engine();
                };

                serviceCoreUtility.prototype.uriEscape = function (inputString) {
                    var output = encodeURIComponent(inputString);
                    output = output.replace(/[^A-Za-z0-9_.~\-%]+/g, escape);

                    output = output.replace(/[*]/g, function (ch) {
                        return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
                    });

                    return output;
                };

                serviceCoreUtility.prototype.uriEscapePath = function (inputString) {
                    var parts = [];
                    this.arrayEach(inputString.split('/'), function (part) {
                        parts.push(this.uriEscape(part));
                    });
                    return parts.join('/');
                };

                serviceCoreUtility.prototype.urlParse = function (url) {
                    return require('url').parse(url);
                };

                serviceCoreUtility.prototype.queryParamsToString = function (params) {
                    var items = [];
                    var escape = this.serviceCoreSettings.util.uriEscape;
                    var sortedKeys = Object.keys(params).sort();

                    this.serviceCoreSettings.util.arrayEach(sortedKeys, function (name) {
                        var value = params[name];
                        var ename = escape(name);
                        var result = ename;
                        if (Array.isArray(value)) {
                            var vals = [];
                            this.serviceCoreSettings.util.arrayEach(value, function (item) {
                                vals.push(escape(item));
                            });
                            result = ename + '=' + vals.sort().join('&' + ename + '=');
                        } else if (value !== undefined && value !== null) {
                            result = ename + '=' + escape(value);
                        }
                        items.push(result);
                    });

                    return items.join('&');
                };

                serviceCoreUtility.prototype.readFileSync = function (path) {
                    return require('fs').readFileSync(path, 'utf-8');
                };

                serviceCoreUtility.prototype.each = function (object, iterFunction) {
                    for (var key in object) {
                        if (object.hasOwnProperty(key)) {
                            var ret = iterFunction.call(this, key, object[key]);
                            if (ret === this.abort)
                                break;
                        }
                    }
                };

                serviceCoreUtility.prototype.arrayEach = function (array, iterFunction) {
                    for (var idx in array) {
                        if (array.hasOwnProperty(idx)) {
                            var ret = iterFunction.call(this, array[idx], parseInt(idx, 10));
                            if (ret === this.abort)
                                break;
                        }
                    }
                };

                serviceCoreUtility.prototype.update = function (obj1, obj2) {
                    this.serviceCoreSettings.util.each(obj2, function iterator(key, item) {
                        obj1[key] = item;
                    });
                    return obj1;
                };

                serviceCoreUtility.prototype.merge = function (obj1, obj2) {
                    return this.update(this.copy(obj1), obj2);
                };

                serviceCoreUtility.prototype.copy = function (object) {
                    if (object === null || object === undefined)
                        return object;
                    var dupe = {};

                    for (var key in object) {
                        dupe[key] = object[key];
                    }
                    return dupe;
                };

                serviceCoreUtility.prototype.isEmpty = function (obj) {
                    for (var prop in obj) {
                        if (obj.hasOwnProperty(prop)) {
                            return false;
                        }
                    }
                    return true;
                };

                serviceCoreUtility.prototype.isType = function (obj, type) {
                    if (typeof type === 'function')
                        type = type.name;
                    return Object.prototype.toString.call(obj) === '[object ' + type + ']';
                };

                serviceCoreUtility.prototype.error = function (err, options) {
                    err.message = err.message || null;

                    if (typeof options === 'string') {
                        err.message = options;
                    } else {
                        this.update(err, options);
                    }

                    err.name = err.code || 'Error';
                    return err;
                };

                serviceCoreUtility.prototype.inherit = function (klass, features) {
                    var newObject = null;
                    if (features === undefined) {
                        features = klass;
                        klass = Object;
                        newObject = {};
                    } else {
                        var ctor = function __ctor_wrapper__() {
                        };
                        ctor.prototype = klass.prototype;
                        newObject = new ctor();
                    }

                    if (features.constructor === Object) {
                        features.constructor = function () {
                            if (klass !== Object) {
                                return klass.apply(this, arguments);
                            }
                        };
                    }

                    features.constructor.prototype = newObject;
                    this.serviceCoreSettings.util.update(features.constructor.prototype, features);
                    features.constructor.__super__ = klass;
                    return features.constructor;
                };

                serviceCoreUtility.prototype.mixin = function () {
                    var klass = arguments[0];
                    for (var i = 1; i < arguments.length; i++) {
                        for (var prop in arguments[i].prototype) {
                            var fn = arguments[i].prototype[prop];
                            if (prop != 'constructor') {
                                klass.prototype[prop] = fn;
                            }
                        }
                    }
                    return klass;
                };
                return serviceCoreUtility;
            })();
            services.serviceCoreUtility = serviceCoreUtility;

            var stringHelper = (function () {
                function stringHelper(serviceCoreUtil) {
                    this._serviceCoreUtil = serviceCoreUtil;
                }
                stringHelper.prototype.byteLength = function (str) {
                    if (str === null || str === undefined)
                        return 0;
                    if (typeof str === 'string')
                        str = new Buffer(str);

                    if (str.length !== undefined) {
                        return str.length;
                    } else if (typeof (str.path) === 'string') {
                        return require('fs').lstatSync(str.path).size;
                    } else {
                        throw this._serviceCoreUtil.error(new Error(), {
                            message: 'Cannot determine length of ' + str,
                            object: str
                        });
                    }
                };
                return stringHelper;
            })();
            services.stringHelper = stringHelper;

        })(common.services || (common.services = {}));
        var services = common.services;

    })(vvRestApi.common || (vvRestApi.common = {}));
    var common = vvRestApi.common;

    (function (constants) {
        var constantsInitializer = (function () {
            function constantsInitializer() {

            }

            constantsInitializer.prototype.alertEventIds = {
                //Folder Events
                folderSecurityModified: "F06FD123-2C52-4F43-9122-34335A5BD8C6",         //"CategorySecurity"
                childFolderSecurityModified: "30167D46-86CF-4E89-B1AE-FC00BB378F67",    //"CategorySecurityCascade"
                folderDocumentAdded: "3702CFBF-555C-4032-BFB2-E25829788BAC",            //"NewCategoryDoc"
                childFolderDocumentAdded: "28946E3C-AEAF-402B-BCE3-8DEAC3D19877",       //"NewCategoryDocCascade"

                //Document Events
                documentCheckedIn: "D47804AB-AEE9-4002-BAB5-9F1AC0366076",          //"CheckIn"
                documentCheckedOut: "4BBA55C1-7AF6-48FF-BFBE-EC7A58EB7F01",         //"CheckOut"
                documentDetailsModified: "3B9D493F-2B45-4877-ABC1-5CA74F92723D",    //"DocumentDetails"
                documentSecurityModified: "BAC187DC-78A8-4A8B-B50F-DB5D5AEE11B9",   //"DocumentSecurity"
                documentViewed: "140B9E97-8D93-48D0-837B-AB4FD419B6D6",             //"DocumentViewed"

                //Project Events
                projectDocumentAddedOrRemoved: "300DB724-5C51-4C38-B2E2-FFE19634A373",      //"NewProjectDoc"
                projectViewed: "92F0C5F4-68DC-4309-9ABF-13B8E2198F79"                       //"ProjectView"
            }

            constantsInitializer.prototype.securityRoles = {
                //RoleType
                Owner: "Owner",
                Editor: "Editor",
                Viewer: "Viewer"
            }

            constantsInitializer.prototype.securityMemberType = {
                //MemberType
                User: "User",
                Group: "Group"
            }

            return constantsInitializer;
        })();

        constants.constantsInitializer = constantsInitializer;
    })(vvRestApi.constants || (vvRestApi.constants = {}))
    var constants = vvRestApi.constants;

    (function (email) {
        var emailManager = (function () {
            function emailManager(httpHelper) {
                this._httpHelper = httpHelper;
            }
            emailManager.prototype.postEmails = function (params, data) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.Emails);

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };
            emailManager.prototype.postEmailsWithAttachments = function (params, data, fileObjs) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.Emails);

                var opts = { method: 'POSTSTREAM' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data, fileObjs);
            };
            return emailManager;
        })();

        email.emailManager = emailManager;
    })(vvRestApi.email || (vvRestApi.email = {}));
    var email = vvRestApi.email;

    (function (forms) {

        var returnField = (function () {
            function returnField(id, name, value, isError, errorMessage) {
                this.id = id;
                this.name = name;
                this.value = value;
                this.isError = isError;
                this.errorMessage = errorMessage;
            }
            return returnField;
        })();
        forms.returnField = returnField;




        var formFieldCollection = (function () {
            function formFieldCollection(ffColl) {
                this._ffColl = ffColl;
            }

            formFieldCollection.prototype.getFormFieldByName = function (name) {
                var fieldName = name.toLowerCase();
                var field = null;

                for (var i = 0; i < this._ffColl.length; i++) {
                    if (this._ffColl[i].name.toLowerCase() == fieldName) {
                        field = this._ffColl[i];
                        break;
                    }
                }

                return field;
            };

            formFieldCollection.prototype.getFormFieldById = function (id) {
                var fieldId = id.toLowerCase();
                var field = null;

                for (var i = 0; i < this._ffColl.length; i++) {
                    if (this._ffColl[i].id.toLowerCase() == fieldId) {
                        field = this._ffColl[i];
                        break;
                    }
                }

                return field;
            };

            formFieldCollection.prototype.getFieldArray = function () {
                return this._ffColl;
            };

            return formFieldCollection;
        })();
        forms.formFieldCollection = formFieldCollection;

        var formsManager = (function () {
            function formsManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            formsManager.prototype.returnField = function (id, name, value, isError, errorMessage) {
                this.id = id;
                this.name = name;
                this.value = value;
                this.isError = isError;
                this.errorMessage = errorMessage;
            };

            formsManager.prototype.getFormTemplates = function (params) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FormTemplates);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            formsManager.prototype.getFormTemplateIdByName = function (templateName) {
                //return released form template id by name
                var deferred = Q.defer();

                var params = {};
                params.fields = "id, name, description, revision";
                params.q = "name eq '" + templateName + "'";

                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FormTemplates);
                var opts = { method: 'GET' };
                var templateId;

                var fm = this;

                this._httpHelper.doVvClientRequest(url, opts, params, null).then(function (resp) {
                    var templateResp = JSON.parse(resp);
                    if (templateResp.data.length > 0) {
                        templateId = templateResp['data'][0]['id'];
                    }

                    var responseData = {};
                    responseData.formsManager = fm;
                    responseData.templateIdGuid = templateId;

                    deferred.resolve(responseData);

                }).fail(function (error) {
                    logger.info("failed getting Form Template Id by Name " + error);

                    var responseData = {};
                    responseData.formsManager = fm;
                    responseData.templateIdGuid = '';

                    deferred.resolve(responseData);
                });

                return deferred.promise;
            };

            formsManager.prototype.getForms = function (params, formTemplateId) {
                var deferred = Q.defer();

                //if formTemplateId is not a Guid assume its a template name and fetch the Guid
                if (!this.isGuid(formTemplateId)) {
                    deferred.resolve(this.getFormTemplateIdByName(formTemplateId).then(function (resp) {
                        var formsManager = resp.formsManager;
                        var templateIdGuid = resp.templateIdGuid;
                        var resourceUri = formsManager._httpHelper._config.ResourceUri.Forms.replace('{id}', templateIdGuid);
                        var url = formsManager._httpHelper.getUrl(resourceUri);
                        var opts = { method: 'GET' };

                        return formsManager._httpHelper.doVvClientRequest(url, opts, params, null);
                    }));
                } else {
                    var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                    var url = this._httpHelper.getUrl(resourceUri);
                    var opts = { method: 'GET' };

                    deferred.resolve(this._httpHelper.doVvClientRequest(url, opts, params, null));
                }

                return deferred.promise;
            };

            formsManager.prototype.postForms = function (params, data, formTemplateId) {
                // var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                // var url = this._httpHelper.getUrl(resourceUri);
                // var opts = { method: 'POST' };
                // return this._httpHelper.doVvClientRequest(url, opts, params, data);

                var deferred = Q.defer();

                //if formTemplateId is not a Guid assume its a template name and fetch the Guid
                if (!this.isGuid(formTemplateId)) {
                    deferred.resolve(this.getFormTemplateIdByName(formTemplateId).then(function (resp) {
                        var formsManager = resp.formsManager;
                        var templateIdGuid = resp.templateIdGuid;
                        var resourceUri = formsManager._httpHelper._config.ResourceUri.Forms.replace('{id}', templateIdGuid);
                        var url = formsManager._httpHelper.getUrl(resourceUri);
                        var opts = { method: 'POST' };

                        return formsManager._httpHelper.doVvClientRequest(url, opts, params, data);
                    }));
                } else {
                    var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                    var url = this._httpHelper.getUrl(resourceUri);
                    var opts = { method: 'POST' };

                    deferred.resolve(this._httpHelper.doVvClientRequest(url, opts, params, data));
                }

                return deferred.promise;


            };

            formsManager.prototype.postFormRevision = function (params, data, formTemplateId, formId) {
                // var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                // var url = this._httpHelper.getUrl(resourceUri + '/' + formId);
                // var opts = { method: 'POST' };
                // return this._httpHelper.doVvClientRequest(url, opts, params, data);

                var deferred = Q.defer();

                //if formTemplateId is not a Guid assume its a template name and fetch the Guid
                if (!this.isGuid(formTemplateId)) {
                    deferred.resolve(this.getFormTemplateIdByName(formTemplateId).then(function (resp) {

                        var formsManager = resp.formsManager;
                        var templateIdGuid = resp.templateIdGuid;
                        var resourceUri = formsManager._httpHelper._config.ResourceUri.Forms.replace('{id}', templateIdGuid);
                        var url = formsManager._httpHelper.getUrl(resourceUri + '/' + formId);
                        var opts = { method: 'POST' };

                        return formsManager._httpHelper.doVvClientRequest(url, opts, params, data);
                    }));
                } else {
                    var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                    var url = this._httpHelper.getUrl(resourceUri + '/' + formId);
                    var opts = { method: 'POST' };

                    deferred.resolve(this._httpHelper.doVvClientRequest(url, opts, params, data));
                }

                return deferred.promise;
            };

            formsManager.prototype.postFormRevisionByFormId = function (params, data, formId) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FormsId).replace('{id}', formId);

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            }

            formsManager.prototype.relateForm = function (formId, relateToId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/relateForm');

                var params = { relateToId: relateToId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.relateFormByDocId = function (formId, relateToDocId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/relateForm');

                var params = { relateToDocId: relateToDocId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.relateDocument = function (formId, relateToId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/relateDocument');

                var params = { relateToId: relateToId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.relateDocumentByDocId = function (formId, relateToDocId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/relateDocument');

                var params = { relateToDocId: relateToDocId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.relateProject = function (formId, relateToId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/relateProject');

                var params = { relateToId: relateToId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.relateProjectByName = function (formId, relateToProjectName) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/relateProject');

                var params = { relateToProjectName: relateToProjectName };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.unrelateForm = function (formId, relateToId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/unrelateForm');

                var params = { relateToId: relateToId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.unrelateFormByDocId = function (formId, relateToDocId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/unrelateForm');

                var params = { relateToDocId: relateToDocId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.unrelateDocument = function (formId, relateToId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/unrelateDocument');

                var params = { relateToId: relateToId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.unrelateDocumentByDocId = function (formId, relateToDocId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/unrelateDocument');

                var params = { relateToDocId: relateToDocId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.unrelateProject = function (formId, relateToId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/unrelateProject');

                var params = { relateToId: relateToId };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.unrelateProjectByName = function (formId, relateToProjectName) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri + '/unrelateProject');

                var params = { relateToProjectName: relateToProjectName };
                var data = null;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            formsManager.prototype.getFormRelatedDocs = function (formId, params) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstanceRelatedDocs.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                if (params === undefined) {
                    params = null;
                }

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            formsManager.prototype.getFormRelatedForms = function (formId, params) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstanceRelatedForms.replace('{id}', formId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                if (params === undefined) {
                    params = null;
                }

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            formsManager.prototype.isGuid = function (stringToTest) {
                if (stringToTest[0] === "{") {
                    stringToTest = stringToTest.substring(1, stringToTest.length - 1);
                }
                var regexGuid = /^(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}$/gi;
                return regexGuid.test(stringToTest);
            }

            formsManager.prototype.getFormInstanceById = function (templateId, instanceId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormId.replace('{id}', templateId).replace('{formId}', instanceId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, null, null);
            };

            formsManager.prototype.getFormInstancePDF = function (templateId, instanceId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormIdPdf.replace('{id}', templateId).replace('{formId}', instanceId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GETSTREAM' };

                return this._httpHelper.doVvClientRequest(url, opts, null, null);
            };

            formsManager.prototype.getFormTemplateFields = function(templateId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FormDesignerFormsTemplatesIdFields.replace('{id}', templateId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, null, null);
            }

            formsManager.prototype.deleteFormInstance = function(instanceId){
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstance.replace('{id}', instanceId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };

                return this._httpHelper.doVvClientRequest(url, opts, null, null);
            }

            return formsManager;
        })();
        forms.formsManager = formsManager;

    })(vvRestApi.forms || (vvRestApi.forms = {}));
    var forms = vvRestApi.forms;

    (function (groups) {
        var groupsManager = (function () {
            function groupsManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            groupsManager.prototype.getGroups = function (params) {
                var resourceUri = this._httpHelper._config.ResourceUri.GetGroups;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            groupsManager.prototype.getGroupsUsers = function (params, groupId) {
                var resourceUri = this._httpHelper._config.ResourceUri.GroupsUsers.replace('{id}', groupId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            groupsManager.prototype.getGroupUser = function (params, groupId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.GroupsAddUser.replace('{groupId}', groupId).replace('{userId}', userId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            groupsManager.prototype.addUserToGroup = function (params, groupId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.GroupsAddUser.replace('{groupId}', groupId).replace('{userId}', userId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            groupsManager.prototype.removeUserFromGroup = function (params, groupId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.GroupsAddUser.replace('{groupId}', groupId).replace('{userId}', userId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            return groupsManager;
        })();
        groups.groupsManager = groupsManager;
    })(vvRestApi.groups || (vvRestApi.groups = {}));
    var groups = vvRestApi.groups;

    (function (library) {
        var libraryManager = (function () {
            function libraryManager(httpHelper) {
                this._httpHelper = httpHelper;
            }
            libraryManager.prototype.getFolders = function (params) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.Folders);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            libraryManager.prototype.postFolderByPath = function (params, data, folderPath) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.Folders);

                data.folderpath = folderPath;
                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            //Valid fields to be defined on the "data" parameter to be updated on the folder: name, description
            libraryManager.prototype.putFolder = function (params, data, folderId) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FoldersId.replace('{id}', folderId));

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            }

            libraryManager.prototype.copyFolder = function (params, data) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FoldersCopy);

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, null, data);
            }

            libraryManager.prototype.moveFolder = function (params, data) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FoldersMove);

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, null, data);
            }

            libraryManager.prototype.getDocuments = function (params, folderId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Documents.replace('{id}', folderId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            libraryManager.prototype.getFolderIndexFields = function (params, folderId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FolderIndexFields.replace('{id}', folderId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            libraryManager.prototype.postFolderAlertSubscription = function (folderId, eventId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FolderAlertsId.replace('{folderId}', folderId).replace('{eventId}', eventId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };

                var params = {
                    usId: userId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            libraryManager.prototype.deleteFolderAlertSubscription = function (folderId, eventId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FolderAlertsId.replace('{folderId}', folderId).replace('{eventId}', eventId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };

                var params = {
                    usId: userId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            libraryManager.prototype.getFolderSecurityMembers = function (params, folderId) {
                var resourceUri = this._httpHelper._config.ResourceUri.FolderSecurity.replace('{folderId}', folderId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            libraryManager.prototype.putFolderSecurityMember = function (folderId, memberId, memberType, securityRole, cascadeSecurityChanges) {
                var resourceUri = this._httpHelper._config.ResourceUri.FolderSecurityId.replace('{folderId}', folderId).replace('{memberId}', memberId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'PUT' };

                var data = {
                    memberType: memberType,
                    securityRole: securityRole,
                    cascadeSecurityChanges: cascadeSecurityChanges
                };

                return this._httpHelper.doVvClientRequest(url, opts, null, data);
            }

            libraryManager.prototype.deleteFolderSecurityMember = function (folderId, memberId, cascadeSecurityChanges) {
                var resourceUri = this._httpHelper._config.ResourceUri.FolderSecurityId.replace('{folderId}', folderId).replace('{memberId}', memberId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };

                var params = {
                    cascadeSecurityChanges: cascadeSecurityChanges
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            return libraryManager;
        })();
        library.libraryManager = libraryManager;
    })(vvRestApi.library || (vvRestApi.library = {}));
    var library = vvRestApi.library;

    (function (sites) {
        var sitesManager = (function () {
            function sitesManager(httpHelper) {
                this._httpHelper = httpHelper;
            }
            sitesManager.prototype.getSites = function (params) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.Sites);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            sitesManager.prototype.postSites = function (params, data) {
                var resourceUri = this._httpHelper._config.ResourceUri.Sites;
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            sitesManager.prototype.putSites = function (params, data, siteId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Sites;
                var url = this._httpHelper.getUrl(resourceUri + '/' + siteId);

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            sitesManager.prototype.getGroups = function (params, siteId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Groups.replace('{id}', siteId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            sitesManager.prototype.postGroups = function (params, data, siteId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Groups.replace('{id}', siteId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            sitesManager.prototype.putGroups = function (params, data, siteId, grId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Groups.replace('{id}', siteId);
                var url = this._httpHelper.getUrl(resourceUri + '/' + grId);

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            sitesManager.prototype.changeUserSite = function(userId, newSiteId){
                var resourceUri = this._httpHelper._config.ResourceUri.ChangeUserSite;
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'PUT' };

                var data = {
                    UserId: userId,
                    NewSiteId: newSiteId
                }

                return this._httpHelper.doVvClientRequest(url, opts, null, data);
            };

            return sitesManager;
        })();
        sites.sitesManager = sitesManager;
    })(vvRestApi.sites || (vvRestApi.sites = {}));
    var sites = vvRestApi.sites;

    (function (users) {
        var usersManager = (function () {
            function usersManager(httpHelper) {
                this._httpHelper = httpHelper;
            }
            usersManager.prototype.getUsers = function (params, siteId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Users.replace('{id}', siteId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            usersManager.prototype.postUsers = function (params, data, siteId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Users.replace('{id}', siteId);
                var url = this._httpHelper.getUrl(resourceUri);

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            usersManager.prototype.putUsers = function (params, data, siteId, usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.Users.replace('{id}', siteId);
                var url = this._httpHelper.getUrl(resourceUri + '/' + usId);

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            usersManager.prototype.putUsersEndpoint = function (params, data, usId) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.User + '/' + usId);
                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            usersManager.prototype.getUser = function (params) {
                var resourceUri = this._httpHelper._config.ResourceUri.User;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            usersManager.prototype.getUserGroups = function (params, usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.UserGroups.replace('{id}', usId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            usersManager.prototype.getUserSupervisors = function (params, usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.UserSupervisors.replace('{id}', usId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            usersManager.prototype.getUserSupervisees = function (params, usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.UserSupervisees.replace('{id}', usId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            usersManager.prototype.getUserLoginToken = function (usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.UserWebToken.replace('{id}', usId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                var params = []; //empty array
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            return usersManager;
        })();
        users.usersManager = usersManager;
    })(vvRestApi.users || (vvRestApi.users = {}));
    var users = vvRestApi.users;



    (function (scheduledProcess) {
        var scheduledProcessManager = (function () {
            function scheduledProcessManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            scheduledProcessManager.prototype.postCompletion = function (id, action, result, message) {
                //build url for call to the scheduledProcess controller
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.ScheduledProcess) + '/' + id;

                //indicate this is a POST
                var opts = { method: 'POST' };

                //create the querystring parameters
                var params = {
                    action: action
                }

                //determine if a result will be returned
                if (result !== null && (typeof result == 'boolean' || result.length > 0)) {
                    params.result = result.toString();
                }

                //determine if a message will be returned
                if (message && message.length > 0) {
                    params.message = message;
                }

                //place call and return promise object
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            return scheduledProcessManager;
        })();
        scheduledProcess.scheduledProcessManager = scheduledProcessManager;
    })(vvRestApi.scheduledProcess || (vvRestApi.scheduledProcess = {}));
    var scheduledProcess = vvRestApi.scheduledProcess;


    //customQuery manager
    (function (customQuery) {
        var customQueryManager = (function () {
            function customQueryManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            customQueryManager.prototype.getCustomQueryResultsByName = function (queryName, params) {
                //build url for call to the scheduledProcess controller
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.CustomQuery);

                //indicate this is a GET
                var opts = { method: 'GET' };

                //add the query name to the params
                if (!params) {
                    params = {};
                }
                params.queryName = queryName;


                //place call and return promise object
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            customQueryManager.prototype.getCustomQueryResultsById = function (id, params) {
                //build url for call to the scheduledProcess controller
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.CustomQuery + '/' + id);

                //indicate this is a GET
                var opts = { method: 'GET' };

                if (!params) {
                    params = {};
                }

                //place call and return promise object
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            return customQueryManager;
        })();
        customQuery.customQueryManager = customQueryManager;
    })(vvRestApi.customQuery || (vvRestApi.customQuery = {}));
    var customQuery = vvRestApi.customQuery;


    //customer manager
    (function (customer) {
        var customerManager = (function () {
            function customerManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            customerManager.prototype.createCustomerInvite = function (data) {
                //build url       
                var baseUrl = this._httpHelper._sessionToken.baseUrl;
                
                var url = baseUrl + "/api/v1/" + this._httpHelper._config.ResourceUri.CustomerInvite;

                url = url.replace(/\/api\/\//g,'/api/');

                url = url.replace(/\/v1\/\//g,'/v1/');

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, '', data);
            };

            return customerManager;
        })();
        customer.customerManager = customerManager;
    })(vvRestApi.customer || (vvRestApi.customer = {}));
    var customer = vvRestApi.customer;

    // files manager  
    (function (files) {
        var filesManager = (function () {
            function filesManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            filesManager.prototype.getFileBytesQuery = function (query) {
                var resourceUri = this._httpHelper._config.ResourceUri.FilesQuery + query;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GETSTREAM' };
                return this._httpHelper.doVvClientRequest(url, opts, null, null);
            };

            filesManager.prototype.getFileBytesId = function (id) {
                var resourceUri = this._httpHelper._config.ResourceUri.FilesId.replace('{id}', id);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GETSTREAM' };
                return this._httpHelper.doVvClientRequest(url, opts, null, null);
            };

            filesManager.prototype.postFile = function (data, buffer) {
                var resourceUri = this._httpHelper._config.ResourceUri.Files;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POSTSTREAM' };

                return this._httpHelper.doVvClientRequest(url, opts, null, data, buffer);
            };

            return filesManager;
        })();
        files.filesManager = filesManager;

    })(vvRestApi.files || (vvRestApi.files = {}));
    var files = vvRestApi.files;

    // scripts manager
    (function (scripts) {
        var scriptsManager = (function () {
            function scriptsManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            scriptsManager.prototype.runWebService = function (serviceName, serviceData) {
                var resourceUri = this._httpHelper._config.ResourceUri.Scripts + '?name=' + serviceName
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };
                return this._httpHelper.doVvClientRequest(url, opts, null, serviceData);
            };

            scriptsManager.prototype.completeWorkflowWebService = function(executionId, workflowVariables) {
                var resourceUri = this._httpHelper._config.ResourceUri.ScriptsCompleteWf
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };

                var postData = {};
                postData["executionId"] = executionId;
                postData["workflowVariables"] = workflowVariables;

                return this._httpHelper.doVvClientRequest(url, opts, null, postData);
            };

            return scriptsManager;
        })();
        scripts.scriptsManager = scriptsManager;

    })(vvRestApi.scripts || (vvRestApi.scripts = {}));
    var scripts = vvRestApi.scripts;

    // documents manager  
    (function (documents) {
        var documentsManager = (function () {
            function documentsManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            documentsManager.prototype.postDoc = function (data) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentsPost;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };
                return this._httpHelper.doVvClientRequest(url, opts, null, data);
            };

            documentsManager.prototype.copyDocument = function (params, data, documentId) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentsIdCopy.replace('{id}', documentId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, null, data);
            }

            documentsManager.prototype.moveDocument = function (params, data, documentId) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentsIdMove.replace('{id}', documentId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'PUT' };
                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            }

            documentsManager.prototype.deleteDocument = function (params, revisionId) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentsId.replace('{id}', revisionId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            documentsManager.prototype.getDocuments = function (params) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentsPost;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            documentsManager.prototype.putDocumentIndexFields = function (data, documentId) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentIndexFields.replace('{id}', documentId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'PUT' };
                return this._httpHelper.doVvClientRequest(url, opts, null, data);
            };

            documentsManager.prototype.postDocumentAlertSubscription = function (documentId, eventId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentAlertsId.replace('{documentId}', documentId).replace('{eventId}', eventId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };

                var params = {
                    usId: userId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            documentsManager.prototype.deleteDocumentAlertSubscription = function (documentId, eventId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentAlertsId.replace('{documentId}', documentId).replace('{eventId}', eventId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };

                var params = {
                    usId: userId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            documentsManager.prototype.getDocumentRevisionOcrProperties = function(params, revisionId) {
                var resourceUri = this._httpHelper._config.ResourceUri.DocumentsIdOcr.replace('{id}', revisionId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            return documentsManager;
        })();
        documents.documentsManager = documentsManager;

    })(vvRestApi.documents || (vvRestApi.documents = {}));
    var documents = vvRestApi.documents;

    // projects manager  
    (function (projects) {
        var projectsManager = (function () {
            function projectsManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            projectsManager.prototype.postProjectAlertSubscription = function (projectId, eventId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.ProjectAlertsId.replace('{projectId}', projectId).replace('{eventId}', eventId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };

                var params = {
                    usId: userId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            projectsManager.prototype.deleteProjectAlertSubscription = function (projectId, eventId, userId) {
                var resourceUri = this._httpHelper._config.ResourceUri.ProjectAlertsId.replace('{projectId}', projectId).replace('{eventId}', eventId);
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };

                var params = {
                    usId: userId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            return projectsManager;
        })();
        projects.projectsManager = projectsManager;

    })(vvRestApi.projects || (vvRestApi.projects = {}));
    var projects = vvRestApi.projects;

    // indexFields manager  
    (function (indexFields) {
        var indexFieldsManager = (function () {
            function indexFieldsManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            indexFieldsManager.prototype.getIndexFields = function (params) {
                var resourceUri = this._httpHelper._config.ResourceUri.IndexFields;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            return indexFieldsManager;
        })();
        indexFields.indexFieldsManager = indexFieldsManager;

    })(vvRestApi.indexFields || (vvRestApi.indexFields = {}));
    var indexFields = vvRestApi.indexFields;

    //Outside process manager
    (function (outsideProcesses) {
        var outsideProcessesManager = (function () {
            function outsideProcessesManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            outsideProcessesManager.prototype.getOutsideProcesses = function (params) {
                var resourceUri = this._httpHelper._config.ResourceUri.OutsideProcesses;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            return outsideProcessesManager;
        })();
        outsideProcesses.outsideProcessesManager = outsideProcessesManager;

    })(vvRestApi.outsideProcesses || (vvRestApi.outsideProcesses = {}));
    var outsideProcesses = vvRestApi.outsideProcesses;

    //Security members manager
    (function (securityMembers) {
        var securityMembersManager = (function () {
            function securityMembersManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            securityMembersManager.prototype.addSecurityMember = function (parentId, memberId, roleType, isGroup) {
                var resourceUri = this._httpHelper._config.ResourceUri.SecurityMembers;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'POST' };

                var postData = {
                    parentId: parentId,
                    memberId: memberId,
                    role: roleType,
                    isGroup: isGroup
                };

                return this._httpHelper.doVvClientRequest(url, opts, null, postData);
            };

            securityMembersManager.prototype.getSecurityMembersForParentId = function(parentId) {
                var resourceUri = this._httpHelper._config.ResourceUri.SecurityMembers;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };

                var params = {
                    parentId: parentId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            securityMembersManager.prototype.removeSecurityMember = function(parentId, memberId) {
                var resourceUri = this._httpHelper._config.ResourceUri.SecurityMembers;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'DELETE' };

                var params = {
                    parentId: parentId,
                    memberId: memberId
                };

                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            };

            securityMembersManager.prototype.updateSecurityMember = function (parentId, memberId, roleType) {
                var resourceUri = this._httpHelper._config.ResourceUri.SecurityMembers;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'PUT' };

                var postData = {
                    parentId: parentId,
                    memberId: memberId,
                    role: roleType
                };

                return this._httpHelper.doVvClientRequest(url, opts, null, postData);
            };

            return securityMembersManager;
        })();
        securityMembers.securityMembersManager = securityMembersManager;

    })(vvRestApi.securityMembers || (vvRestApi.securityMembers = {}));
    var securityMembers = vvRestApi.securityMembers;

    //layouts manager
    (function (layouts) {
        var layoutsManager = (function () {
            function layoutsManager(httpHelper) {
                this._httpHelper = httpHelper;
            }

            layoutsManager.prototype.getLayout = function () {
                var resourceUri = this._httpHelper._config.ResourceUri.Layout;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };
        
                return this._httpHelper.doVvClientRequest(url, opts, {}, null);
            };

            return layoutsManager;
        })();
        layouts.layoutsManager = layoutsManager;

    })(vvRestApi.layouts || (vvRestApi.layouts = {}));
    var layouts = vvRestApi.layouts;

})(vvRestApi || (vvRestApi = {}));


module.exports = vvRestApi;

