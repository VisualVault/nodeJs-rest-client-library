/* Copyright 2013 Auersoft */
///<reference path='..\dts\node.d.ts' />
///<reference path='..\dts\express.d.ts' />
///<reference path='..\dts\vvRestApi.d.ts' />

exports.testsite = function (req, res) {
    res.end('VisualVault Node Server [iisnode version is ' + process.env.IISNODE_VERSION + ', node version is ' + process.version + ']');
};

exports.scripts = function (req, res) {

    console.log('Call from VisualVault to scripts');
    var fs = require('fs');
    var Q = require('q');
    var meta = { code: 400, error: ''};
    var formFieldCollection = require("../vault/forms/formFieldCollection");
    var attemptCount = 0;

    // create the FormFieldCollection object populating
    // with the form fields from the body of the request
    if (typeof req.body.script === 'undefined') {
        console.log('Error, undefined form value named script');
        meta.code = 201;
        meta.error = "script not found";
        res.json(201, meta);
    }

    //retrieve script from form encoded post
    var script = req.body.script;

    if (typeof req.body.baseUrl === 'undefined') {
        console.log('Error, undefined form value named baseUrl');
        meta.code = 201;
        meta.error = "baseUrl not found";
        res.json(201, meta);
    }

    //retrieve baseUrl from form encoded post
    var baseUrl = req.body.baseUrl;

    //create formfield collection from form encoded post
    var ffColl = new formFieldCollection(JSON.parse(req.body.fields));

    //test for valid script id on the queryString
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

                //load user file
                var user = require("../files/" + fileId);
                //var user = require("../userscript");

                //get the customer name and other credentials
                var params: vvRestApi.common.loginCredentials = user.getCredentials();

                //add baseUrl to parameters for vvClient
                params.baseUrl = baseUrl;

                //read the vvClient file
                var clientLibrary: vvRestApi = require('./vvRestApi');

                var vvAuthorize: vvRestApi.authorize = new clientLibrary.authorize();

                //making call to vvClient to get access token
                Q
                    .when(
                            vvAuthorize.getVaultApi(params.loginToken, params.developerId, params.developerSecret, params.baseUrl, params.customerAlias, params.databaseAlias)
                    )
                    .then(
                        function (result) {
                            console.log("Calling the user's Main method");

                            var myVault: vvRestApi.vvClient = result;
                            user.main(ffColl, myVault, res);
                        }
                    )
                    .fail(
                        function (tokenError) {
                            console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);
                            attemptCount++;
                            scriptSecondAttempt(req, res, baseUrl, ffColl, user, attemptCount);
                        }
                );
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

    //read the vvClient file
    var Client = require('../vault/vaultApi');

    //create the vvclient object
    var vvClient = new Client(params);


    var Q = require('q');
    var meta = { code: 200, error: '' };

    //making call to vvClient to get access token
    Q
        .when(
            vvClient.acquireSecurityToken()
        )
        .then(
            function () {
                console.log("Calling the user's Main method");

                user.main(ffColl, vvClient, res);
            }
        )
        .fail(
            function (tokenError) {
                console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);

                if (attemptCount < 6) {
                    attemptCount++;
                    scriptSecondAttempt(req, res, baseUrl, ffColl, user, attemptCount);
                } else {
                    meta.code = 201;
                    meta.error = "Unable to acquire security token";
                    res.json(201, meta);
                }
            }
    );

    
};