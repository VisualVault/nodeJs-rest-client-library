/*
    Script Name:   VerifyAddress   

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
    logger.info('Start of the process AddressVerification at ' + Date());

    var verifyUsStatehood = function(addressObject){
        var def = Q.defer();
        var state = addressObject.state.toUpperCase();

        if (usStates.indexOf(state) > 0 || usStatesAbr.indexOf(state) > 0){
            return true;
        }
        else{
            return false;
        }                    
    };

    var verifyAddress = function(){ 
        var def = Q.defer(); 
        var addressObject = ffCollection.getFormFieldByName('addressObject');      
        var isUsState = verifyUsStatehood(addressObject);
        
        if(isUsState){
            var request = require('request'),
                username = "test_3f51832e23159009c63159b06b2ef07f556",
                password = "",
                url = "https://api.lob.com/v1/us_verifications",
                auth = "Basic " + new Buffer(username + ":" + password).toString("base64"),
                formBody = {
                        'primary_line':addressObject.address1,
                        'secondary_line':addressObject.address2,
                        'components':{
                            'city':addressObject.city,
                            'state':addressObject.state,
                            'zip_code':addressObject.zip                            
                        }                        
                    };
                
            request.post(
                {
                    url : url,
                    headers : {
                        "Authorization" : auth
                    },
                    form : formBody
                },
                function (error,response,body){
                    def.resolve(body);
                }
            )
        }

        else {
            var notStateResponse = {
                'ValidAddress': false
            }

            def.resolve(JSON.stringify(notStateResponse));
        }

        return def.promise
    }; 

    Q
        .allSettled([
            verifyAddress()
        ])           
        .then(
            function(promises){
                var result = JSON.parse(promises[0].value)
                if(result.hasOwnProperty('error') || result.hasOwnProperty('message')){
                    result['ValidAddress'] = false;
                    return response.json(result);
                }
                else if(result.hasOwnProperty('address') && !result.hasOwnProperty('message')){
                    result['ValidAddress'] = true;
                    return response.json(result);
                    }
                else{
                    return response.json(result);
                }
            }
        )  

};

var usStates = [
    'ALABAMA',
    'ALASKA',
    'ARIZONA',
    'ARKANSAS',
    'CALIFORNIA',
    'COLORADO',
    'CONNECTICUT',
    'DELAWARE',
    'DISTRICT OF COLUMBIA',
    'FLORIDA',
    'GEORGIA',
    'HAWAII',
    'IDAHO',
    'ILLINOIS',
    'INDIANA',
    'IOWA',
    'KANSAS',
    'KENTUCKY',
    'LOUISIANA',
    'MAINE',
    'MARYLAND',
    'MASSACHUSETTS',
    'MICHIGAN',
    'MINNESOTA',
    'MISSISSIPPI',
    'MISSOURI',
    'MONTANA',
    'NEBRASKA',
    'NEVADA',
    'NEW HAMPSHIRE',
    'NEW JERSEY',
    'NEW MEXICO',
    'NEW YORK',
    'NORTH CAROLINA',
    'NORTH DAKOTA',
    'OHIO',
    'OKLAHOMA',
    'OREGON',
    'PENNSYLVANIA',
    'RHODE ISLAND',
    'SOUTH CAROLINA',
    'SOUTH DAKOTA',
    'TENNESSEE',
    'TEXAS',
    'UTAH',
    'VERMONT',
    'VIRGINIA',
    'WASHINGTON',
    'WEST VIRGINIA',
    'WISCONSIN',
    'WYOMING'
];

var usStatesAbr = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']