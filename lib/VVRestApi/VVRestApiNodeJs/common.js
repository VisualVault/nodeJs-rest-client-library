const { time } = require('console');

var httpHelper = (function () {

    function httpHelper(sessionToken, yamlConfig) {
        this.HTTP = require('http');
        this.jsyaml = require('js-yaml');
        this.nodeJsRequest = require('request');
        this.Q = require('q');

        this._sessionToken = sessionToken;
        this._config = yamlConfig;
        this._maxRetries = 3;
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

    httpHelper.prototype.__doVvClientCallRequest = function (url, options, params, data, buffer, retries) {
        var self = this;
         
        var deferred = this.Q.defer();

        var vvClientRequestCallback = function (error, response, responseData) {
            if (error) {
                console.log('In __doVvClientCallRequest - vvClientRequestCallback with error condition');
                deferred.reject(new Error(error));
            } else {
                var parsedData = JSON.parse(responseData);
                if (response.statusCode === 401 || response.statusCode === 403) {
                    self._sessionToken.isAuthenticated = false;
                    
                    deferred.reject(new Error(parsedData.meta));
                } else if(parsedData.meta && parsedData.meta.status && parsedData.meta.status == 429){
                    var timeout = self.__getRetryDelay(parsedData.meta['retryTime']);                 
                    if(retries && retries > self._maxRetries){
                        deferred.reject(new Error(parsedData.meta));
                    }else{
                        console.log('Timed Out: Retrying in ' + timeout + ' ms.');
                        retries = retries ? retries+1 : 1;
                        console.log(self._maxRetries - retries + ' retries left.');

                        setTimeout(() => {
                            self.__doVvClientCallRequest(url, options, params, data, buffer, retries)
                            .then(result => deferred.resolve(result))
                            .catch(result => deferred.reject(result))
                        }, timeout)
                    }
                }
                else {
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
        var vvClientRequestCallbackStream = function (responseData, code, message) {
            var sd = require('string_decoder');
            var os = require('os');
            var decoder = new sd.StringDecoder();
            if (code == 200) {
                deferred.resolve(responseData);
            } else if (code == 429) {
                var timeout = self.__getRetryDelay(responseData['retryTime']);
                if(retries && retries > self._maxRetries){
                    deferred.reject(new Error(responseData));
                }else{
                    console.log('Timed Out: Retrying in ' + timeout + ' ms.');
                    retries = retries ? retries+1 : 1;
                    console.log(self._maxRetries - retries + ' retries left.');
                    
                    setTimeout(() => {
                        self.__doVvClientCallRequest(url, options, params, responseData, buffer, retries)
                        .then(result => deferred.resolve(result))
                        .catch(result => deferred.reject(result))
                    }, timeout);
                }
            } else {
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
                if(Duplex.Readable.response.headers['content-type'] && Duplex.Readable.response.headers['content-type'].indexOf("application/json") !== -1 ){
                    requestDefer.promise.then(bodyResponse =>{
                        var body = JSON.parse(bodyResponse);
                        if(body.meta && body.meta.status){
                            requestCallback(body.meta, body.meta.status, body.meta.message);
                        }else{
                            throw new Error(Duplex.Readable.response.statusMessage);
                        }
                    })
                    .catch(error => {
                        var msg = 'Unexpected stream response termination';
                        requestCallback(buf, 500, msg);
                    });
                }else{
                    requestCallback(buf, Duplex.Readable.response.statusCode, Duplex.Readable.response.statusMessage);
                }
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
            "Content-Type": "multipart/form-data"
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

    httpHelper.prototype.__getRetryDelay = function(retryTime){
        var delay = 10;
        if (retryTime && !isNaN(Date.parse(retryTime))) {
            var now = new Date();
            delay = Date.parse(retryTime) - now.getTime();
            if (delay < 0) {
                delay *= -1;
            }
        }
        return delay;
    }

    return httpHelper;
})();
this.httpHelper = httpHelper;

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
        this.audience = null;

        sessionToken.prototype.createCopy = function(){
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
        }

        sessionToken.prototype.convertToJwt = function(jwt){
            this.tokenType = 'jwt';
            this.accessToken = jwt["token"];
            this.expirationDate = new Date(jwt["expires"]);
            this.expiresIn = 0;
        }
    }
    return sessionToken;
})();
this.sessionToken = sessionToken;

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

})(this.services || (this.services = {}));
var services = this.services;



