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
var vaultServerUrl = "http://YOURSERVER/VISUALVAULT_VIRTUAL_DIRECTORY_IF_IT_EXISTS/";
var customerAlias = "CustomerToLoginTo";
var databaseAlias = "DatabaseAliasOfCustomer";
var apiKey = "YOUR API KEY / DEVELOPER ID HERE";
var developerId = "SAME AS API KEY OR ANOTHER DEVELOPER ID";
var developerSecret = "DEVELOPER SECRET HERE";

var vvClientHandler = require('./VVClient.js');

//Then run 'c:\<current directory>\node loginTest.js'
// console.log("API Key: " + apiKey);
// console.log("Developer ID: " + developerId);
// console.log("Developer Secret: " + developerSecret);

var vvClient = new vvClientHandler(customerAlias, databaseAlias, apiKey, developerId, developerSecret, vaultServerUrl, true);
vvClient.acquireSecurityToken();

 // Q
	// .when(
		// vvClient.acquireSecurityToken()
	// )
	// .then(
		// function () {
			// console.log("Calling the user's Main method");

			// //user.main(ffColl, vvClient, res);
		// }
	// )
	// .fail(
		// function (tokenError) {
			// console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);
			// attemptCount++;
			// //scriptSecondAttempt(req, res, baseUrl, ffColl, user, attemptCount);
		// }
// );
