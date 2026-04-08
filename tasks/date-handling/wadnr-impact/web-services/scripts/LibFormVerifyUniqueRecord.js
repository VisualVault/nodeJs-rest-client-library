/**
 * LibFormVerifyUniqueRecord
 * Category: Form
 * Modified: 2025-01-14T19:15:20.95Z by patricio.bonetto@visualvault.com
 * Script ID: Script Id: fd930ddb-abd2-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
var logger = require('../log');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = 'WADNR';
    options.databaseAlias = 'fpOnline';
    options.userId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.password = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    options.clientId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.clientSecret = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    return options;
};

module.exports.main = function (ffCollection, vvClient, response) {
    /*Script Name:   LibFormVerifyUniqueRecord
   Customer:      VisualVault library function.
   Purpose:       This process verifies that a form record is unique based on the passed in query criteria.  Library function.
   Parameters:    The following represent variables passed into the function:
                  templateId - A string representing the name of the template.
                  query - A string representing the matching conditions. Apostrophes in text fields must be escaped. 
                  formId - A string representing either the form ID or revision ID of the current form. 
   Return Array:  This function returns an object with the following properties:
                  status: 'Unique', 'Unique Matched', 'Not Unique', 'Error'
                  statusMessage: A short descriptive message
   Date of Dev:   11/17/2017
   Last Rev Date: 05/10/2019
   Revision Notes:
   11/17/2017 - Austin Noel: Initial creation of the business process.
   12/05/2017 - Jason Hatch: Needed a revision id returning when on record is found that is not matched.
   05/10/2019 - Kendra Austin: Update so that passed in 'formId' parameter can be either form ID or revision ID.
   */

    logger.info('Start of the process LibFormVerifyUniqueRecord at ' + Date());
    var Q = require('q');

    //Initialization of the return object
    var returnObj = {};

    //Initialization of the script variables
    var templateId = null;
    var query = null;
    var formId = null;

    //Function to query the form records for matching data instances
    var searchForms = function () {
        logger.info('Querying form records');

        var formParams = {};
        formParams.q = query.value;

        return vvClient.forms.getForms(formParams, templateId.value);
    };

    var result = Q.resolve();

    return result
        .then(function () {
            logger.info('Extracting and validating passed in fields');

            //Extract and validate the passed in parameters
            templateId = ffCollection.getFormFieldByName('templateId');
            query = ffCollection.getFormFieldByName('query');
            formId = ffCollection.getFormFieldByName('formId');

            if (!templateId || !templateId.value) {
                throw new Error("The 'templateId' parameter was not supplied or had an invalid value");
            } else if (!query || !query.value) {
                throw new Error("The 'query' parameter was not supplied or had an invalid value");
            } else if (!formId || !formId.value) {
                throw new Error("The 'formId' parameter was not supplied or had an invalid value");
            }

            //Fetch the form records
            return searchForms();
        })
        .then(function (formsResp) {
            var formData = JSON.parse(formsResp);

            if (formData.meta.status == '200') {
                if (formData.data.length > 1) {
                    //Multiple records returned - Not Unique
                    returnObj.status = 'Not Unique';
                    returnObj.statusMessage = 'The record is NOT unique';
                } else if (formData.data.length === 0) {
                    //No records returned - Unique
                    returnObj.status = 'Unique';
                    returnObj.statusMessage = 'The record is unique';
                } else {
                    //One record returned. Check to see if it matches the passed in formId
                    var form = formData.data[0];
                    if (form.instanceName === formId.value || form.revisionId === formId.value) {
                        //Record matches the passed in formId - Unique Matched
                        returnObj.status = 'Unique Matched';
                        returnObj.statusMessage = 'The record is unique';
                        returnObj.revisionId = form.revisionId;
                    } else {
                        //Record does not match the passed in formId - Not Unique
                        returnObj.status = 'Not Unique';
                        returnObj.statusMessage = 'The record is NOT unique';
                        returnObj.revisionId = form.revisionId;
                    }
                }
            } else {
                throw new Error('Call to query existing forms returned with an error.');
            }
        })
        .then(function () {
            //Return the response object
            return response.json(returnObj);
        })
        .catch(function (err) {
            logger.info(JSON.stringify(err));

            returnObj.status = 'Error';

            if (err && err.message) {
                returnObj.statusMessage = err.message;
            } else {
                returnObj.statusMessage = 'An error has occurred';
            }

            return response.json(returnObj);
        });
};
