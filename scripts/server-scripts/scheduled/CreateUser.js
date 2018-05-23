/*
    Script Name:   TestScript   

    Example of a Scheduled Script used to create user accounts
*/

//import Q NPM to assist with complex async promise patterns
var Q = require('q');

//import logging script
var logger = require("../../../lib/VVRestApi/VVRestApiNodeJs/log");

//getCredentials function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//Use this as a template and replace with your API credentials and VisualVault Customer/Database alias values
module.exports.getCredentials = function () {
    var options = {};
    //baseUrl is optional
    //if script is sent from VV server, the baseUrl is provided
    //if executing the script via HTTP GET for testing then provide the baseUrl here
    options.baseUrl = "https://demo2.visualvault.com";
    options.customerAlias = "Procom";
    options.databaseAlias = "Default";
    options.userId = "tod.test";
    options.password = "password";
    options.clientId = "29e48740-75b6-401e-91f9-1c0b760bb06c";
    options.clientSecret = "JU3XtoUoBxgAQWjrfLu6jP31CBT66VPtZQ5L0ABa50Q=";
    return options;
};

//main function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//main function parameters (vvClient, response, scriptId) are provided when a Scheduled Script is called
module.exports.main = function (vvClient, response, scriptId) {
    logger.info("Start of TestScript on " + new Date());

    //Start some asynchronous work here
    /**
   * Creates user
   * Sends response to client side.
   * @param {Object} newUserData - The new user data used to create new user.
   * @param {String} siteInfo - The site GUID that will be used.
   */
    function createNewUser(newUserData, siteInfo) {
        Q.allSettled([vvClient.users.postUsers(userQuery, newUserData, siteInfo)]).then(function (promises) {
            var promiseNUser = promises[0];
            if (promiseNUser.state == 'fulfilled') {
                var postedUser = promiseNUser.value;
                if (postedUser.meta.status == '200') {
                    //The user was created.
                    logger.info('User ' + newUserID + ' was created');

                    var params = {};

                    // Set up calls to allow user to be added to one or more groups.
                    // Create array with call to add user to every group its associated with.
                    var addUserToGroupCalls = groupIDArray.map(function (groupID) {
                        return vvClient.groups.addUserToGroup(params, groupID, postedUser.data.id);
                    });
                } else {
                    //The user was found but problem occured.
                    logger.info('User creation for user ' + newUserID + ' had a problem.');
                    outputCollection[0] = 'User Not Created';
                    response.json(200, outputCollection);
                    return;
                }
            } else {
                logger.info('User creation for user ' + newUserID + ' returned unfulfilled.');
                outputCollection[0] = 'User Creation Returned Unfulfilled.';
                response.json(200, outputCollection);
                return;
            }
        });
    }

    //using the default home site Id
    //site Id (API call can be used to get other site Id values by name)
    siteInfo = '';

    var newUserData = {
        userid: newUserID,
        firstname: '',
        lastname: '',
        emailaddress: newUserID,
        password: passwordForUser,
        passwordNeverExpires: 'false',
        mustChangePassword: 'true',
        sendEmail: 'true'
    };


    //make request to VisualVault
    Q
        .allSettled(
            [
                createNewUser(newUserData, siteInfo),
            ]
        )
        .then(
            function (promises) {
                console.log("Results count: " + promises.length);

                //example of accessing returned data from request to VisualVault
                var createUserResponse = promises[0];
                if (createUserResponse.state == 'fulfilled') {
                    var responseData = JSON.parse(createUserResponse.value);

                    console.log(responseData);                   
                }

                meta.code = 200;
                meta.error = "responseData";
                response.json(200, meta);
            }
        )
        .fail(
            function (error) {
                console.log(error);

                meta.code = 400;
                meta.error = "An error occurred while accessing VisualVault";
                response.json(200, meta);
            }
        );


};