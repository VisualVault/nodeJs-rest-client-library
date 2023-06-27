/*
    Script Name:   TestScript   

    Example of a Scheduled Script used to test communications
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
    options.audience = "";
    return options;
};

//main function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//main function parameters (vvClient, response, scriptId) are provided when a Scheduled Script is called
module.exports.main = function (vvClient, response, scriptId) {
    logger.info("Start of TestScript on " + new Date());

    //Start some asynchronous work here

    //return back to the server with message that the process has been started
    logger.info("Start of logic at for TestCommunications.js on " + new Date());
    
    response.json(200, 'Process has been initiated to run.  Check back in the log to see completion information.');

};