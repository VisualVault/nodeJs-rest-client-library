/**
 * WorkflowCopyApplicationData
 * Category: Workflow
 * Modified: 2026-03-16T19:37:07.847Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 765023e1-f4a5-f011-82fa-ec61d8777d62
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
    /*Script Name:	WorkflowCopyApplicationData
    Customer:       WADNR
    Purpose:        Calls LibWorkflowCopyFormApplicationData to copy Applications.
                    This is just a wrapper for LibWorkflowCopyFormApplicationData to handle
                    retries in a non-blocking way for the workflow.
    Preconditions:

    Parameters:
                    - Source Form ID: (String, Required) — instanceName of the form to copy from
                    - Form Type:  (String, Required) — template type of the target form to be created.
                                  Must be one of the VALID_FORM_TYPES constant
                    - Individual ID: (String, Optional) - if present will replace Individual ID in copied application

    Pseudo code:
                   Pseudo code:
                    1. COPY applications using `LibWorkflowCopyFormApplicationData`
                    2. RETURN an object that signals the completion of the microservice and its success/error


    Date of Dev:    10/10/2025

    Revision Notes:
                    10/10/2025 - Alfredo Scilabra: First Setup of the script
                    03/16/2026 - John Sevilla: Improved communication of errors from library
	  */

    logger.info('Start of the process WorkflowCopyApplicationData at ' + Date());

    // Respond immediately before proceeding
    response.json(200, { success: true, message: 'Process started successfully.' });

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Array for capturing error messages that may occur during the process
    let errorLog = [];
    // Signals the completion of the workflow process
    let variableUpdates = {};
    /** **NOTE**: Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete. */
    let executionId = response.req.headers['vv-execution-id'];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    // Web Service Names
    const LibWorkflowCopyFormApplicationData = 'LibWorkflowCopyFormApplicationData';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    /** **NOTE**: Limit for attempts to call a web service if it is unsuccessful */
    const RETRY_LIMIT = 5;

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
            // If an error occurs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the meta property of a vvClient API response object has the expected status code
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
        Checks that the data property of a vvClient API response object exists
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

    function checkDataIsNotEmptyAnyStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the data property of a vvClient API response object is not empty
        Parameters:
            res: Parsed response object from the API call
            shortDescription: A string with a short description of the process
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkMeta(), make sure to pass the same param as well.
        */
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;

            // If the data is empty, throw an error
            if (isEmptyArray || isEmptyObject) {
                throw new Error(
                    `${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`
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

    /**
     * Constructor function to streamline executing web services and evaluating their response.
     * @param {String} webServiceName - The name of the web service to be called
     */
    function WebServiceManager(webServiceName) {
        this.webServiceName = webServiceName;
        /**
         * Executes the web service using the passed in parameters and evaluates its response.
         * @param {Object} webServiceParams - The parameters to be passed to the web service
         * @param {String} target - A description of the web service target (e.g., a Form ID)
         * @returns The `Promise` for the web service API call which returns its `data` property
         */
        this.runWebService = (webServiceParams, target) => {
            // Generate the description using the description of the web service's target
            const shortDescription = `Executing ${this.webServiceName} for '${target}'`;
            return vvClient.scripts
                .runWebService(this.webServiceName, webServiceParams)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => checkDataIsNotEmptyAnyStatus(res, shortDescription)) // NOTE: No implicit 'Error' status check
                .then((res) => res.data);
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const sourceFormID = getFieldValueByName('Source Form ID');
        const formType = getFieldValueByName('Form Type');
        const individualID = getFieldValueByName('Individual ID', true);

        // Check is the required parameters are present
        if (!sourceFormID || !formType) {
            throw new Error(errorLog.join('; '));
        }

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: copyFormApplication } = new WebServiceManager(LibWorkflowCopyFormApplicationData);

        // Define the web service parameters for copy application
        const copyFormApplicationWebServiceParams = [
            {
                name: 'Source Form ID',
                value: sourceFormID,
            },
            {
                name: 'Form Type',
                value: formType,
            },
        ];

        if (!isNullEmptyUndefined(individualID)) {
            copyFormApplicationWebServiceParams.push({
                name: 'Individual ID',
                value: individualID,
            });
        }

        let attempts = 0;
        let copyFormApplicationFinished = false;
        let targetFormID;
        for (attempts = 0; copyFormApplicationFinished === false && attempts < RETRY_LIMIT; attempts++) {
            try {
                const copyFormApplicationResp = await copyFormApplication(
                    copyFormApplicationWebServiceParams,
                    sourceFormID
                );

                const status = copyFormApplicationResp[0];
                if (status === 'Success') {
                    // The copy process finished, read the response values
                    copyFormApplicationFinished = true;

                    const message = copyFormApplicationResp[1];
                    const summaryObj = copyFormApplicationResp[2];
                    if (summaryObj?.TargetFormID) {
                        targetFormID = summaryObj.TargetFormID;
                    } else {
                        errorLog.push(`No Target Form ID received from '${LibWorkflowCopyFormApplicationData}'`);
                    }
                } else if (status === 'Error') {
                    // A known error occurred while attempting to copy application. Capture library error messages and break loop
                    copyFormApplicationFinished = true;
                    errorLog.push(copyFormApplicationResp.slice(1).join(' - '));
                } else {
                    // An unknown error returned from the called web service. This could indicate a network error, so it's worth retrying
                    errorLog.push(
                        `An unknown error occurred while attempting to call '${LibWorkflowCopyFormApplicationData}' for '${sourceFormID}'`
                    );
                }
            } catch (error) {
                // An error occurred with the called web service, so add to the error log and retry
                errorLog.push(error.message);
            }
        }

        // Check that the copy was successfully created
        if (errorLog.length > 0 || !targetFormID) {
            // Copy application resulted in errors
            throw new Error(
                `Failed to copy application for ${sourceFormID} (${formType}) across ${attempts} attempts.`
            );
        }

        // BUILD THE SUCCESS RESPONSE OBJECT
        const microserviceMessageSuccess = `Application copied for Microservice workflow task.`;
        variableUpdates['MicroserviceResult'] = true;
        variableUpdates['MicroserviceMessage'] = microserviceMessageSuccess;
        variableUpdates['CopyApplicationRes'] = 'Success';
        variableUpdates['CopyApplicationMsg'] = microserviceMessageSuccess;
        variableUpdates['Target Form ID'] = targetFormID;
    } catch (error) {
        let errorToReturn = error.message ? error.message : `Unhandled error occurred: ${JSON.stringify(error)}`;

        if (errorLog.length > 0) {
            errorToReturn += '; ' + JSON.stringify(errorLog);
        }

        logger.info(errorToReturn);

        // BUILD THE ERROR RESPONSE OBJECT
        variableUpdates['MicroserviceResult'] = false;
        variableUpdates['MicroserviceMessage'] = `Error in WorkflowCopyApplicationData for Microservice workflow task.`;
        variableUpdates['CopyApplicationRes'] = 'Error';
        variableUpdates['CopyApplicationMsg'] = errorToReturn;
    } finally {
        // Signal the completion of the workflow item
        const completeResp = await vvClient.scripts.completeWorkflowWebService(executionId, variableUpdates);
        if (completeResp.meta.status == 200) {
            logger.info('Completion signaled to WF engine successfully.');
        } else {
            logger.info('There was an error signaling WF completion.');
        }
    }
};
