exports.testsite = function (req, res) {
    res.end('VisualVault Node Server [iisnode version is ' + process.env.IISNODE_VERSION + ', node version is ' + process.version + ']');
};
exports.scripts = function (req, res) {
    console.log('Call from VisualVault to scripts');
    var fs = require('fs');
    var Q = require('q');
    var meta = {
        code: 400,
        error: ''
    };
    var formFieldCollection = require("../vault/forms/formFieldCollection");
    var attemptCount = 0;
    if(typeof req.body.script === 'undefined') {
        console.log('Error, undefined form value named script');
        meta.code = 201;
        meta.error = "script not found";
        res.json(201, meta);
    }
    var script = req.body.script;
    if(typeof req.body.baseUrl === 'undefined') {
        console.log('Error, undefined form value named baseUrl');
        meta.code = 201;
        meta.error = "baseUrl not found";
        res.json(201, meta);
    }
    var baseUrl = req.body.baseUrl;
    var ffColl = new formFieldCollection(JSON.parse(req.body.fields));
    if(typeof req.query.id === 'string') {
        var fileId = req.query.id;
        console.log('attempting to write script to ' + "./files/" + fileId + ".js");
        fs.writeFile("./files/" + fileId + ".js", script, function (err) {
            if(err) {
                console.log('Error, unable to write script file: ' + err);
                meta.code = 201;
                meta.error = "File System error, unable to write script file.";
                res.json(201, meta);
            } else {
                console.log("loading user script file");
                var user = require("../files/" + fileId);
                var params = user.getCredentials();
                params.baseUrl = baseUrl;
                var clientLibrary = require('./vvRestApi');
                var vvAuthorize = new clientLibrary.authorize();
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
    var params = user.getCredentials();
    params.baseUrl = baseUrl;
    var Client = require('../vault/vaultApi');
    var vvClient = new Client(params);
    var Q = require('q');
    var meta = {
        code: 200,
        error: ''
    };
    Q.when(vvClient.acquireSecurityToken()).then(function () {
        console.log("Calling the user's Main method");
        user.main(ffColl, vvClient, res);
    }).fail(function (tokenError) {
        console.log("Supervisor: Error response from acquireSecurityToken: " + tokenError.message);
        if(attemptCount < 6) {
            attemptCount++;
            scriptSecondAttempt(req, res, baseUrl, ffColl, user, attemptCount);
        } else {
            meta.code = 201;
            meta.error = "Unable to acquire security token";
            res.json(201, meta);
        }
    });
};
