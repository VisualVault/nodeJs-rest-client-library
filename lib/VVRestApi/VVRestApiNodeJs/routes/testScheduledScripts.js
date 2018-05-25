var clientLibrary = require('../vvRestApi');
var logger = require('../log');

var VVScriptFilePath = './lib/VVRestApi/VVRestApiNodeJS/files/';
var VVScriptFileRequirePath = '../files/';

exports.processRequest = function (req, res) {
    logger.info('Request received for test script');

    var fs = require('fs');
    var Q = require('q');
    var meta = { code: 200, error: '' };
    var attemptCount = 0;

    var script = null;
    var scriptName = null;
    var baseUrl = null;
    var token = null;

    if (req.body instanceof Array) {
        for (var x = 0; x < req.body.length; x++) {
            var key = req.body[x].Key;
            var value = req.body[x].Value;

            if (key == "script") {
                //retrieve script from form encoded post
                script = value;
            } else if (key == "baseUrl") {
                //retrieve baseUrl from form encoded post
                baseUrl = value;
            } else if (key == "token") {
                //retrieve token from form encoded post
                token = value;
            }
        }
    } else if (typeof (req.body.script) != 'undefined' && typeof (req.body.baseUrl) != 'undefined') {
        //retrieve script from form encoded post
        script = req.body.script;

        //retrieve baseUrl from form encoded post
        baseUrl = req.body.baseUrl;

        //retrieve token from form encoded post
        token = req.body.token;
    } else if (typeof (req.params.name) != 'undefined') {
        //retrieve script name from query string
        scriptName = req.params.name;

        if (typeof (req.query.baseUrl) != 'undefined') {
            //retrieve baseUrl from query string
            baseUrl = req.query.baseUrl;
        }
        
    } else {
        console.log('Error, body of request did not contain key/value pairs for script and baseurl');
        logger.error("Error, body of request did not contain key/value pairs for baseurl. http 400 response returned.");
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for script and baseurl";
        res.json(200, meta);
    }

    if (script === null && scriptName === null) {
        console.log('Error, body of request did not contain key/value pairs for script');
        logger.error("Error, body of request did not contain key/value pairs for script. http 400 response returned.");

        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for script";
        res.json(200, meta);
    }

    if (baseUrl === null && scriptName === null) {
        console.log('Error, body of request did not contain key/value pairs for baseurl');
        logger.error("Error, body of request did not contain key/value pairs for baseurl. http 400 response returned.");
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for baseurl";
        res.json(200, meta);
    }


    if (typeof scriptName === 'string') {
        try {

            logger.info("Loading test script file: " + scriptName + ".js");

            //load the requested script file
            var testScript = require("../../../../scripts/test-scripts/scheduled/" + scriptName + ".js");

            //get the customer name and other credentials
            var params = testScript.getCredentials();

            //add baseUrl to parameters for vvClient
            if (!params.baseUrl) {
                params.baseUrl = baseUrl;
            }

            var vvAuthorize = new clientLibrary.authorize();

            //making call to vvClient to get access token
            Q
                .when(
                    vvAuthorize.getVaultApi(params.clientId, params.clientSecret, params.userId, params.password, params.baseUrl, params.customerAlias, params.databaseAlias)
                )
                .then(function (result) {
                    logger.info("Calling the test script's Main method");

                    testScript.main(result, res, token);
                })
                .fail(function (error) {
                    logger.error("Error response from vvAuthorize.getVaultApi. http 401 response returned. " + error.message);

                    meta.code = 401;
                    meta.error = "Unable to acquire access token";
                    res.json(200, meta);
                });
        } catch (ex) {
            logger.error("http 500: Error Loading scheduled script file: " + scriptName + ".js. http 500 response returned. " + ex);

            meta.code = 500;
            meta.error = "Unable to Load script file: " + scriptName + ".js";
            res.json(500, meta);
        }

    } else {
        meta.code = 400;
        meta.error = "Script name not specified";
        res.json(200, meta);
    }
};


