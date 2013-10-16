/* Copyright 2013 Auersoft */
///<reference path='..\dts\node.d.ts' />
///<reference path='..\dts\express.d.ts' />
define(["require", "exports", '../vvRestApi'], function(require, exports, __clientLibrary__) {
    var clientLibrary = __clientLibrary__;

    exports.testsite = function (req, res) {
        res.end('VisualVault Node Server [iisnode version is ' + process.env.IISNODE_VERSION + ', node version is ' + process.version + ']');
    };

    exports.scripts = function (req, res) {
        console.log('Call from VisualVault to scripts');
        var fs = require('fs');
        var Q = require('q');
        var meta = { code: 400, error: '' };
        var attemptCount = 0;

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
                    ffColl = JSON.parse(value);
                }
            }
        } else {
            console.log('Error, body of request did not contain key/value pairs for script and baseurl values');
            meta.code = 201;
            meta.error = "Error, body of request did not contain key/value pairs for script and baseurl values";
            res.json(201, meta);
        }

        if (script === null) {
            console.log('Error, undefined form value named script');
            meta.code = 201;
            meta.error = "script not found";
            res.json(201, meta);
        }

        if (baseUrl === null) {
            console.log('Error, undefined form value named baseUrl');
            meta.code = 201;
            meta.error = "baseUrl not found";
            res.json(201, meta);
        }

        if (typeof req.query.id === 'string') {
            //set filename to id of script
            var fileId = req.query.id;

            console.log('attempting to write script to ' + "./files/" + fileId + ".js");

            //write script out to filesystem
            fs.writeFile("./files/" + fileId + ".js", script, function (err) {
                if (err) {
                    console.log('Error, unable to write script file: ' + err);

                    meta.code = 201;
                    meta.error = "File System error, unable to write script file.";
                    res.json(201, meta);
                } else {
                    console.log("loading user script file");

                    try  {
                        for (var p in require.cache) {
                            if (p.indexOf(fileId) > -1) {
                                console.log("deleting cached user script file: " + p);
                                delete require.cache[p];
                            }
                        }
                    } catch (ex) {
                        console.log(ex);
                    }

                    var user = require("../files/" + fileId);

                    // YOU CAN SWAP OUT YOUR SCRIPT HERE IF YOU WANT TO TEST
                    //var user = require("../userscript");
                    //get the customer name and other credentials
                    var params = user.getCredentials();

                    //add baseUrl to parameters for vvClient
                    params.baseUrl = baseUrl;

                    var vvAuthorize = new clientLibrary.authorize();

                    //making call to vvClient to get access token
                    Q.when(vvAuthorize.getVaultApi(params.loginToken, params.developerId, params.developerSecret, params.baseUrl, params.customerAlias, params.databaseAlias)).then(function (result) {
                        console.log("Calling the user's Main method");

                        var myVault = result;
                        user.main(ffColl, myVault, res);
                    }).fail(function (tokenError) {
                        console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);
                        attemptCount++;
                        scriptSecondAttempt(req, res, baseUrl, ffColl, user, attemptCount);
                    });
                }
            });
        } else {
            meta.code = 201;
            meta.error = "Script file Id not specified";
            res.json(201, meta);
        }
    };

    var scriptSecondAttempt = function (req, res, baseUrl, ffColl, user, attemptCount) {
        console.log("Starting another attempt at securing security token, attempt number: " + attemptCount);

        //get the customer name and other credentials
        var params = user.getCredentials();

        //add baseUrl to parameters for vvClient
        params.baseUrl = baseUrl;

        var Q = require('q');
        var meta = { code: 200, error: '' };

        //read the vvClient file
        var vvAuthorize = new clientLibrary.authorize();

        //making call to vvClient to get access token
        Q.when(vvAuthorize.getVaultApi(params.loginToken, params.developerId, params.developerSecret, params.baseUrl, params.customerAlias, params.databaseAlias)).then(function (result) {
            console.log("Calling the user's Main method");

            var myVault = result;
            user.main(ffColl, myVault, res);
        }).fail(function (tokenError) {
            console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);

            if (attemptCount < 6) {
                attemptCount++;
                scriptSecondAttempt(req, res, baseUrl, ffColl, user, attemptCount);
            } else {
                meta.code = 201;
                meta.error = "Unable to acquire security token";
                res.json(201, meta);
            }
        });
    };
});
//# sourceMappingURL=Scripts.js.map
