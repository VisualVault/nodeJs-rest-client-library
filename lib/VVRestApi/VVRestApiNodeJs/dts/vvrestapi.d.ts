/// <reference path="./node.d.ts" />
/// <reference path="./express.d.ts" />
declare module vvRestApi {
    class vvClient {
        public _config: any;
        public _sessionToken: common.sessionToken;
        public HTTP: any;
        public jsyaml: any;
        public nodeJsRequest: any;
        public Q: any;
        constructor(sessionToken: common.sessionToken);
        public endsWith(source, suffix): bool;
        private acquireSecurityToken();
        public getFormTemplates(params);
        public getForms(params, formTemplateId);
        public postForms(params, data, formTemplateId);
        public postFormRevision(params, data, formTemplateId, formId);
        public getSites(params);
        public postSites(params, data);
        public putSites(params, data, siteId);
        public getUsers(params, siteId);
        public postUsers(params, data, siteId);
        public putUsers(params, data, siteId, usId);
        public getGroups(params, siteId);
        public postGroups(params, data, siteId);
        public putGroups(params, data, siteId, grId);
        public getFolders(params);
        public getDocuments(params, folderId);
        public postEmails(params, data);
        public getSecurityToken(): string;
        public isAuthenticated(): bool;
        public getBaseUrl(): string;
        public request(httpVerb, url, params, data);
        public httpGet(url, params, requestCallback): void;
        public httpPost(url, params, data, requestCallback): void;
        public httpPut(url, params, data, requestCallback): void;
        public httpDelete(url, params, requestCallback): void;
        private __acquireNewTokenWithRequest(options, requestCallback);
        private __recursiveAttemptAcquireToken(options, requestCallback, attemptCount);
        private __doVvClientRequest(url, opts, params, data);
        private __getUrl(resourceUrl);
        private __getToken();
    }
    class authorize {
        public HTTP: any;
        public jsyaml: any;
        public nodeJsRequest: any;
        public Q: any;
        constructor();
        public getVaultApi(loginToken: string, developerId: string, developerSecret: string, baseVaultUrl: string, customerAlias: string, databaseAlias: string);
        private acquireSecurityToken(loginToken, developerId, developerSecret, baseUrl, apiUrl, customerAlias, databaseAlias, authenticationUrl);
        private endsWith(source, suffix);
        private __getToken(loginToken, developerId, developerSecret, baseUrl, customerAlias, databaseAlias, authenticationUrl, isDebugMode);
    }
    module common {
        class jwt {
            public crypto: any;
            constructor();
            public decode(jwt, key, verify);
            public encode(payload, key, algo): string;
            public sign(msg, key, method);
            public urlsafeB64Decode(str): string;
            public urlsafeB64Encode(str): string;
        }
        class loginCredentials {
            public baseUrl: string;
            public customerAlias: string;
            public databaseAlias: string;
            public developerId: string;
            public developerSecret: string;
            public loginToken: string;
            constructor(loginToken: string, developerId: string, developerSecret: string, customerAlias: string, databaseAlias: string);
        }
        class requestSigning {
            public request: any;
            public crypto: any;
            public uuid: any;
            public serviceSettings: services.apiServiceCoreSettings;
            constructor();
            public sign(headers, targetUrl, method, data, developerId, developerSecret): void;
            public createCanonicalRequest(): string;
            public canonicalHeaders(): string;
            public canonicalHeaderValues(values);
            public signedHeaders(): string;
            public hexEncodedHash(value: string);
            public urlsafeB64Decode(str): string;
            public urlsafeB64Encode(str): string;
        }
        class returnField {
            public id: any;
            public name: string;
            public value: any;
            public isError: bool;
            public errorMessage: string;
            constructor(id, name, value, isError, errorMessage);
        }
        class sessionToken {
            public isAuthenticated: bool;
            public apiUrl: string;
            public baseUrl: string;
            public authenticationUrl: string;
            public customerAlias: string;
            public databaseAlias: string;
            public expirationDateUtc: Date;
            public tokenBase64: string;
            public tokenType: number;
            public developerId: string;
            public developerSecret: string;
            public loginToken: string;
            constructor();
        }
        module services {
            class apiServiceCoreSettings {
                public VERSION: string;
                public ServiceInterface: any;
                public Signers: any;
                public XML: any;
                public util: serviceCoreUtility;
                constructor();
            }
            class base64Helper {
                public _serviceCoreUtil: serviceCoreUtility;
                constructor(serviceCoreUtil: serviceCoreUtility);
                public encode(string): string;
                public decode(string): string;
            }
            class bufferHelper {
                public _serviceCoreUtil: serviceCoreUtility;
                constructor(serviceCoreUtil: serviceCoreUtility);
                public concat(buffers);
            }
            class cryptoHelper {
                public _serviceCoreUtil: serviceCoreUtility;
                public cryptoLib: any;
                constructor(serviceCoreUtil: serviceCoreUtility);
                public crc32Table: number[];
                public crc32(data): number;
                public hmac(key, string, digest, fn);
                public md5(data, digest);
                public sha256(string, digest);
                public toHex(data): string;
                public createHash(algorithm);
            }
            class dateHelper {
                public _serviceCoreUtil: serviceCoreUtility;
                constructor(serviceCoreUtil: serviceCoreUtility);
                public getDate(): Date;
                public iso8601(date);
                public rfc822(date);
                public unixTimestamp(date): number;
                public from(date): Date;
                public format(date, formatter);
            }
            class endpoint {
                public port: number;
                public protocol: string;
                constructor(endpoint, util: serviceCoreUtility);
            }
            class httpRequest {
                public statusCode: string;
                public headers: any;
                public body: string;
                public path: string;
                public method: string;
                public endpoint: endpoint;
                public region: string;
                constructor(currentEndpoint, region, method, currentHeaders, data, util: serviceCoreUtility);
                public pathname(): string;
                public search(): string;
            }
            class serviceCoreUtility {
                public serviceCoreSettings: apiServiceCoreSettings;
                public base64: base64Helper;
                public buffer: bufferHelper;
                public string: stringHelper;
                public date: dateHelper;
                public crypto: cryptoHelper;
                constructor(apiServiceCoreSettings: apiServiceCoreSettings);
                public engine(): string;
                public userAgent(): string;
                public uriEscape(string): string;
                public uriEscapePath(string): string;
                public urlParse(url);
                public queryParamsToString(params): string;
                public readFileSync(path);
                public abort: {};
                public each(object, iterFunction): void;
                public arrayEach(array, iterFunction): void;
                public update(obj1, obj2);
                public merge(obj1, obj2);
                public copy(object);
                public isEmpty(obj): bool;
                public isType(obj, type): bool;
                public error(err, options);
                public inherit(klass, features);
                public mixin();
            }
            class stringHelper {
                public _serviceCoreUtil: serviceCoreUtility;
                constructor(serviceCoreUtil: serviceCoreUtility);
                public byteLength(str);
            }
        }
    }
    module forms {
        class formFieldCollection {
            public _ffColl: any;
            constructor(ffColl);
            public getFormFieldByName(name);
            public getFormFieldById(id);
            public getFieldArray();
        }
        class formsManager {
        }
    }
    module groups {
        class groupsManager {
        }
    }
    module library {
        class libraryManager {
        }
    }
    module sites {
        class sitesManager {
        }
    }
    module users {
        class usersManager {
        }
    }
}
