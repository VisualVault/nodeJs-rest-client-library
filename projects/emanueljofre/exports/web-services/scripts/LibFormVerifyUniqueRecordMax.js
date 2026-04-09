/**
 * LibFormVerifyUniqueRecordMax
 * Category: Workflow
 * Modified: 2025-08-04T22:35:42.737Z by max.coppola
 * Script ID: Script Id: ce992946-8371-f011-82ef-b68a666f1af9
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
var logger = require('../log');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "EmanuelJofre";
    options.databaseAlias = "Main";
    options.userId = "SiteMax.API";
    options.password = "dXnN*K6P";
    options.clientId = "de38846f-814a-4255-81a9-df67802e1a9e";
    options.clientSecret = "KQhAqDZS98ZIFi2bbP3KuhwmQ6LED3Yp+xXRRwiJhk0=";
    return options;
};

module.exports.main = async function (ffCollection, vvClient, response) {
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
     Last Rev Date: 07/06/2021

     Revision Notes:
     11/17/2017 - Austin Noel: Initial creation of the business process.
     12/05/2017 - Jason Hatch: Needed a revision id returning when on record is found that is not matched.
     05/10/2019 - Kendra Austin: Update so that passed in 'formId' parameter can be either form ID or revision ID.
     07/06/2021 - Emanuel Jofré: Promises transpiled to async/await.
    */

    // Logs the execution start time of the script
    logger.info('Start of the process LibFormVerifyUniqueRecord at ' + Date());

    // Initialization of the return object
    const returnObj = {};
    // Initialization of a temporal array to store errors
    let errorLog = [];

    /********************
     * Helper Functions *
     ********************/

    async function searchForms(query, templateId) {
        logger.info("Querying form records");

        // Searchs forms using the provided query
        const formParams = { q: query };
        const resp = await vvClient.forms.getForms(formParams, templateId);

        return resp;
    }

    /**
     * Verifies existence of field and value and returns value of field.
     * errorLog array must be created before calling this function.
     */
    function getFieldValueByName(fieldName, isFieldRequired) {
        // If isFieldRequired parameter is not passed in, the field is required
        let isRequired = isFieldRequired ? isFieldRequired : true;
        let fieldObj = {};
        let fieldValue = null;
        let resp = null;

        try {
            fieldObj = ffCollection.getFormFieldByName(fieldName);
            if (fieldObj) {
                fieldValue = fieldObj.value ? fieldObj.value.trim() : null;
                if (fieldValue) {
                    resp = fieldValue;
                } else if (isRequired) {
                    errorLog.push(`A value property for the field '${fieldName}' was not found or is empty`)
                }
            } else {
                errorLog.push(`The field '${fieldName}' was not found`);
            }
        } catch (error) {
            errorLog.push(error);
        }
        return resp;
    }


    /****************
     * Main Process *
     ****************/

    try {
        logger.info("Extracting and validating passed in fields");

        // Validates and gets the passed in parameters
        const templateId = getFieldValueByName('templateId');
        const query = getFieldValueByName('query');
        const formId = getFieldValueByName('formId');

        if (templateId && query && formId) {
            // Gets the forms
            const respSearchForms = await searchForms(query, templateId);

            // Processes the response from searchForms()
            const formData = JSON.parse(respSearchForms);

            if (formData.meta) {
                if (formData.meta.status === 200) {
                    if (formData.data) {
                        const moreThanOneRecord = formData.data.length > 1 ? true : false;
                        const noRecords = formData.data.length === 0 ? true : false;
                        const oneRecord = formData.data.length === 1 ? true : false;

                        if (moreThanOneRecord) {
                            returnObj.status = "Not Unique";
                            returnObj.statusMessage = "The record is NOT unique";
                        } else if (noRecords) {
                            returnObj.status = "Unique";
                            returnObj.statusMessage = "The record is unique";
                        } else if (oneRecord) {
                            const record = formData.data[0];
                            const recordNameEqualsFormId = record.instanceName === formId ? true : false;
                            const recordRevisionIdEqualsFormId = record.revisionId === formId ? true : false;

                            if (recordNameEqualsFormId || recordRevisionIdEqualsFormId) {
                                returnObj.status = "Unique Matched";
                                returnObj.statusMessage = "The record is unique";
                                returnObj.revisionId = record.revisionId;
                            } else {
                                returnObj.status = "Not Unique";
                                returnObj.statusMessage = "The record is NOT unique";
                                returnObj.revisionId = record.revisionId;
                            }
                        }
                    } else {
                        throw new Error("The query returned no data");
                    }
                } else {
                    throw new Error("Call to query existing forms returned with an error");
                }
            } else {
                throw new Error("Search form error. Check query format, template id, and credentials.");
            }
        } else {
            // Builds a string with every error occurred obtaining field values
            throw new Error(errorLog.join("; "));
        }
    } catch (error) {
        returnObj.status = "Error";
        returnObj.statusMessage = error.message ? error.message : error;
    }

    return response.json(200, returnObj);
}
