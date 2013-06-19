///<reference path='dts\node.d.ts' />
///<reference path='dts\express.d.ts' />

//you must have the following items installed:
//npm install js-yaml
//npm install q
//npm install request
//npm install node-uuid

//To debug install node-inspector
//npm install node-inspector
//then run this file with 'node --debug-brk loginTest.js'
//in another command window run 'node-inspector'

var fs = require('fs');
var Q = require('q');

//This is a test js file
//Enter the following credentials
/*
var vaultServerUrl = "http://YOURSERVER/VISUALVAULT_VIRTUAL_DIRECTORY_IF_IT_EXISTS/";
var customerAlias = "CustomerToLoginTo";
var databaseAlias = "DatabaseAliasOfCustomer";
var apiKey = "YOUR API KEY / DEVELOPER ID HERE";
var developerId = "SAME AS API KEY OR ANOTHER DEVELOPER ID";
var developerSecret = "DEVELOPER SECRET HERE";
*/
var vaultServerUrl = 'http://localhost/visualvault4_0_0/';
var customerAlias = 'VaultTest';
var databaseAlias = 'Main';
var apiKey = 'f1723c26-d4f0-463e-9d16-da5e349119a8';
var developerId = 'f1723c26-d4f0-463e-9d16-da5e349119a8';
var developerSecret = 'hTxqwYYjnhIbl3IRmSlRYSZOYhWJwFdxX75CboH2qpc=';

//Then run 'c:\<current directory>\node loginTest.js'
// console.log("API Key: " + apiKey);
// console.log("Developer ID: " + developerId);
// console.log("Developer Secret: " + developerSecret);

import clientLibrary = require('./vvRestApi');

var vvAuthorize = new clientLibrary.authorize();

 Q.when(
         vvAuthorize.getVaultApi(apiKey, developerId, developerSecret, vaultServerUrl, customerAlias, databaseAlias)
	 )
	 .then(
		 function (result) {
			 console.log("getVaultApi succeeded");
			 var myVault: clientLibrary.vvClient = result;
             
             var folders = myVault.getFolders(null);
		 }
	 )
	 .fail(
		 function (tokenError) {
			 console.log("Supervisor: Error response: " + tokenError.message);			 
		 }
 );
