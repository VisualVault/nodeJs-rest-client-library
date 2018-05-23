var clientLibrary = require('../vvRestApi');
var logger = require('../log');


//If not using IISNode
var VVScriptFilePath = './lib/VVRestApi/VVRestApiNodeJS/files/';
var VVScriptFileRequirePath = '../files/';

//If using IISNode
//var VVScriptFilePath = './files/';
//var VVScriptFileRequirePath = '../files/';

exports.processRequest = function (req, res) {
    logger.info('Call from VisualVault to scheduledscripts');

    var fs = require('fs');
    var Q = require('q');
    var meta = { code: 200, error: '' };
    var attemptCount = 0;

    var script = null;
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
    } else {
        console.log('Error, body of request did not contain key/value pairs for script and baseurl');
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for script and baseurl";
        res.json(200, meta);
    }

    if (script === null) {
        console.log('Error, body of request did not contain key/value pairs for script');
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for script";
        res.json(200, meta);
    }

    if (baseUrl === null) {
        console.log('Error, body of request did not contain key/value pairs for baseurl');
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for baseurl";
        res.json(200, meta);
    }


    if (typeof req.query.id === 'string') {
        var fileId = req.query.id;

        //todo: need config parameter for this path location 
        console.log('attempting to write script to ' + VVScriptFilePath + fileId + ".js");

        //todo: need config parameter for this path location 
        fs.writeFile(VVScriptFilePath + fileId + ".js", script, function (err) {
            if (err) {

                logger.info("Error, unable to write script file: " + err);

                console.log('Error, unable to write script file: ' + err);

                meta.code = 500;
                meta.error = "File System error, unable to write script file.";
                res.json(200, meta);
            } else {
                console.log("loading scheduledScript script file");

                try {
                    for (var p in require.cache) {
                        if (p.indexOf(fileId) > -1) {
                            logger.info("deleting cached scheduledScript script file: " + p);
                            delete require.cache[p];
                        }
                    }
                } catch (ex) {
                    logger.info("error loading scheduledScript script file" + ex);
                }

                logger.info("Loading scheduledScript script file");

                //load the script file we just saved to the filesystem
                var scheduledScript = require("../files/" + fileId);

                // YOU CAN SWAP OUT YOUR SCRIPT HERE IF YOU WANT TO TEST
                //var scheduledScript = require("../test.js");

                //get the customer name and other credentials
                var params = scheduledScript.getCredentials();

                //add baseUrl to parameters for vvClient
                params.baseUrl = baseUrl;

                logger.info("calling vvAuthorize.getVaultApi");

                var vvAuthorize = new clientLibrary.authorize();

                //making call to vvClient to get access token
                Q
                    .when(
                         vvAuthorize.getVaultApi(params.clientId, params.clientSecret, params.userId, params.password, params.baseUrl, params.customerAlias, params.databaseAlias)
                    )
                    .then(function (result) {
                        logger.info("Calling the scheduledScript's Main method");

                     scheduledScript.main(result, res, token);
                    })
                    .fail(function (error) {
                        logger.info("Error response from vvAuthorize.getVaultApi: " + error.message);
                        
                        meta.code = 401;
                        meta.error = "Unable to acquire access token";
                        res.json(200, meta);
                    });
            }
        });
    } else {
        meta.code = 400;
        meta.error = "Script file Id not specified";
        res.json(200, meta);
    }
};


