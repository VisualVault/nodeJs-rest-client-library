/**
 * OrbipayEventWebHook
 * Category: Workflow
 * Modified: 2025-02-13T17:36:11.447Z by ross.rhone@visualvault.com
 * Script ID: Script Id: a65ca191-12d9-ef11-82bf-f990b504e413
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */

module.exports.getCredentials = function () {
    var options = {};
    options.baseUrl = 'https://vv5dev.visualvault.com';
    options.customerAlias = 'WADNR';
    options.databaseAlias = 'fpOnline';
    options.userId = 'e.bill.api';
    options.password = 'tempeEBILL#78';
    options.clientId = '364d6238-2ef5-401d-a53a-1702f11cfc3b';
    options.clientSecret = '5neJVeQ1ZWMqLoxXQ3UXeP2SxjstFxJXvrbAVSd0l2A=';
    return options;
};

module.exports.main = function (ffCollection, vvClient, response) {
    var jsonField = ffCollection.getFormFieldByName('json');

    var json = JSON.parse(jsonField.value);

    let json1 = new Object();
    json1.response = 'status';
    json1.value = 200;
    let jsonString = JSON.stringify(json1);

    response.json(200, jsonString);
};
