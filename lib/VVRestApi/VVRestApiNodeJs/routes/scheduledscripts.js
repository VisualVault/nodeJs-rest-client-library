var clientLibrary = require('../vvRestApi');

exports.processRequest = function (req, res) {
    console.log('Call from VisualVault to scripts');
    var fs = require('fs');
    var Q = require('q');
    var meta = { code: 200, error: '' };
    var attemptCount = 0;

    if (typeof req.body.script === 'undefined') {
        console.log('Error, undefined form value named script');
        meta.code = 201;
        meta.error = "script not found";
        res.json(201, meta);
    }

    var script = req.body.script;

    if (typeof req.body.baseUrl === 'undefined') {
        console.log('Error, undefined form value named baseUrl');
        meta.code = 201;
        meta.error = "baseUrl not found";
        res.json(201, meta);
    }

    var baseUrl = req.body.baseUrl;

    if (typeof req.query.id === 'string') {
        var fileId = req.query.id;

        console.log('attempting to write script to ' + "./files/" + fileId + ".js");

        fs.writeFile("./files/" + fileId + ".js", script, function (err) {
            if (err) {
                console.log('Error, unable to write script file: ' + err);

                meta.code = 201;
                meta.error = "File System error, unable to write script file.";
                res.json(201, meta);
            } else {
                console.log("loading user script file");

                var user = require("../files/" + fileId);

                var params = user.getCredentials();

                params.baseUrl = baseUrl;

                var vvAuthorize = new clientLibrary.authorize();

                Q.when(vvAuthorize.getVaultApi(params.loginToken, params.developerId, params.developerSecret, params.baseUrl, params.customerAlias, params.databaseAlias)).then(function (result) {
                    console.log("Calling the user's Main method");

                    var myVault = result;
                    user.main(myVault, res);
                }).fail(function (tokenError) {
                    console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message + " \r\n attempts: " + attemptCount);
                    attemptCount++;
                    scriptSecondAttempt(req, res, baseUrl, user, attemptCount);
                });
            }
        });
    } else {
        meta.code = 201;
        meta.error = "Script file Id not specified";
        res.json(201, meta);
    }
};

var scriptSecondAttempt = function (req, res, baseUrl, user, attemptCount) {
    console.log("Starting another attempt at securing security token, attempt number: " + attemptCount);

    var params = user.getCredentials();

    params.baseUrl = baseUrl;

    var vvAuthorize = new clientLibrary.authorize();

    var Q = require('q');
    var meta = { code: 200, error: '' };

    Q.when(vvAuthorize.getVaultApi(params.loginToken, params.developerId, params.developerSecret, params.baseUrl, params.customerAlias, params.databaseAlias)).then(function (result) {
        console.log("Calling the user's Main method");

        var myVault = result;

        user.main(myVault, res);
    }).fail(function (tokenError) {
        console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);

        if (attemptCount < 6) {
            attemptCount++;
            scriptSecondAttempt(req, res, baseUrl, user, attemptCount);
        } else {
            meta.code = 201;
            meta.error = "Unable to acquire security token";
            res.json(201, meta);
        }
    });
};

