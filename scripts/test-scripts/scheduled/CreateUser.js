/*
    Script Name:   CreateUser   

    Example of a Scheduled Script 
    
    Creates a user account

    Script may be run manually by http://localhost:3000/TestScripts/Scheduled/CreateUser
*/

//import Q NPM to assist with complex async promise patterns
var Q = require('q');

//import logging script
var logger = require(require('path').dirname(require.main.filename) + "/log");

//getCredentials function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//Use this as a template and replace with your API credentials and VisualVault Customer/Database alias values
module.exports.getCredentials = function () {
    var options = {};
    //baseUrl is optional
    //if script is sent from VV server, the baseUrl is provided
    //if executing the script via HTTP GET for testing then provide the baseUrl here
    options.baseUrl = "https://demo.visualvault.com";
    options.customerAlias = "YOUR Customer Name";
    options.databaseAlias = "YOUR Database Name";
    options.userId = "YOUR User Id";
    options.password = "YOUR PASSWORD";
    options.clientId = "YOUR API KEY";
    options.clientSecret = "YOUR API KEY";
    options.audience = "OPTIONAL AUDIENCE KEY";
    return options;
};

//main function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//main function parameters (vvClient, response, scriptId) are provided when a Scheduled Script is called
module.exports.main = function (vvClient, response, scriptId) {
    logger.info("Start of TestScript on " + new Date());

    //configure parameters for fetching a list of user sites from VisualVault
    //We are asking for three fields and defining a query to filter the list where site name = "home"
    var siteParams = {};
    siteParams.fields = "id, name, sitetype";
    siteParams.q = "name eq 'home'";

    var PasswordLength = 8;
    var GeneratePassword = function () {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

        for (var i = 0; i < PasswordLength; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    };

    var GenerateUserId = function () {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < PasswordLength; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    };

    //we need a site Id to create a user account
    //fetch the home site and get its Id.  
    //Each customer should always have a 'home' uer site which is the default site.
    vvClient.sites.getSites(siteParams)
        .then(function (sitesResponse) {

            //convert response from VisualVault API to an object
            var siteData = JSON.parse(sitesResponse);

            //VisualVault API response always contains a 'data' property and a 'meta' property
            //data property will contain the data requested as either an object or an array of objects. In this case, we get an array of user site objects
            //Meta property will contain an object with two or more properties. If the "code" property is not = 200 then the "error" property will typically have a message
                
            
            var siteRecords = siteData['data'];

            if (siteRecords.length > 0) {
                //we only requested the home site so assume first item in array is the home site
                var siteId = siteRecords[0]['id']

                var newUserData = {
                    userid: GenerateUserId(),
                    firstname: 'Test',
                    lastname: 'User',
                    emailaddress: 'user@something.com',
                    password: GeneratePassword(),
                    passwordNeverExpires: 'false',
                    mustChangePassword: 'true',
                    sendEmail: 'true'
                };

                //first parameter for postUsers is ignored but must be empty array
                //second parameter is the user data
                //third parameter is the siteId GUID value
                vvClient.users.postUsers({}, newUserData, siteId)
                    .then(function (sitesResponse) {

                        //respons back to http client (typically a VisualVault form or the process scheduler)
                        response.json(200, "User account created");

                    }).fail(
                        function (error) {
                            console.log(error);

                            //Scheduled scripts should be sent a response back with two values.  
                            //The name assigned to each of the values is not important
                            //value 1 should be a boolean (true/false)
                            //value 2 is an optional string value which will be written to the history log for the scheduled script
                            
                            //If value 1 = true, this signals to the VisualVault scheduler that the script ran successfully.  
                            
                            //In the example below, { 'success': false, 'message':"Scheduled script finished with error" }
                            //value 1 = false, value 2 = "Scheduled script finished with error" 
                            
                            //respond back to http client (typically the VisualVault process scheduler)
                            //first parameter is the http status code (should be 200 unless unexpected error ocurred)
                            //second parameter should be an object with two properties
                            response.json(200, { 'success': false, 'message':"Scheduled script finished with error " + error });
                        }
                    );
            }
            else {
                response.json(200,{ 'success': false });
            }
        })
        .catch(function (err) {
            response.json(200,{ 'success': false, 'message': err });
        });
};