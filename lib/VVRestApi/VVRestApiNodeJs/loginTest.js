var fs = require('fs');
var Q = require('q');
var vaultServerUrl = 'http://localhost/visualvault4_0_0/';
var customerAlias = 'VaultTest';
var databaseAlias = 'Main';
var apiKey = 'f1723c26-d4f0-463e-9d16-da5e349119a8';
var developerId = 'f1723c26-d4f0-463e-9d16-da5e349119a8';
var developerSecret = 'hTxqwYYjnhIbl3IRmSlRYSZOYhWJwFdxX75CboH2qpc=';
var vvClientHandler = require('./VVRestApi');
var vvAuthorize = require('./authorize');
Q.when(vvAuthorize.getVaultApi(apiKey, developerId, developerSecret, vaultServerUrl, customerAlias, databaseAlias)).then(function (result) {
    console.log("getVaultApi succeeded");
    debugger;

}).fail(function (tokenError) {
    console.log("Supervisor: Error response from getVaultApi: " + tokenError.message);
});
