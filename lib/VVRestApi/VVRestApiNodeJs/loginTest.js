var fs = require('fs');
var Q = require('q');

var vaultServerUrl = 'http://localhost/visualvault4_0_0/';
var customerAlias = 'VaultTest';
var databaseAlias = 'Main';
var apiKey = 'f1723c26-d4f0-463e-9d16-da5e349119a8';
var developerId = 'f1723c26-d4f0-463e-9d16-da5e349119a8';
var developerSecret = 'hTxqwYYjnhIbl3IRmSlRYSZOYhWJwFdxX75CboH2qpc=';

var clientLibrary = require('./vvRestApi');

var vvAuthorize = new clientLibrary.authorize();

Q.when(vvAuthorize.getVaultApi(apiKey, developerId, developerSecret, vaultServerUrl, customerAlias, databaseAlias)).then(function (result) {
    console.log("getVaultApi succeeded");
    var myVault = result;
    debugger;
    var folders = myVault.library.getFolders(null);

    var data = {
        q: "name eq 'My site'",
        fields: "id, name"
    };

    myVault.sites.getSites(data);

    var data2 = {
        q: null,
        fields: "id, name"
    };

    myVault.sites.getSites(data2);
}).fail(function (tokenError) {
    console.log("Supervisor: Error response: " + tokenError.message);
});

