var clientLibrary = require('../VVRestApi');
var logger = require('../log');

//Linux file paths
var VVScriptFilePath = 'files/';
var VVScriptFileRequirePath = '../files/';

//Windows file paths
//var VVScriptFilePath = './files/';
//var VVScriptFileRequirePath = '../files/';

exports.testsite = function (req, res) {
    res.end('Hello. VisualVault Node.Js execution environment. Node Version ' + process.version);
};



exports.scripts = function (req, res) {
    console.log('Call from VisualVault to scripts');
    var fs = require('fs');
    var Q = require('q');
    var meta = { code: 200, error: '' };

    var script = null;
    var baseUrl = null;
    var ffColl = null;

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
            } else if (key == "fields") {
                //create formfield collection from form encoded post
                if (value && value instanceof Array) {
                    ffColl = value;
                } else if (value) {
                    ffColl = JSON.parse(value);
                }
            }
        }
    } else if (typeof (req.body.script) != 'undefined' && typeof (req.body.baseUrl) != 'undefined') {
        //retrieve script from form encoded post
        script = req.body.script;

        //retrieve baseUrl from form encoded post
        baseUrl = req.body.baseUrl;

        if (typeof (req.body.fields) != 'undefined') {
            //create formfield collection from form encoded post
            ffColl = JSON.parse(req.body.fields);
        }
    } else {
        logger.info('Error, body of request did not contain key/value pairs for script and baseurl');
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for script and baseurl";
        res.json(200, meta);
    }


    if (script === null) {
        logger.info('Error, body of request did not contain key/value pairs for script');
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for script";
        res.json(200, meta);
    }

    if (baseUrl === null) {
        logger.info('Error, body of request did not contain key/value pairs for baseurl');
        meta.code = 400;
        meta.error = "Error, body of request did not contain key/value pairs for baseurl";
        res.json(200, meta);
    }

    //instantiate the formfieldcollection
    var ffCollection = new clientLibrary.forms.formFieldCollection(ffColl);

    if (typeof req.query.id === 'string') {
        //set filename to id of script
        var fileId = req.query.id;
        var scriptToExecute = "";

        if (fileId == "localScript") {

            var scriptFilePath = '../../../../outsideScripts/' + script + ".js";

            try {
                require.resolve(scriptFilePath);
            }
            catch (e) {
                scriptFilePath = VVScriptFilePath + script + ".js";
            }

            scriptToExecute = require(scriptFilePath);

            //get the customer name and other credentials
            var params = scriptToExecute.getCredentials();

            //add baseUrl to parameters for vvClient
            params.baseUrl = baseUrl;

            //instantiate the authentication object
            var vvAuthorize = new clientLibrary.authorize();

            //call VisualVault to get access token
            Q
                .when(
                vvAuthorize.getVaultApi(params.clientId, params.clientSecret, params.userId, params.password, params.baseUrl, params.customerAlias, params.databaseAlias)
                )
                .then(function (result) {
                    logger.info("Calling the scriptToExecute's Main method");

                    scriptToExecute.main(ffCollection, result, res);
                })
                .fail(function (error) {
                    if (error.message && (error.message.indexOf('Authorization') >= 0 || error.message.indexOf('token') >= 0)) {
                        //error while acquiring access token
                        meta.code = 401;
                        meta.error = "Unable to acquire access token";
                        logger.info("Error response from acquire access token");
                    } else {
                        //error while executing script
                        meta.code = 500;
                        meta.error = error;
                        logger.info(error);
                    }

                    res.json(200, meta);
                });

        } else {

            logger.info('attempting to write script to ' + VVScriptFilePath + fileId + ".js");

            //write script out to filesystem
            fs.writeFile(VVScriptFilePath + fileId + ".js", script, function (err) {
                if (err) {
                    logger.info('Error, unable to write script file: ' + err);

                    meta.code = 500;
                    meta.error = "File System error, unable to write script file.";
                    res.json(200, meta);

                    logger.error(params.baseUrl + " Unable to write script file. http 500 response returned. " + error.message);
                } else {
                    logger.info("loading scriptToExecute script file");

                    try {
                        for (var p in require.cache) {
                            if (p.indexOf(fileId) > -1) {
                                console.log("deleting cached scriptToExecute script file: " + p);
                                delete require.cache[p];
                            }
                        }
                    } catch (ex) {
                        console.log(ex);
                    }

                    // YOU CAN SWAP OUT YOUR SCRIPT HERE IF YOU WANT TO TEST
                    scriptToExecute = require(VVScriptFileRequirePath + fileId);
                    //scriptToExecute = require(VVScriptFileRequirePath);

                    //get the customer name and other credentials
                    var params = scriptToExecute.getCredentials();

                    //add baseUrl to parameters for vvClient
                    params.baseUrl = baseUrl;

                    //instantiate the authentication object
                    var vvAuthorize = new clientLibrary.authorize();

                    //call VisualVault to get access token
                    Q
                        .when(
                        vvAuthorize.getVaultApi(params.clientId, params.clientSecret, params.userId, params.password, params.baseUrl, params.customerAlias, params.databaseAlias)
                        )
                        .then(function (result) {
                            logger.info(params.baseUrl + " calling script " + scriptToExecute + " Main method");
                            
                            //result is the clientLibrary object returned after authentication
                            scriptToExecute.main(ffCollection, result, res);
                        })
                        .fail(function (error) {
                            if (error.message && (error.message.indexOf('Authorization') >= 0 || error.message.indexOf('token') >= 0)) {
                                //error while acquiring access token
                                meta.code = 401;
                                meta.error = "Unable to acquire access token";
                                logger.error(params.baseUrl + " Error acquiring access token. http 401 response returned. " + error.message);
                            } else {
                                //error while executing script
                                meta.code = 500;
                                meta.error = error;
                                logger.error(params.baseUrl + " Error acquiring access token. http 500 response returned. " + error.message);
                            }

                            res.json(200, meta);
                        });
                }
            });
        }
    }
    else {
        meta.code = 400;
        meta.error = "Script file Id not specified";
        logger.error(params.baseUrl + " Script file Id not specified. http 400 response returned. " + error.message);
        res.json(200, meta);
    }
};




