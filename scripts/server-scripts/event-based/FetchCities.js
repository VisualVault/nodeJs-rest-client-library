/*
    Script Name:   VerifyAddress   

    Example of a Scheduled Script used to test communications
*/

//import Q NPM to assist with complex async promise patterns
var Q = require('q');

//import logging script
var logger = require("../../../../lib/VVRestApi/VVRestApiNodeJs/log");

//Which client API this script is written against. 'v1' adds the compatibility shims;
//'v2' hands the script the visualvault-api 2.x client as it is.
module.exports.clientCompatibility = 'v2';

//getCredentials function will be called by the VisualVault NodeJs client library (/lib/VVRestApi/VVRestAiNodeJs/VVRestApi.js) when appropriate
//Use this as a template and replace with your API credentials and VisualVault Customer/Database alias values
module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "Customer";
    options.databaseAlias = "Default";
    options.userId = "api.user";
    options.password = "REPLACE_WITH_PASSWORD";
    options.clientId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    options.clientSecret = "EXAMPLEonlyNOTaREALsecretREPLACEbeforeUse00=";
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
    logger.info('Start of the process AddressVerification at ' + Date());

    var nodeScriptTestsFormTemplateId = 'ed2cf7d5-384a-e811-a97b-bb460c629346';
    
    var queryParams = {};
    queryParams.q = "[City] eq 'Tempe'";
    queryParams.fields = 'City,State,Zipcode,address1,address2';

    vvClient.forms.getForms(queryParams,nodeScriptTestsFormTemplateId).then(function(formsResp){
        var formData = JSON.parse(formsResp);      
        var formRecords = formData['data'];
        if (formRecords.length  >0 ){            
            return response.json({'success':true,'city':formData[0]['city']});            
        }
        else{
            return response.json({'success':false});
        }
    })
    .catch(function(err){
        return response.json({'success':false});
    });

};

