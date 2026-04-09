/**
 * WorkflowWTMFSyncStatus
 * Category: Workflow
 * Modified: 2025-10-09T23:56:22.587Z by fernando.chamorro@visualvault.com
 * Script ID: Script Id: 410c0b03-3da5-f011-82fa-ec61d8777d62
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
    /*
        Script Name:        WorkflowChangeStatusOfArpAssociatedDocuments
        Customer:           WADNR
        Purpose:            The purpose of this process is to ensure that the status of the WTMF application 
                            is maintained on the ARP Associated Document Relation records when the status changes 
                            on the WTM Review Page

        Parameters:
                            - WTMF ID:      String (WTM Form ID) - (e.g: WTM-00000001)
                            - New Status:   String (Status to which the items will be updated) - (e.g: Concurred, Withdrawn, etc..)
                            - Modified By:  String (User Id who changed the Status) - (e.g: fernando.chamorro.officestaff@visualvault.com)
        Psuedo code:
                            1. Receive parameters
                            2. Check if the required parameters are present
                            3. Get WTMF record by WTMF ID parameter
                            4. Validate if the WTMF has a FPAN Number
                              4.1. Get ARP by Main application ID
                              4.2. Get Associated Document Relation by Main application ID
                              4.3. Updating Status, Modified User and Modification Date for each ADR record
                            5. Response

        Date of Dev:
                            10/09/2025
        Revision Notes:
                            10/09/2025 - Fernando Chamorro:  First Setup of the script
    */

    logger.info('Start of the process WorkflowChangeStatusOfArpAssociatedDocuments at ' + Date());

    /**************************************
      Response and error handling variables
    ***************************************/

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /***********************
      Configurable Variables
    ************************/
    const adrTemplateName = 'Associated Document Relation';
    const arpTemplateName = 'Application Review Page';
    const wtmfTemplateName = 'Water Type Modification Form';

    /*****************
      Script Variables
    ******************/

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';

    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    /*****************
      Helper Functions
    ******************/

    function getFieldValueByName(fieldName, isOptional = false) {
        /*
      Check if a field was passed in the request and get its value
      Parameters:
          fieldName: The name of the field to be checked
          isOptional: If the field is required or not
      */
        let fieldValue = ''; // Default value

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                // Check if the value property exits
                fieldValue = 'value' in field ? field.value : fieldValue;

                // Trim the value if it's a string to avoid strings with only spaces like "   "
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                // Check if the field is required and if it has a value. Added a condition to avoid 0 to be considered a falsy value
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

                // Check if the field is a dropdown with the default value "Select Item"
                // Some dropdowns have this value as the default one but some others don't
                const ddSelectItem = fieldValue === 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    fieldValue = '';
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }
            }
        } catch (error) {
            errorLog.push(error.message);
        } finally {
            return fieldValue;
        }
    }

    function parseRes(vvClientRes) {
        /*
      Generic JSON parsing function
      Parameters:
          vvClientRes: JSON response from a vvClient API method
      */
        try {
            // Parses the response in case it's a JSON string
            const jsObject = JSON.parse(vvClientRes);
            // Handle non-exception-throwing cases:
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // If an error ocurrs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
      Checks that the meta property of a vvCliente API response object has the expected status code
      Parameters:
          vvClientRes: Parsed response object from a vvClient API method
          shortDescription: A string with a short description of the process
          ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkData(), make sure to pass the same param as well.
      */

        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;

        // If the status is not the expected one, throw an error
        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason =
                vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                    ? vvClientRes.meta.errors[0].reason
                    : 'unspecified';
            throw new Error(`${shortDescription} error. Status: ${vvClientRes.meta.status}. Reason: ${errorReason}`);
        }
        return vvClientRes;
    }

    function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
      Checks that the data property of a vvCliente API response object exists
      Parameters:
          res: Parsed response object from the API call
          shortDescription: A string with a short description of the process
          ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkMeta(), make sure to pass the same param as well.
      */
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            // If the data property doesn't exist, throw an error
            if (!vvClientRes.data) {
                throw new Error(
                    `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
                );
            }
        }

        return vvClientRes;
    }

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    async function getForms(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return getFormsRes.data;
    }

    async function WTMFSyncStatus(adrRevisionId, newRecordData) {
        const { newStatus, modifyBy, modifyDate } = newRecordData;

        const fieldValuesToUpdate = {
            'Document Form Status': newStatus,
            'Modify By': modifyBy,
            'Modify Date': modifyDate,
        };

        logger.info(`Updating ADR with Revision ID: ${adrRevisionId}, New Status: ${newStatus}`);

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, adrTemplateName, adrRevisionId)
            .then((res) => parseRes(res))
            .then((res) => {
                const shortDescription = `Update Document/Form Status to ${newStatus}`;
                logger.info(`ADR update response: ${JSON.stringify(res)}`);

                return checkMetaAndStatus(res, shortDescription);
            });
    }

    /**********
      MAIN CODE
    **********/

    try {
        // 1. Receive parameters
        const wtmFormId = getFieldValueByName('WTMF ID');
        const newStatus = getFieldValueByName('New Status');
        const modifydBy = getFieldValueByName('Modified By');

        logger.info(`Parameters received - WTMF ID: ${wtmFormId}, New Status: ${newStatus}, Modified By: ${modifydBy}`);

        // 2. Check if the required parameters are present
        if (!wtmFormId || !newStatus || !modifydBy) {
            throw new Error(errorLog.join('; '));
        }

        // 3. Get WTMF record by WTMF ID parameter
        const [wtmfRecord] = await getForms({ q: `[WTMF ID] eq '${wtmFormId}'`, expand: true }, wtmfTemplateName);

        if (isNullEmptyUndefined(wtmfRecord)) {
            throw new Error('Error getting WTMF record.');
        }

        const fpanNumber = wtmfRecord['fpaN Number'] || '';
        const mainApplicationId = wtmfRecord['related Record ID'] || '';

        logger.info(`WTMF record found: ${wtmfRecord}`);

        // 4. Validate if the WTMF has a FPAN Number
        if (fpanNumber.trim()) {
            // 4.1. Get ARP by Main application ID
            const arpQueryFilter = `[Related Record ID] eq '${mainApplicationId}'`;
            const [arpRecord] = await getForms({ q: arpQueryFilter, expand: true }, arpTemplateName);

            if (isNullEmptyUndefined(arpRecord)) {
                throw new Error('Error getting ARP record.');
            }

            const arpFormId = arpRecord['form ID'];
            logger.info(`ARP record found: ${arpRecord}`);

            // 4.2. Get Associated Document Relation by Main application ID
            const adrQueryFilter = `[ARP ID or WTM RP ID] eq '${arpFormId}' AND [Related Record ID] eq '${mainApplicationId}'`;
            const adrRecords = await getForms({ q: adrQueryFilter, expand: true }, adrTemplateName);

            if (isNullEmptyUndefined(adrRecords)) {
                throw new Error('Error getting Associated Document Relation record.');
            }

            // 4.3. Updating Status, Modified User and Modification Date for each ADR record
            for (const record of adrRecords) {
                const adrRevisionID = record['revisionId'];
                const modifyDate = new Date();

                const newRecordData = { newStatus: newStatus, modifyBy: modifydBy, modifyDate };

                await WTMFSyncStatus(adrRevisionID, newRecordData);
            }
        }

        // 5. Response
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully. The Associated Document Relation were updated.',
        };
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err,
        };
    } finally {
        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch(() => logger.info('There was an error signaling WF completion.'));
    }
};
