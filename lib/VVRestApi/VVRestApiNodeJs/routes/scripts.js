
var clientLibrary = require('../vvRestApi');

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
    var ffCollection = null;

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
        console.log('Error, body of request did not contain key/value pairs for script and baseurl');
        meta.code = 201;
        meta.error = "Error, body of request did not contain key/value pairs for script and baseurl";
        res.json(201, meta);
    }


    if (script === null) {
        console.log('Error, body of request did not contain key/value pairs for script');
        meta.code = 201;
        meta.error = "Error, body of request did not contain key/value pairs for script";
        res.json(201, meta);
    }

    if (baseUrl === null) {
        console.log('Error, body of request did not contain key/value pairs for baseurl');
        meta.code = 201;
        meta.error = "Error, body of request did not contain key/value pairs for baseurl";
        res.json(201, meta);
    }

    //instantiate the formfieldcollection
    ffCollection = new clientLibrary.forms.formFieldCollection(ffColl);

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

                try {
                    for (var p in require.cache) {
                        if (p.indexOf(fileId) > -1) {
                            console.log("deleting cached user script file: " + p);
                            delete require.cache[p];
                        }
                    }
                } catch (ex) {
                    console.log(ex);
                }

                //load the script file we just saved to the filesystem
                var user = require("../files/" + fileId);

                // YOU CAN SWAP OUT YOUR SCRIPT HERE IF YOU WANT TO TEST
                //var user = require("../files/TestVisualVault");

                //get the customer name and other credentials
                var params = user.getCredentials();

                //add baseUrl to parameters for vvClient
                params.baseUrl = baseUrl;

                //instantiate the authentication object
                var vvAuthorize = new clientLibrary.authorize();

                //call VisualVault to get access token
                Q
                    .when(
                        vvAuthorize.getVaultApi(params.userId, params.password, params.baseUrl, params.customerAlias, params.databaseAlias)
                    )
                    .then(function (result) {
                        console.log("Calling the user's Main method");

                        var myVault = result;
                        user.main(ffCollection, myVault, res);
                    })
                    .fail(function (tokenError) {
                        console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);
                        attemptCount++;

                        setTimeout((function () {
                            scriptSecondAttempt(req, res, baseUrl, ffCollection, user, attemptCount);
                        }), 500);

                    });
            }
        });
    } else {
        meta.code = 201;
        meta.error = "Script file Id not specified";
        res.json(201, meta);
    }
};


var scriptSecondAttempt = function (req, res, baseUrl, ffCollection, user, attemptCount) {
    console.log("Starting another attempt at securing security token, attempt number: " + attemptCount);


    //get the customer name and other credentials
    var params = user.getCredentials();

    //add baseUrl to parameters for vvClient
    params.baseUrl = baseUrl;

    var Q = require('q');
    var meta = { code: 200, error: '' };

    //instantiate the authentication object
    var vvAuthorize = new clientLibrary.authorize();

    //call VisualVault to get access token
    Q
        .when(
            vvAuthorize.getVaultApi(params.userId, params.password, params.baseUrl, params.customerAlias, params.databaseAlias)
        )
        .then(function (result) {
            console.log("Calling the user's Main method");

            var myVault = result;
            user.main(ffCollection, myVault, res);
        })
        .fail(function (tokenError) {
            console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);

            if (attemptCount < 20) {
                attemptCount++;

                setTimeout((function () {
                    scriptSecondAttempt(req, res, baseUrl, ffCollection, user, attemptCount);
                }), 500);

            } else {
                meta.code = 201;
                meta.error = "Unable to acquire security token";
                res.json(201, meta);
            }
        });
};


