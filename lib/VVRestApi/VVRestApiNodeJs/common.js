const { time } = require('console');
var logger = require('./log');
var common;

(function (common) {
    var httpHelper = (function () {
        // URL patterns for POST requests that are actually read operations
        var READ_POST_ALLOWLIST = [
            '/Search/Advanced', // DocApi.search()
            '/object/search/', // ObjectsApi.getObjectsByModelId()
            '/scheduledProcess/', // scheduledProcessManager.postCompletion()
        ];

        function httpHelper(sessionToken, yamlConfig, options) {
            this.HTTP = require('http');
            this.jsyaml = require('js-yaml');
            this.nodeJsRequest = require('request');
            this.Q = require('q');

            this._sessionToken = sessionToken;
            this._config = yamlConfig;
            this._maxRetries = 3;
            this._readOnly = (options && options.readOnly === true) || false;
            this._writePolicy = (options && options.writePolicy) || null;
        }

        httpHelper.prototype.doVvClientRequest = function (url, options, params, data, buffer) {
            var self = this;

            //If the token is within 30 seconds of expiration, refresh it
            if (this._sessionToken.expirationDate < new Date(new Date().getTime() + 30 * 1000)) {
                console.log('In doVvClientRequest - accessToken has expired, calling __acquireRefreshToken');

                return this.Q.when(self.__acquireRefreshToken())
                    .then(function (result) {
                        console.log('In doVvClientRequest - return success from __acquireRefreshToken');
                        return self.__doVvClientCallRequest(url, options, params, data, buffer);
                    })
                    .fail(function (result) {
                        console.log('In doVvClientRequest - return fail from __acquireRefreshToken');
                        throw new Error('Unable to optain Authorization, error: ' + result);
                    });
            } else {
                return this.__doVvClientCallRequest(url, options, params, data, buffer);
            }
        };

        httpHelper.prototype.__isAllowedReadPost = function (url) {
            for (var i = 0; i < READ_POST_ALLOWLIST.length; i++) {
                if (url.indexOf(READ_POST_ALLOWLIST[i]) !== -1) {
                    return true;
                }
            }
            return false;
        };

        httpHelper.prototype.__isAllowedByPolicy = function (url, data) {
            if (!this._writePolicy || this._writePolicy.mode !== 'allowlist') return false;
            var normalizedUrl = url.toLowerCase();
            var forms = this._writePolicy.forms || [];
            for (var i = 0; i < forms.length; i++) {
                if (normalizedUrl.indexOf(forms[i].templateId.toLowerCase()) !== -1) return true;
            }
            // forminstance/ URLs don't contain the template GUID — check the request body.
            // data.formTemplateId may be a revision ID (from FormsApi.postForm), so also
            // match against forms[].revisionId which the runner resolves at startup.
            if (normalizedUrl.indexOf('/forminstance') !== -1 && data && data.formTemplateId) {
                var bodyTemplateId = data.formTemplateId.toLowerCase();
                for (var fi = 0; fi < forms.length; fi++) {
                    if (forms[fi].templateId.toLowerCase() === bodyTemplateId) return true;
                    if (forms[fi].revisionId && forms[fi].revisionId.toLowerCase() === bodyTemplateId) return true;
                }
            }
            var docs = this._writePolicy.documents || [];
            for (var j = 0; j < docs.length; j++) {
                var docId = (docs[j].documentId || docs[j].folderId || '').toLowerCase();
                if (docId && normalizedUrl.indexOf(docId) !== -1) return true;
            }
            var ws = this._writePolicy.webServices || [];
            for (var k = 0; k < ws.length; k++) {
                var wsId = (ws[k].scriptId || '').toLowerCase();
                if (wsId && normalizedUrl.indexOf(wsId) !== -1) return true;
            }
            return false;
        };

        httpHelper.prototype.__doVvClientCallRequest = function (url, options, params, data, buffer, retries) {
            // Read-only guard: block write operations unless overridden via VV_FORCE_WRITE=1
            // When a writePolicy with mode "allowlist" is configured, writes to allowlisted
            // resources are permitted even on readOnly environments.
            if (this._readOnly && !process.env.VV_FORCE_WRITE) {
                var method = options.method;
                var blocked = null;
                if (method === 'PUT' || method === 'PUTSTREAM' || method === 'DELETE') {
                    if (!this.__isAllowedByPolicy(url, data)) {
                        blocked =
                            'WritePolicy: ' +
                            method +
                            ' request blocked. ' +
                            'Environment is marked readOnly in .env.json. URL: ' +
                            url;
                    }
                } else if ((method === 'POST' || method === 'POSTSTREAM') && !this.__isAllowedReadPost(url)) {
                    if (!this.__isAllowedByPolicy(url, data)) {
                        blocked =
                            'WritePolicy: POST request blocked. ' +
                            'Environment is marked readOnly in .env.json. URL: ' +
                            url +
                            '\n' +
                            'If this POST is a read operation, add its URL pattern to READ_POST_ALLOWLIST in common.js.' +
                            '\n' +
                            'If this is a test harness write, add the resource to writePolicy in .env.json.';
                    }
                }
                if (blocked) {
                    var d = this.Q.defer();
                    d.reject(new Error(blocked));
                    return d.promise;
                }
            }

            var self = this;

            var deferred = this.Q.defer();

            var vvClientRequestCallback = function (error, response, responseData) {
                if (error) {
                    console.log('In __doVvClientCallRequest - vvClientRequestCallback with error condition');
                    deferred.reject(new Error(error));
                } else {
                    let parsedData;

                    if (typeof responseData === 'string') {
                        parsedData = JSON.parse(responseData);
                    } else {
                        parsedData = responseData;
                    }

                    if (response.statusCode === 401 || response.statusCode === 403) {
                        self._sessionToken.isAuthenticated = false;

                        deferred.reject(new Error(parsedData.meta));
                    } else if (response.status == 429 && parsedData.meta && parsedData.meta.status) {
                        var timeout = self.__getRetryDelay(parsedData.meta['retryTime']);
                        if (retries && retries > self._maxRetries) {
                            deferred.reject(new Error(parsedData.meta));
                        } else {
                            console.log('Timed Out: Retrying in ' + timeout + ' ms.');
                            retries = retries ? retries + 1 : 1;
                            console.log(self._maxRetries - retries + ' retries left.');

                            setTimeout(() => {
                                self.__doVvClientCallRequest(url, options, params, data, buffer, retries)
                                    .then((result) => deferred.resolve(result))
                                    .catch((result) => deferred.reject(result));
                            }, timeout);
                        }
                    } else {
                        if (typeof responseData == 'object' && responseData != null) {
                            //console.log('In vvClientRequestCallback with success: ' + JSON.stringify(responseData));
                        } else {
                            //console.log('In vvClientRequestCallback with success: ' + responseData);
                        }

                        deferred.resolve(responseData);
                    }
                }
            };

            // stream callback
            var vvClientRequestCallbackStream = function (responseData, code, message) {
                var sd = require('string_decoder');
                var os = require('os');
                var decoder = new sd.StringDecoder();
                if (code == 200) {
                    deferred.resolve(responseData);
                } else if (code == 429) {
                    var timeout = self.__getRetryDelay(responseData['retryTime']);
                    if (retries && retries > self._maxRetries) {
                        deferred.reject(new Error(responseData));
                    } else {
                        console.log('Timed Out: Retrying in ' + timeout + ' ms.');
                        retries = retries ? retries + 1 : 1;
                        console.log(self._maxRetries - retries + ' retries left.');

                        setTimeout(() => {
                            self.__doVvClientCallRequest(url, options, params, responseData, buffer, retries)
                                .then((result) => deferred.resolve(result))
                                .catch((result) => deferred.reject(result));
                        }, timeout);
                    }
                } else {
                    deferred.reject(
                        new Error(
                            'Response Code: ' +
                                code +
                                os.EOL +
                                'Response Message: ' +
                                message +
                                os.EOL +
                                decoder.write(data)
                        )
                    );
                }
            };

            if (options.method === 'GET') {
                this.httpGet(url, params, vvClientRequestCallback);
            } else if (options.method === 'GETSTREAM') {
                this.httpGetStream(url, params, vvClientRequestCallbackStream);
            } else if (options.method === 'POST') {
                this.httpPost(url, params, data, vvClientRequestCallback);
            } else if (options.method === 'POSTSTREAM') {
                this.httpPostStream(url, params, data, buffer, vvClientRequestCallback);
            } else if (options.method === 'PUT') {
                this.httpPut(url, params, data, vvClientRequestCallback);
            } else if (options.method === 'PUTSTREAM') {
                this.httpPutStream(url, params, data, buffer, vvClientRequestCallback);
            } else if (options.method === 'DELETE') {
                this.httpDelete(url, params, vvClientRequestCallback);
            } else {
                throw new Error('http request method name error');
            }

            return deferred.promise;
        };

        httpHelper.prototype.__makeRequest = function (url, options, requestCallback) {
            options.headers['Authorization'] = 'Bearer ' + this._sessionToken.accessToken;

            console.log('In __makeRequest - Performing request to url:' + url);

            this.nodeJsRequest(options, function (error, response, body) {
                requestCallback(error, response, body);
            });
        };

        // request for stream
        httpHelper.prototype.__makeStreamRequest = function (url, options, requestCallback) {
            options.headers['Authorization'] = 'Bearer ' + this._sessionToken.accessToken;
            options.headers['Content-Type'] = 'application/json; charset=utf-8';

            console.log('In __makeStreamRequest - Performing request to url:' + url);
            var fs = require('fs');
            var stream = require('stream');
            var bf = require('buffer');

            var Duplex = new stream.Duplex();
            var requestDefer = this.Q.defer();
            var request = this.nodeJsRequest(options, (error, response, body) => {
                error ? requestDefer.resolve(error) : requestDefer.resolve(body);
            });
            Duplex.Readable = request;
            var bufs = [];

            Duplex.Readable.on('data', function (chunk) {
                console.log('got %d bytes of data', chunk.length);
                bufs.push(chunk);
            });

            Duplex.Readable.on('end', function () {
                console.log('end of stream');
                var buf = new bf.Buffer.concat(bufs);

                if (Duplex.Readable.response) {
                    if (
                        Duplex.Readable.response.headers['content-type'] &&
                        Duplex.Readable.response.headers['content-type'].indexOf('application/json') !== -1
                    ) {
                        requestDefer.promise
                            .then((bodyResponse) => {
                                var body = JSON.parse(bodyResponse);
                                if (body.meta && body.meta.status) {
                                    requestCallback(body.meta, body.meta.status, body.meta.message);
                                } else {
                                    throw new Error(Duplex.Readable.response.statusMessage);
                                }
                            })
                            .catch((error) => {
                                var msg = 'Unexpected stream response termination';
                                requestCallback(buf, 500, msg);
                            });
                    } else {
                        requestCallback(
                            buf,
                            Duplex.Readable.response.statusCode,
                            Duplex.Readable.response.statusMessage
                        );
                    }
                } else {
                    var msg = 'Unexpected stream response termination';
                    requestCallback(buf, 500, msg);
                }
            });
        };

        // request for post stream
        httpHelper.prototype.__makePostStreamRequest = function (url, options, buffer, requestCallback) {
            console.log('In __makeRequest - Performing request to url:' + url);
            var streamRequest = require('request');

            var headers = {
                Authorization: 'Bearer ' + this._sessionToken.accessToken,
                'Content-Type': 'multipart/form-data',
            };

            var multipart = [];
            for (var key in options.json) {
                if (options.json.hasOwnProperty(key)) {
                    var obj = {
                        'Content-Disposition': 'form-Data; name="' + key + '"',
                        body: options.json[key],
                    };
                    multipart.push(obj);
                }
            }

            //Add file(s) to multipart data
            if (Buffer.isBuffer(buffer)) {
                //Single file
                var filename = 'file';
                if (options && options.json && options.json.fileName) {
                    filename = options.json.fileName;
                }

                var filePart = {
                    'Content-Disposition': 'form-data; name="fileUpload"; filename="' + filename + '"',
                    body: buffer,
                };
                multipart.push(filePart);
            } else if (Array.isArray(buffer)) {
                //Multiple files - Expect an array of objects with a "buffer" and "filename" properties
                for (var i = 0; i < buffer.length; i++) {
                    var fileInfoObj = buffer[i];
                    if (Buffer.isBuffer(fileInfoObj.buffer)) {
                        var fileName = `file${i}`;
                        if (fileInfoObj.fileName) {
                            fileName = fileInfoObj.fileName;
                        }
                        var filePart = {
                            'Content-Disposition': 'form-data; name="fileUpload"; filename="' + fileName + '"',
                            body: fileInfoObj.buffer,
                        };
                        multipart.push(filePart);
                    } else {
                        throw new Error(`Invalid 'buffer' property found on fileObj at index ${i}`);
                    }
                }
            } else {
                throw new Error('Expecting Buffer');
            }

            //Make request
            streamRequest(
                {
                    method: options.method,
                    preambleCRLF: true,
                    postambleCRLF: true,
                    uri: url,
                    multipart: multipart,
                    headers: headers,
                },
                function (error, response, body) {
                    return requestCallback(error, response, body);
                }
            );
        };

        httpHelper.prototype.request = function (httpVerb, url, params, data) {
            var options = { method: 'GET' };

            console.log('In __makeStreamRequest - Performing request to url:' + url);

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

        httpHelper.prototype.httpPutStream = function (url, params, data, buffer, requestCallback) {
            var self = this;
            var headers = {};
            var options = { method: 'PUT', uri: url, qs: params || {}, json: data, headers: headers };

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

            var vvAuthorize = new common.authorize();

            this.Q.when(vvAuthorize.reacquireSecurityToken(this._sessionToken))
                .then(function (result) {
                    options.headers['Authorization'] = 'Bearer ' + this._sessionToken.accessToken;

                    this.nodeJsRequest(options, function (error, response, body) {
                        requestCallback(error, response, body);
                    });
                })
                .fail(function (tokenError) {
                    vvAuthorize.acquireSecurityToken(this._sessionToken);
                });
        };

        httpHelper.prototype.__acquireRefreshToken = function () {
            var attemptCount = 0;
            this._sessionToken.isAuthenticated = false;

            var deferred = this.Q.defer();

            var vvAuthorize = new common.authorize();

            this.Q.when(vvAuthorize.acquireRefreshToken(this._sessionToken))
                .then(function (result) {
                    deferred.resolve();
                })
                .fail(function (result) {
                    this.Q.when(vvAuthorize.reacquireSecurityToken(this._sessionToken))
                        .then(deferred.resolve(result))
                        .fail(deferred.reject(result));
                });

            return deferred.promise;
        };

        httpHelper.prototype.__recursiveAttemptAcquireToken = function (options, requestCallback, attemptCount) {
            var vvAuthorize = new common.authorize();

            this.Q.when(vvAuthorize.reacquireSecurityToken(this._sessionToken))
                .then(function (result) {
                    var sessionToken = result;

                    options.headers['Authorization'] = 'Bearer ' + this._sessionToken.accessToken;

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

        httpHelper.prototype.__getRetryDelay = function (retryTime) {
            var delay = 10;
            if (retryTime && !isNaN(Date.parse(retryTime))) {
                var now = new Date();
                delay = Date.parse(retryTime) - now.getTime();
                if (delay < 0) {
                    delay *= -1;
                }
            }
            return delay;
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
            this.accessToken = null;
            this.tokenType = null;
            this.refreshToken = null;
            this.expiresIn = 0;
            this.clientId = null;
            this.clientSecret = null;
            this.userId = null;
            this.password = null;
            this.audience = null;

            sessionToken.prototype.createCopy = function () {
                var newSession = new sessionToken();
                newSession.isAuthenticated = this.isAuthenticated;
                newSession.apiUrl = this.apiUrl;
                newSession.baseUrl = this.baseUrl;
                newSession.authenticationUrl = this.authenticationUrl;
                newSession.customerAlias = this.customerAlias;
                newSession.databaseAlias = this.databaseAlias;
                newSession.expirationDate = this.expirationDate;
                newSession.accessToken = this.accessToken;
                newSession.tokenType = this.tokenType;
                newSession.refreshToken = this.refreshToken;
                newSession.expiresIn = this.expiresIn;
                newSession.clientId = this.clientId;
                newSession.clientSecret = this.clientSecret;
                newSession.userId = this.userId;
                newSession.password = this.password;
                newSession.audience = this.audience;
                return newSession;
            };

            sessionToken.prototype.convertToJwt = function (jwt) {
                this.tokenType = 'jwt';
                this.accessToken = jwt['token'];
                this.expirationDate = new Date(jwt['expires']);
                this.expiresIn = 0;
            };
        }
        return sessionToken;
    })();
    common.sessionToken = sessionToken;

    var authorize = (function () {
        function authorize() {
            this.HTTP = require('http');
            this.jsyaml = require('js-yaml');
            this.nodeJsRequest = require('request');
            this.Q = require('q');
            this.fs = require('fs');
        }

        authorize.prototype.acquireSecurityToken = function (
            clientId,
            clientSecret,
            userId,
            password,
            audience,
            baseUrl,
            apiUrl,
            customerAlias,
            databaseAlias,
            authenticationUrl
        ) {
            var self = this;

            var deferred = this.Q.defer();

            this.Q.when(
                this.__getToken(
                    clientId,
                    clientSecret,
                    userId,
                    password,
                    audience,
                    baseUrl,
                    customerAlias,
                    databaseAlias,
                    authenticationUrl,
                    true
                )
            )
                .then(function (sessionToken) {
                    console.log('acquireSecurityToken Success');

                    if (typeof sessionToken != 'undefined' && sessionToken != null) {
                        sessionToken.baseUrl = baseUrl;
                        sessionToken.apiUrl = apiUrl;
                        sessionToken.authenticationUrl = authenticationUrl;
                        sessionToken.customerAlias = customerAlias;
                        sessionToken.databaseAlias = databaseAlias;
                        sessionToken.clientId = clientId;
                        sessionToken.clientSecret = clientSecret;
                        sessionToken.userId = userId;
                        sessionToken.password = password;
                        sessionToken.audience = audience;
                        sessionToken.isAuthenticated = true;
                    }

                    deferred.resolve(sessionToken);
                })
                .fail(function (error) {
                    console.log('acquireSecurityToken Failed');

                    deferred.reject(new Error(error));
                });

            return deferred.promise;
        };

        authorize.prototype.acquireJwt = function (
            jwt,
            baseUrl,
            apiUrl,
            authenticationUrl,
            customerAlias,
            databaseAlias
        ) {
            var self = this;

            var deferred = this.Q.defer();

            this.Q.when(this.__getJwt(jwt, baseUrl, customerAlias, databaseAlias, authenticationUrl, true))
                .then(function (sessionToken) {
                    console.log('acquireJwt Success');

                    if (typeof sessionToken != 'undefined' && sessionToken != null) {
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

                    deferred.resolve(sessionToken);
                })
                .fail(function (error) {
                    console.log('acquireSecurityToken Failed');

                    deferred.reject(new Error(error));
                });

            return deferred.promise;
        };

        authorize.prototype.reacquireSecurityToken = function (sessionToken) {
            var self = this;

            var deferred = this.Q.defer();

            if (sessionToken.isJwt) {
                this.Q.when(
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
                this.Q.when(
                    this.__getToken(
                        sessionToken.clientId,
                        sessionToken.clientSecret,
                        sessionToken.userId,
                        sessionToken.password,
                        sessionToken.audience,
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
            }

            return deferred.promise;
        };

        authorize.prototype.acquireRefreshToken = function (sessionToken) {
            var self = this;

            if (sessionToken.isJwt) {
                return this.reacquireSecurityToken(sessionToken);
            } else {
                var claim = {
                    grant_type: 'refresh_token',
                    refresh_token: sessionToken.refreshToken,
                    client_id: sessionToken.clientId,
                    client_secret: sessionToken.clientSecret,
                };

                if (sessionToken['audience']) {
                    claim['audience'] = sessionToken['audience'];
                }

                console.log('In authorize.acquireRefreshToken');

                var getTokenCallback = function (error, response, body) {
                    if (error) {
                        sessionToken.isAuthenticated = false;

                        console.log(
                            'In authorize.acquireRefreshToken - getTokenCallback, Error from acquiring refreshToken: ' +
                                error
                        );
                        logger.error(
                            'In authorize.acquireRefreshToken - getTokenCallback, Error from acquiring refreshToken: ' +
                                error
                        );

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
                        } else if (
                            response.statusCode == 401 ||
                            response.statusCode == 403 ||
                            response.statusCode == 400
                        ) {
                            sessionToken.isAuthenticated = false;
                            logger.info(
                                'In authorize.acquireRefreshToken - getTokenCallback, Authorization has been refused for current credentials. ' +
                                    response.body
                            );
                            deferred.reject(new Error('Authorization has been refused for current credentials'));
                        } else {
                            sessionToken.isAuthenticated = false;
                            console.log(
                                'In authorize.acquireRefreshToken - getTokenCallback, Unknown response for access token'
                            );
                            logger.info(
                                'In authorize.acquireRefreshToken - getTokenCallback, Unknown response for access token'
                            );
                            deferred.reject(new Error('Unknown response for access token'));
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

        authorize.prototype.__getToken = function (
            clientId,
            clientSecret,
            userId,
            password,
            audience,
            baseUrl,
            customerAlias,
            databaseAlias,
            authenticationUrl,
            isDebugMode
        ) {
            console.log('authorize.__getToken is being called');

            var self = this;

            var deferred = this.Q.defer();

            var claim = {
                grant_type: 'password',
                client_id: clientId,
                client_secret: clientSecret,
                username: userId,
                password: password,
                scope: 'vault',
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
                        logger.info('Authorization has been refused for current credentials.' + response.body);
                        deferred.reject(new Error('Authorization has been refused for current credentials'));
                    } else {
                        sessionToken.isAuthenticated = false;
                        console.log('Unknown response for access token');
                        deferred.reject(new Error('Unknown response for access token'));
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

        authorize.prototype.__getJwt = function (
            jwt,
            baseUrl,
            customerAlias,
            databaseAlias,
            authenticationUrl,
            isDebugMode
        ) {
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

                        sessionToken.accessToken = responseObject.data.token;
                        sessionToken.expirationDate = new Date(responseObject.data.expires);
                        sessionToken.isAuthenticated = true;
                        sessionToken.isJwt = true;

                        deferred.resolve(sessionToken);
                    } else if (response.statusCode == 401 || response.statusCode == 403 || response.statusCode == 400) {
                        sessionToken.isAuthenticated = false;
                        logger.info('Authorization has been refused for current credentials.' + response.body);
                        deferred.reject(new Error('Authorization has been refused for current credentials'));
                    } else {
                        sessionToken.isAuthenticated = false;
                        console.log('Unknown response for jwt');
                        deferred.reject(new Error('Unknown response for jwt'));
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

        return authorize;
    })();
    common.authorize = authorize;

    (function (services) {
        var apiServiceCoreSettings = (function () {
            function apiServiceCoreSettings() {
                this.VERSION = 'v1.0.0';
                this.ServiceInterface = {};
                this.Signers = {};
                this.XML = {};

                this.util = new this.services.serviceCoreUtility(this);
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
                var length = 0,
                    offset = 0,
                    buffer = null,
                    i;

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
                    0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3,
                    0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91,
                    0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
                    0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5,
                    0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
                    0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
                    0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f,
                    0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924, 0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d,
                    0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
                    0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
                    0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457,
                    0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
                    0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb,
                    0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9,
                    0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
                    0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad,
                    0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683,
                    0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
                    0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7,
                    0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
                    0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
                    0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79,
                    0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236, 0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f,
                    0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
                    0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
                    0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21,
                    0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
                    0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45,
                    0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db,
                    0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
                    0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf,
                    0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d,
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
                    crc = (crc >>> 8) ^ tbl[(crc ^ data[i]) & 0xff];
                }
                return (crc ^ -1) >>> 0;
            };

            cryptoHelper.prototype.hmac = function (key, string, digest, fn) {
                if (!digest) digest = 'binary';
                if (!fn) fn = 'sha256';
                return this.cryptoLib.createHmac(fn, key).update(string).digest(digest);
            };

            cryptoHelper.prototype.md5 = function (data, digest) {
                if (!digest) {
                    digest = 'binary';
                }
                if (typeof data === 'string') data = new Buffer(data);
                return this.createHash('md5').update(data).digest(digest);
            };

            cryptoHelper.prototype.sha256 = function (string, digest) {
                if (!digest) {
                    digest = 'binary';
                }
                if (typeof string === 'string') string = new Buffer(string);
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
                if (!formatter) formatter = 'iso8601';
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
                currentEndpoint = new this.services.endpoint(currentEndpoint, util);
                this.method = method.toUpperCase();
                this.path = currentEndpoint.path || '/';
                this.headers = {};
                for (var headerName in currentHeaders) {
                    this.headers[headerName] = currentHeaders[headerName];
                }

                var jsonData = '';

                if (typeof data == 'object' && data != null) {
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
                        if (ret === this.abort) break;
                    }
                }
            };

            serviceCoreUtility.prototype.arrayEach = function (array, iterFunction) {
                for (var idx in array) {
                    if (array.hasOwnProperty(idx)) {
                        var ret = iterFunction.call(this, array[idx], parseInt(idx, 10));
                        if (ret === this.abort) break;
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
                if (object === null || object === undefined) return object;
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
                if (typeof type === 'function') type = type.name;
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
                    var ctor = function __ctor_wrapper__() {};
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
                if (str === null || str === undefined) return 0;
                if (typeof str === 'string') str = new Buffer(str);

                if (str.length !== undefined) {
                    return str.length;
                } else if (typeof str.path === 'string') {
                    return require('fs').lstatSync(str.path).size;
                } else {
                    throw this._serviceCoreUtil.error(new Error(), {
                        message: 'Cannot determine length of ' + str,
                        object: str,
                    });
                }
            };
            return stringHelper;
        })();
        services.stringHelper = stringHelper;
    })(this.services || (this.services = {}));
    var services = this.services;
})(common || (common = {}));

module.exports = common;
