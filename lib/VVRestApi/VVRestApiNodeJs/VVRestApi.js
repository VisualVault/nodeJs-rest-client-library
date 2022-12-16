var vvRestApi;
var FormsApi = require('./FormsApi');
var common = require('./common');
var logger = require('./log');
var Q = require('q');

(function (vvRestApi) {
    var vvClient = (function () {

        function vvClient(sessionToken) {
            // var yamlConfig = require('./config.yml');
            var yaml = require('js-yaml');
            var fs = require('fs');
            this.yamlConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/config.yml', 'utf8'));

            this._httpHelper = new common.httpHelper(sessionToken, this.yamlConfig);
            this.constants = new constants.constantsInitializer();
            this.configuration = new configuration.configurationManager(this._httpHelper);

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
            this.customerDatabase = new customerDatabase.customerDatabaseManager(this._httpHelper);
            this.indexFields = new indexFields.indexFieldsManager(this._httpHelper);
            this.outsideProcesses = new outsideProcesses.outsideProcessesManager(this._httpHelper);
            this.securityMembers = new securityMembers.securityMembersManager(this._httpHelper);
            this.layouts = new layouts.layoutsManager(this._httpHelper);

            this._formsApi = null;
            Object.defineProperties(this, {
                formsApi:{
                    get: function(){
                        if(this._formsApi != null && this._formsApi.isEnabled && this._formsApi.baseUrl){
                            return this._formsApi;
                        }else{
                            throw new ReferenceError("Forms Api not enabled");
                        }
                    }
                }
            });

        }

        vvClient.prototype.createFormsApi = async function(sessionToken){

            //get forms api config
            var formsApiConfigResponse = JSON.parse(await this.configuration.getFormsApiConfig());

            if(formsApiConfigResponse && formsApiConfigResponse['data']){
                var formsApiSession = sessionToken.createCopy();
                formsApiSession.baseUrl = formsApiConfigResponse.data['formsApiUrl'];
                formsApiSession.apiUrl = this.yamlConfig.FormsApiUri;
                if(formsApiSession['tokenType'] == 'jwt'){
                    this._formsApi = new FormsApi(formsApiSession, formsApiConfigResponse.data);
                }else if(this.users){
                    var jwtResponse = JSON.parse(await this.users.getUserJwt());

                    if(jwtResponse['data'] && jwtResponse['data']['token']){
                        formsApiSession.convertToJwt(jwtResponse['data']);
                        this._formsApi = new FormsApi(formsApiSession, formsApiConfigResponse.data);
                    }
                }
            }
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

                    client.createFormsApi(sessionToken)
                        .then(()=> deferred.resolve(client))
                        .catch(()=> deferred.resolve(client));
                    
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

    (function (configuration) {
        var configurationManager = (function () {
            function configurationManager(httpHelper) {
                this._httpHelper = httpHelper;
            }
            configurationManager.prototype.getFormsApiConfig = function () {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.ConfigurationFormsApi);

                var opts = { method: 'GET' };
                var params = {};
                var data = {};

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            };

            return configurationManager;
        })();
        configuration.configurationManager = configurationManager;
    })(vvRestApi.configuration || (vvRestApi.configuration = {}));
    var configuration = vvRestApi.configuration;

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
                params.fields = "id, name, description, revision, revisionId";
                params.q = "name eq '" + templateName + "'";

                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FormTemplates);
                var opts = { method: 'GET' };
                var templateId;
                var templateRevisionId;

                var fm = this;

                this._httpHelper.doVvClientRequest(url, opts, params, null).then(function (resp) {
                    var templateResp = JSON.parse(resp);
                    if (templateResp.data.length > 0) {
                        templateId = templateResp['data'][0]['id'];
                        templateRevisionId = templateResp['data'][0]['revisionId'];
                    }

                    var responseData = {};
                    responseData.formsManager = fm;
                    responseData.templateIdGuid = templateId;
                    responseData.templateRevisionIdGuid = templateRevisionId;

                    deferred.resolve(responseData);

                }).fail(function (error) {
                    logger.info("failed getting Form Template Id by Name " + error);

                    var responseData = {};
                    responseData.formsManager = fm;
                    responseData.templateIdGuid = '';
                    responseData.templateRevisionIdGuid = '';

                    deferred.resolve(responseData);
                });

                return deferred.promise;
            };

            formsManager.prototype.getForms = async function (params, formTemplateId) {
                
                //if formTemplateId is not a Guid assume its a template name and fetch the Guid
                if (!this.isGuid(formTemplateId)) {
                    let resp = await this.getFormTemplateIdByName(formTemplateId);
                    var formsManager = resp.formsManager;
                    var templateIdGuid = resp.templateIdGuid;
                    var resourceUri = formsManager._httpHelper._config.ResourceUri.Forms.replace('{id}', templateIdGuid);
                    var url = formsManager._httpHelper.getUrl(resourceUri);
                    var opts = { method: 'GET' };

                    return this._httpHelper.doVvClientRequest(url, opts, params, null);
                   
                } else {
                    var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                    var url = this._httpHelper.getUrl(resourceUri);
                    var opts = { method: 'GET' };

                    return this._httpHelper.doVvClientRequest(url, opts, params, null);
                }
                
            };

            formsManager.prototype.postForms = async function (params, data, formTemplateId) {
                
                //if formTemplateId is not a Guid assume its a template name and fetch the Guid
                if (!this.isGuid(formTemplateId)) {
                    let resp = await this.getFormTemplateIdByName(formTemplateId);
                    var formsManager = resp.formsManager;
                    var templateIdGuid = resp.templateIdGuid;
                    var resourceUri = formsManager._httpHelper._config.ResourceUri.Forms.replace('{id}', templateIdGuid);
                    var url = formsManager._httpHelper.getUrl(resourceUri);
                    var opts = { method: 'POST' };

                    return this._httpHelper.doVvClientRequest(url, opts, params, data);
                    
                } else {
                    var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                    var url = this._httpHelper.getUrl(resourceUri);
                    var opts = { method: 'POST' };

                    return this._httpHelper.doVvClientRequest(url, opts, params, data);
                }

            };

            formsManager.prototype.postFormRevision = async function (params, data, formTemplateId, formId) {
                
                //if formTemplateId is not a Guid assume its a template name and fetch the Guid
                if (!this.isGuid(formTemplateId)) {
                    let resp = await this.getFormTemplateIdByName(formTemplateId);

                    var formsManager = resp.formsManager;
                    var templateIdGuid = resp.templateIdGuid;
                    var resourceUri = formsManager._httpHelper._config.ResourceUri.Forms.replace('{id}', templateIdGuid);
                    var url = formsManager._httpHelper.getUrl(resourceUri + '/' + formId);
                    var opts = { method: 'POST' };

                    return this._httpHelper.doVvClientRequest(url, opts, params, data);                    
                } else {
                    var resourceUri = this._httpHelper._config.ResourceUri.Forms.replace('{id}', formTemplateId);
                    var url = this._httpHelper.getUrl(resourceUri + '/' + formId);
                    var opts = { method: 'POST' };

                    return this._httpHelper.doVvClientRequest(url, opts, params, data);
                }               
            };

            formsManager.prototype.postFormRevisionByFormId = function (params, data, formId) {
                var url = this._httpHelper.getUrl(this._httpHelper._config.ResourceUri.FormsId).replace('{id}', formId);

                var opts = { method: 'POST' };

                return this._httpHelper.doVvClientRequest(url, opts, params, data);
            }

            formsManager.prototype.updateFormInstanceOriginator = function(formInstanceId, newOriginatorUsID){
                var resourceUri = this._httpHelper._config.ResourceUri.FormInstanceUpdateOriginator.replace('{id}', formInstanceId);
                var url = this._httpHelper.getUrl(resourceUri); 

                var params = {
                    userId: newOriginatorUsID,
                };
                var data = null;

                var opts = { method: "PUT" };

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

            usersManager.prototype.getUserById = function (params, usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.UserById.replace('{id}', usId);
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

            usersManager.prototype.getUserJwt = function (usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.UsersGetJwt;
                var url = this._httpHelper.getUrl(resourceUri);
                var opts = { method: 'GET' };
                var params = []; //empty array
                return this._httpHelper.doVvClientRequest(url, opts, params, null);
            }

            usersManager.prototype.deleteUser = function (usId) {
                var resourceUri = this._httpHelper._config.ResourceUri.UserDelete;
                var url = this._httpHelper.getUrl(resourceUri.replace("{id}", usId));
                var opts = { method: 'DELETE' };
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

            customerManager.prototype.assignUser = function(customerId, data){
                var baseUrl = this._httpHelper._sessionToken.baseUrl;
                
                var url = baseUrl + "/api/v1/" + this._httpHelper._config.ResourceUri.CustomerAssignUser.replace('{customerId}', customerId);;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, '', data);
            }

            return customerManager;
        })();
        customer.customerManager = customerManager;
    })(vvRestApi.customer || (vvRestApi.customer = {}));
    var customer = vvRestApi.customer;

    //customerDatabase manager
    (function (customerDatabase) {
        var customerDatabaseManager = (function () {
            function customerDatabaseManager(httpHelper) {
                this._httpHelper = httpHelper;
            }
    
            customerDatabaseManager.prototype.assignUser = function(customerId, data){
                var baseUrl = this._httpHelper._sessionToken.baseUrl;
                
                var url = baseUrl + "/api/v1/" + this._httpHelper._config.ResourceUri.CustomerDatabaseAssignUser.replace('{databaseId}', customerId);;

                var opts = { method: 'PUT' };

                return this._httpHelper.doVvClientRequest(url, opts, '', data);
            }

            return customerDatabaseManager;
        })();
        customerDatabase.customerDatabaseManager = customerDatabaseManager;
    })(vvRestApi.customerDatabase || (vvRestApi.customerDatabase = {}));
    var customerDatabase = vvRestApi.customerDatabase;

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

