/**
 * LibFormVerifyUniqueRecord
 * Category: Form
 * Modified: 2025-07-03T11:35:30.903Z by santiago
 * Script ID: Script Id: 621053b7-d3d9-eb11-8204-e3982f57380d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
/**
 * Script Name: LibFormVerifyUniqueRecord
 * Customer: VisualVault library function.
 * Purpose: This process verifies that a form record is unique based on the passed in query criteria.
 * 
 * Date of Dev:   11/17/2017
 * Last Rev Date: 05/10/2019
 * 
 * Revision Notes:
 * 11/17/2017 - Austin Noel: Initial creation of the business process.
 * 12/05/2017 - Jason Hatch: Needed a revision id returning when on record is found that is not matched.
 * 05/10/2019 - Kendra Austin: Update so that passed in 'formId' parameter can be either form ID or revision ID.
*/

var logger = require('../log');

/*******************
* HELPER FUNCTIONS *
*******************/

/**
 * Called by VV Rest API to authorize the script execution
 */
module.exports.getCredentials = function () {
  var options = {};
  options.customerAlias = "EmanuelJofre";
  options.databaseAlias = "Main";
  options.userId = "4150133e-ddef-4d8e-af91-1e7c39f16a25";
  options.password = "RKxMRhdeJPdt+3A3B/kNT19rbTawYpPLx84LSpzrHZ0=";
  options.clientId = "4150133e-ddef-4d8e-af91-1e7c39f16a25";
  options.clientSecret = "RKxMRhdeJPdt+3A3B/kNT19rbTawYpPLx84LSpzrHZ0=";
  return options;
};


/**
 * Get forms based in a query
 * 
 * @param { string } query Review Query Syntax section in VV Techincal Manual for ind depth info on how to write queries
 * @param { string } templateId Template name of the forms you want to get
 * @returns { Object } Return object structure:
 *       {
 *          meta: {
 *            status,
 *            statusMsg
 *          },  
 *          data: []
 *       }
 */
async function searchForms(query, templateId, vvClient) {
    logger.info("Querying form records");
    const formParams = { q: query };
    const resp = await vvClient.forms.getForms(formParams, templateId);

    return resp;
}

/****************
* MAIN FUNCTION *
****************/

/**
 * Verifies that a form record is unique based on the passed in query criteria.
 * 
 * @param { ffCollection } ffCollection Object containing key-value pairs recibed from a form or another web service.
 * @param { object } vvClient VV Rest API
 * @param { object } response response oject
 * @returns { Object } Return object structure:
 *       {
 *          meta: {
 *            status,
 *            statusMsg,
 *            revisionId
 *          },  
 *          data: []
 *       }
 */
module.exports.main = async function (ffCollection, vvClient, response) {

    // Logs the execution start time of the script
    logger.info('Start of the process LibFormVerifyUniqueRecord at ' + Date());

    // Initialization of the return object
    const returnObj = {};

    try {
        logger.info("Extracting and validating passed in fields");

        // Extract the passed in parameters
        const templateId = ffCollection.getFormFieldByName('templateId');
        const query = ffCollection.getFormFieldByName('query');
        const formId = ffCollection.getFormFieldByName('formId');
        
        // Validates the passed in parameters
        if (!templateId.value) {
            throw new Error("The 'templateId' parameter was not supplied or had an invalid value");
        } else if (!query.value) {
            throw new Error("The 'query' parameter was not supplied or had an invalid value");
        } else if (!formId.value) {
            throw new Error("The 'formId' parameter was not supplied or had an invalid value");
        } else {
            // Gets the forms
            const respSearchForms = await searchForms(query.value, templateId.value, vvClient);
            const formData = JSON.parse(respSearchForms);

            // Checks the response from searchForms()
            if (formData.meta.status === 200) {
                if (formData.data.length > 1) {
                    // Multiple records returned - Not Unique
                    returnObj.status = "Not Unique";
                    returnObj.statusMessage = "The record is NOT unique";
                } else if (formData.data.length === 0) {
                    // No records returned - Unique
                    returnObj.status = "Unique";
                    returnObj.statusMessage = "The record is unique";
                } else {
                    // One record returned. Check to see if it matches the passed in formId
                    const form = formData.data[0];
                    if (form.instanceName === formId.value || form.revisionId === formId.value) {
                        // Record matches the passed in formId - Unique Matched
                        returnObj.status = "Unique Matched";
                        returnObj.statusMessage = "The record is unique";
                        returnObj.revisionId = form.revisionId;
                    } else {
                        // Record does not match the passed in formId - Not Unique
                        returnObj.status = "Not Unique";
                        returnObj.statusMessage = "The record is NOT unique";
                        returnObj.revisionId = form.revisionId;
                    }
                }
            } else {
                throw new Error("Call to query existing forms returned with an error.");
            }
        }
    } catch (error) {
        returnObj.status = "Error";
        returnObj.statusMessage = error.message ? error.message : error;
    }

    return response.json(200, returnObj);
}
