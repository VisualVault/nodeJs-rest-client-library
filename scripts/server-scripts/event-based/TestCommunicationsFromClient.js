/*
    Script Name:   TestScript   

    Example of a Scheduled Script used to test communications
*/

//import Q NPM to assist with complex async promise patterns
var Q = require('q');

//import logging script
var logger = require("../../../../lib/VVRestApi/VVRestApiNodeJs/log");

//getCredentials function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//Use this as a template and replace with your API credentials and VisualVault Customer/Database alias values
module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "Procom";
    options.databaseAlias = "Default";
    options.userId = "tod.test";
    options.password = "password";
    options.clientId = "29e48740-75b6-401e-91f9-1c0b760bb06c";
    options.clientSecret = "JU3XtoUoBxgAQWjrfLu6jP31CBT66VPtZQ5L0ABa50Q=";
    return options;
};

//main function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//main function parameters (ffCollection, vvClient, response) are provided.

//ffCollection parameter: Array of name/value pairs. Typically used to send form field names and values from client JavaScript
//                        Also commonly used to send additional name/value pairs which are not form fields
//vvClient parameter:  This is an object that provides access to VisualVault API end points
//
//response parameter:  Response parameter used to send the http response back to client.
module.exports.main = function (ffCollection, vvClient, response) {
    logger.info('Start of the process Node.js test at ' + Date());

    var nodeJsTest = function(){ 
        var def = Q.defer(); 
        var firstName = ffCollection.getFormFieldByName('FirstName');      
        var lastName = ffCollection.getFormFieldByName('LastName');            
      
        console.log('Data:' + firstName + ' ' + lastName);

        var response = {
            'FirstName': firstName,
            'LastName': lastName
        }

        def.resolve(JSON.stringify(response));

        return def.promise
    }; 

    Q
        .allSettled([
            nodeJsTest()
        ])           
        .then(
            function(promises){
                var result = JSON.parse(promises[0].value)
                if(result.hasOwnProperty('error') || result.hasOwnProperty('message')){
                    result['ValidAddress'] = false;
                    return response.json(result);
                }
                else if(result.hasOwnProperty('FirstName') && result.hasOwnProperty('LastName')){
                    result['IsValid'] = true;
                    return response.json(result);
                    }
                else{
                    return response.json(result);
                }
            }
        )  

};