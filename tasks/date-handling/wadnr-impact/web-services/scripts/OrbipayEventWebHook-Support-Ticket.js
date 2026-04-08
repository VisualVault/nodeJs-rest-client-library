/**
 * OrbipayEventWebHook - Support Ticket
 * Category: Workflow
 * Modified: 2025-01-23T18:21:06.54Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 852376a6-b6d9-ef11-82c3-a94025797804
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
module.exports.getCredentials = function () {
    var options = {};
    options.baseUrl = 'https://vv5dev.visualvault.com';
    options.customerAlias = 'WADNR';
    options.databaseAlias = 'fpOnline';
    options.userId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.password = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    options.clientId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.clientSecret = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    return options;
};

module.exports.main = function (ffCollection, vvClient, response) {
    var jsonField = ffCollection.getFormFieldByName('json');

    var json = JSON.parse(jsonField.value);

    response.json(200, json);
};
