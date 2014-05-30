
// Send Email using VisualVault API

module.exports.getCredentials = function () {
    var options = {};
	
	//Your customer name found in the VisualVault URL
    options.customerAlias = "ACME";
	
	//Your customer database name found in the VisualVault URL
    options.databaseAlias = "main5";
	
	//User account credentials
    options.userId = "vault.config";	
    options.password = "p";
	
	//Developer account or registered OAuth application credentials
	options.clientId = "fbb02e0c-2e97-4527-a6d7-9438d8b7b23c";
    options.clientSecret = "bBb+IlcCV5duoyyHvrYYamSrDVMGf+rgJ4Gbhn6R7N4=";

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
            console.log("PostEmails success");
        })
        .fail(function (error) {
            console.log("Error response from postEmails: " + error.message);            
        });   
}