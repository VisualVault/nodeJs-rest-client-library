
// Send Email using VisualVault API

var logger = require('../log');

//Which client API this script is written against. 'v1' adds the compatibility shims;
//'v2' hands the script the visualvault-api 2.x client as it is.
module.exports.clientCompatibility = 'v1';

module.exports.getCredentials = function () {
    var options = {};
	
	//Your customer name found in the VisualVault URL
    options.customerAlias = "ACME";
	
	//Your customer database name found in the VisualVault URL
    options.databaseAlias = "main5";
	
	//User account credentials
    options.userId = "api.user";
    options.password = "REPLACE_WITH_PASSWORD";

	//Developer account or registered OAuth application credentials
	options.clientId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    options.clientSecret = "EXAMPLEonlyNOTaREALsecretREPLACEbeforeUse00=";

    return options;
};

module.exports.main = function (vvClient, response) {
    var currentDate = new Date();
    var Q = require('q');

    var emailParams = '';
    var emailData = {};
    emailData.recipients = 'someone@visualvault.com';
    emailData.body = 'test';
    emailData.subject = 'scheduled script test';

	//Q is a node package used to create promise objects
	//Node.js scripts are asynchronous!
	
    Q
        .allSettled(
            [
                vvClient.email.postEmails(emailParams, emailData)
            ]
        )
        .then(function (result) {
            logger.info("PostEmails success");
        })
        .fail(function (error) {
            logger.info("Error response from postEmails: " + error.message);
        });   
}