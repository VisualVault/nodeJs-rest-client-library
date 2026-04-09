/**
 * FeeLookupDuplicateCheck
 * Category: Workflow
 * Modified: 2025-02-11T18:11:09.307Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 779d88fe-3fcd-ef11-82bf-a0dcc70b93c8
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
    /*Script Name:   FeeLookupDuplicateCheck
    Customer:      WADNR
    Purpose:       The purpose of this script is to check for duplicate Fee Lookup records.
    Parameters:    Form ID (String, Required) - of the Fee Lookup record
                   Process Type (String, Required)
                   Fee Type (String, Required)
                   Fee Name (String, Required)
                   Effective Date (String, Required)
                   End Date (String)

    Return Array:   
                    [0] Status: 'Success', 'Error', 'Error Duplicate'
                    [1] Message
                    [2] duplicateData - An array of found duplicate objects (if any found). Each object has the following properties:
                      formID: The DhDocID of the duplicate
                      revisionID: The DhID of the duplicate
    Pseudo code:   
                    1. Verify there are no duplicates Checklist Template records based on similar Task Name, License Types, and overlapping date ranges
                    2. If duplicates were found, throw an error and stop processing of the webservice. Return duplicates data to the client.

    Date of Dev: 01/07/2025
    Revision Notes:
    01/07/2025 - John Sevilla: Script migrated.
    02/11/2025 - John Sevilla: Updated for new params
    */

    logger.info('Start of the process FeeLookupDuplicateCheck at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const FeeLookupDuplicateCheckQueryName = 'zWebSvc Fee Lookup Duplicate Check';
    const DuplicateCheckWebsvcName = 'LibFormDuplicateCheck';
    const MAX_SQL_DATESTR = '12/31/9999 23:59:59';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */
    let outputCollection = [];
    let errorLog = [];
    let duplicateCheckReturnObj = null;
    let feeLookupTemplateRevisionID = null;
    let errorStatus = 'Error';

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */
    function getFieldValueByName(fieldName, isOptional = false) {
        /*
    Check if a field was passed in the request and get its value
    Parameters:
      fieldName: The name of the field to be checked
      isOptional: If the field is required or not
    */

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                let fieldValue = 'value' in field ? field.value : null;
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;
                const ddSelectItem = fieldValue == 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }

                return fieldValue;
            }
        } catch (error) {
            errorLog.push(error.message);
        }
    }

    async function verifyFeeLookupHasNoDuplicates(feeLookup) {
        // Step 1. Verify there are no duplicates Checklist Template records based on similar Task Name, License Types, and overlapping date ranges
        // if no date end supplied, we assume it is effective "until the end of time" and use sql max

        for (const fieldValue in feeLookup) {
            if (feeLookup.hasOwnProperty(fieldValue)) {
                feeLookup[fieldValue] = feeLookup[fieldValue].replace(/'/g, "''");
            }
        }

        let sqlParams = [
            {
                parameterName: 'InputProcessType',
                value: feeLookup.ProcessType,
            },
            {
                parameterName: 'InputFeeType',
                value: feeLookup.FeeType,
            },
            {
                parameterName: 'InputFeeName',
                value: feeLookup.FeeName,
            },
            {
                parameterName: 'InputEffectiveDate',
                value: feeLookup.EffectiveDate,
            },
            {
                parameterName: 'InputEndDate',
                value: feeLookup.EndDate || MAX_SQL_DATESTR,
            },
        ];

        let customQueryParams = {
            params: JSON.stringify(sqlParams),
        };

        let webSvcParams = [
            {
                name: 'customQuery',
                value: {
                    name: FeeLookupDuplicateCheckQueryName,
                    queryParams: customQueryParams,
                },
            },
            {
                name: 'formID',
                value: feeLookup.FormID,
            },
        ];

        let duplicateCheckResp = await vvClient.scripts.runWebService(DuplicateCheckWebsvcName, webSvcParams);
        let duplicateCheckData = duplicateCheckResp.hasOwnProperty('data') ? duplicateCheckResp.data : null;
        if (duplicateCheckResp.meta.status !== 200) {
            throw new Error(`There was an error when calling ${DuplicateCheckWebsvcName}.`);
        } else if (!Array.isArray(duplicateCheckData)) {
            throw new Error(`Data was not returned when calling ${DuplicateCheckWebsvcName}.`);
        }

        // Step 2. If duplicates were found, throw an error and stop processing of the webservice. Return duplicates data to the client.
        let duplicateCheckStatus = duplicateCheckData[0];
        duplicateCheckReturnObj = duplicateCheckData[2];
        if (duplicateCheckStatus === 'Error') {
            throw new Error(
                `The call to ${DuplicateCheckWebsvcName} returned with an error. ${duplicateCheckData.statusMessage}.`
            );
        } else if (duplicateCheckStatus === 'Duplicate Found') {
            errorStatus = 'Error Duplicate';
            throw new Error('This record is a duplicate.');
        } else if (duplicateCheckStatus !== 'No Duplicate Found' && duplicateCheckStatus !== 'Current Record Match') {
            throw new Error(`The call to ${DuplicateCheckWebsvcName} returned with an unhandled error.`);
        }

        // store revision ID if matched in duplicate check for later use
        feeLookupTemplateRevisionID = duplicateCheckReturnObj.matchRevisionID;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const FormID = getFieldValueByName('Form ID');
        const ProcessType = getFieldValueByName('Process Type');
        const FeeType = getFieldValueByName('Fee Type');
        const FeeName = getFieldValueByName('Fee Name');
        const EffectiveDate = getFieldValueByName('Effective Date');
        const EndDate = getFieldValueByName('End Date', true);

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************`
    BEGIN ASYNC CODE
    *****************/
        await verifyFeeLookupHasNoDuplicates({
            FormID,
            ProcessType,
            FeeType,
            FeeName,
            EffectiveDate,
            EndDate,
        });

        // send to client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'FeeLookupDuplicateCheck has returned successfully';
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = errorStatus;
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
        outputCollection[3] = duplicateCheckReturnObj?.duplicates;
    } finally {
        response.json(200, outputCollection);
    }
};
