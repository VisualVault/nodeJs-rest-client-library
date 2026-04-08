/**
 * LibFormDuplicateCheck
 * Category: Workflow
 * Modified: 2025-01-07T21:31:50.193Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 66b4b0bf-3ecd-ef11-82bf-a0dcc70b93c8
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');

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

module.exports.main = async function (ffCollection, vvClient, response) {
    /*Script Name: LibFormDuplicateCheck
  Customer:     VisualVault library function
  Purpose:      This process verifies that obtains duplicates if any exist based on the passed in query criteria. Adapted from LibFormVerifyUniqueRecord. Library function
  Parameters:   
                formID (String, Required) - A string representing either the form ID or revision ID of the current form
                customQuery (Object) - An object representing the parameters passed to a custom query; required for duplicate checking with getCustomQueryResultsByName. Query must SELECT dhid and dhdocid columns. The properties are:
                  name (String, Required) - The name of the custom query
                  queryParams (Object, Required) - Params object passed into getCustomQueryResultsByName
                templateID (String, Required if not customQuery) - A string representing the name of the template; required for duplicate checking with getForms
                query (String, Required if not customQuery) - A string representing the matching conditions. Apostrophes in text fields must be escaped; required for duplicate checking with getForms
  Return Array:   
                [0] status: 'Unique', 'Unique Matched', 'Not Unique', 'Error'
                [1] statusMessage: A short descriptive message
                [2] returnObj: An object that contains data returned from the duplicate check query. The properties are:
                  matchRevisionID: The revision ID of the "calling" form. Only returned if query can return the calling form.
                  duplicates: An array of { formID, revisionID } objects of each duplicate record obtained from the query.
  Pseudo code:   
                1. Search for duplicates
                  a. Use getforms to perform the duplicate check
                  b. Use getCustomQueryResultsByName to perform the duplicate check
                2. Get true duplicates
                3. Determine return status
  Usage:        
              **************** getForms ****************
              let webSvcParams = [
                {
                  name: 'templateID',
                  value: FormTemplateID
                },
                {
                  name: 'query',
                  value: `[Field One] eq '${FieldOne}'` // AND ...
                },
                {
                  name: 'formID',
                  value: FormID
                }
              ];

              let webSvcName = 'LibFormDuplicateCheck';
              let verifyUniqueResp = await vvClient.scripts.runWebService(webSvcName, webSvcParams);

              **************** customQuery ****************
              let customQueryName = 'zWebSvc TestVerifyDuplicate';
              let sqlParams = [
                { parameterName: 'InputFieldOne', value: FieldOne },
              ];
              let customQueryParams = {
                params: JSON.stringify(sqlParams),
              };

              let webSvcParams = [
                {
                  name: 'customQuery',
                  value: { name: customQueryName, queryParams: customQueryParams }
                },
                {
                  name: 'formID',
                  value: FormID
                }
              ];
              let webSvcName = 'LibFormDuplicateCheck';
              let verifyUniqueResp = await vvClient.scripts.runWebService(webSvcName, webSvcParams);

  Date of Dev: 01/07/2025
  Last Rev Date: 01/07/2025
  Revision Notes:
  01/07/2025 - John Sevilla: Script migrated.
  */

    logger.info('Start of the process LibFormDuplicateCheck at ' + Date());

    /****************
  Config Variables
  *****************/
    let missingFieldGuidance = 'Please provide a value for the missing field(s).';

    /****************
  Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];
    let queryMethod = null;

    try {
        /*********************
    Form Record Variables
    **********************/
        let FormID = getFieldValueByName('formID'); // can be form ID or revision ID
        let CustomQuery = getFieldValueByName('customQuery', true);
        let TemplateID, Query;
        if (CustomQuery) {
            queryMethod = 'customQuery';
            checkCustomQueryProps(CustomQuery);
        } else {
            queryMethod = 'getForms';
            TemplateID = getFieldValueByName('templateID');
            Query = getFieldValueByName('query');
        }

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
    Helper Functions
    *****************/
        //Check if field object has a value property and that value is truthy before returning value.
        function getFieldValueByName(fieldName, isOptional) {
            try {
                let fieldObj = ffCollection.getFormFieldByName(fieldName);
                let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

                if (!isOptional && !fieldValue) {
                    throw new Error(`${fieldName}`);
                }
                return fieldValue;
            } catch (error) {
                errorLog.push(error.message);
            }
        }

        //Checks properties in customQuery obj, raising errors if props not found
        function checkCustomQueryProps(customQuery) {
            if (typeof customQuery.name !== 'string') {
                errorLog.push('customQuery.name');
            }
            if (typeof customQuery.queryParams !== 'object') {
                errorLog.push('customQuery.queryParams');
            }
        }

        /****************
    BEGIN ASYNC CODE
    *****************/
        //Step 1. Search for duplicates
        let possibleDuplicateForms = [];
        if (queryMethod === 'getForms') {
            //Step 1a. Use getforms to perform the duplicate check
            let queryParams = {};
            queryParams.q = Query;
            queryParams.expand = false;

            let getFormsResp = await vvClient.forms.getForms(queryParams, TemplateID);
            getFormsResp = JSON.parse(getFormsResp);
            let getFormsData = getFormsResp.hasOwnProperty('data') ? getFormsResp.data : null;

            if (getFormsResp.meta.status !== 200) {
                throw new Error(`There was an error when calling getForms on ${TemplateID}.`);
            }
            if (Array.isArray(getFormsData) === false) {
                throw new Error(`Data was not able to be returned when calling getForms on ${TemplateID}.`);
            }

            possibleDuplicateForms = getFormsData;
        } else if (queryMethod === 'customQuery') {
            //Step 1b. Use getCustomQueryResultsByName to perform the duplicate check
            let customQueryResp = await vvClient.customQuery.getCustomQueryResultsByName(
                CustomQuery.name,
                CustomQuery.queryParams
            );
            customQueryResp = JSON.parse(customQueryResp);
            let customQueryData = customQueryResp.hasOwnProperty('data') ? customQueryResp.data : null;

            if (customQueryResp.meta.status !== 200) {
                throw new Error(
                    `Error encountered when calling getCustomQueryResultsByName on ${CustomQuery.name}. ${customQueryResp.meta.statusMsg}.`
                );
            }
            if (Array.isArray(customQueryData) === false) {
                throw new Error(
                    `Data was not returned when calling getCustomQueryResultsByName on ${CustomQuery.name}.`
                );
            }

            possibleDuplicateForms = customQueryData;
        } else {
            throw new Error('Unrecognized query method supplied');
        }

        //Step 2. Get true duplicates
        let matchFound = false; // determines if a record match to the "calling" form was found
        let matchRevisionID = null;
        let trueDuplicates = possibleDuplicateForms.reduce((trueDupes, possibleDupe) => {
            let possibleDupeFormID = possibleDupe['instanceName'] || possibleDupe['dhDocID'] || possibleDupe['form ID'];
            let possibleDupeRevID = possibleDupe['revisionId'] || possibleDupe['dhid'];

            if (FormID === possibleDupeFormID || FormID === possibleDupeRevID) {
                matchFound = true;
                matchRevisionID = possibleDupeRevID;
            } else {
                trueDupes.push({
                    formID: possibleDupeFormID,
                    revisionID: possibleDupeRevID,
                });
            }

            return trueDupes;
        }, []);

        //Step 3. Determine return status
        let returnObj = {};
        let status, statusMessage;
        if (trueDuplicates.length > 0) {
            status = 'Duplicate Found';
            statusMessage = 'Duplicates for the record were found';

            returnObj.matchRevisionID = matchRevisionID;
            returnObj.duplicates = trueDuplicates;
        } else if (matchFound && matchRevisionID) {
            status = 'Current Record Match';
            statusMessage = 'No duplicates were found. A match to the current record was found.';

            returnObj.matchRevisionID = matchRevisionID;
        } else {
            status = 'No Duplicate Found';
            statusMessage = 'No duplicates were found.';
        }

        //Send to client
        outputCollection[0] = status;
        outputCollection[1] = statusMessage;
        outputCollection[2] = returnObj;
    } catch (error) {
        //Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
