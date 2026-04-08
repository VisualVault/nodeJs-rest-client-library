/**
 * WorkflowShoppingCartUpdateApplicationsAsPaid
 * Category: Workflow
 * Modified: 2025-12-16T20:02:39.727Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 31a70c83-c91e-f011-82cd-cce61d1869ed
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
    /*Script Name:	WorkflowShoppingCartUpdateApplicationsAsPaid
      Customer:     WADNR
      Purpose:      Updates the Fees Paid checkbox on the related applications/permits related to the individual's shopping cart. This includes FPAN, Rewnewal, LTA 1 step
                    This will be the trigger for allowing the proponent to submit their application. It will unhide the submit button on the application.

      Parameters:   
                    Shopping Cart ID:	(String, Required) - The Form ID of the current Shopping Cart record

	  Return Object:   
                    MicroserviceResult:     (Boolean) true,
                    MicroserviceMessage:    (String) Short description message
                    ApplyPaymentRes:        (String) Status of the microservice's success (Success|Error)
      Pseudo code:   
                    1. CHECK that all parameters were provided in a valid format
                    2. CREATE the applications/permits search query string based on the shopping cart ID
                    3. GET any applications/permits related to the shopping cart ID
                    4. CHECK that all payment items have a status of paid, otherwise there is a remaining balance which results in a unpaid status
                    5. UPDATE all of the selected/related applications/permits "Fees Paid" checkbox
  
    Date of Dev: 01/13/2025
    Revision Notes:
    04/10/2025 - Ross Rhone: Created script.
    05/12/2025 - Moises Savelli: Added logic to update the application status when fees are paid.
    08/20/2025 - Moises Savelli: Added logic to handle different "status" scenarios.
    */

    logger.info('Start of the process WorkflowShoppingCartUpdateApplicationsAsPaid at ' + Date());

    // Respond immediately before proceeding
    response.json(200, {
        success: true,
        message: 'Process started successfully.',
    });

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    let responseMessage = '';

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    // Constants
    const APPLICATIONS = 'Applications';

    // Custom Query Names
    const GetRelatedPaymentItems = 'zWebSvc GetRelatedRecordIdFromShoppingCart';

    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    // Signals the completion of the workflow process
    let variableUpdates = {};

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

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
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
            // If it is a Web Service response, check that the first value is not an Error status
            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(
                        `${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    /**
     * Executes a custom query by name by passing in query parameters
     * @param {String} queryName - The name of the custom query as it is defined in VisualVault
     * @param {Array} params - List of the parameter names and their value to be passed to the query
     * @param {String} shortDescription - Description of the query to be performed
     * @param {Boolean} checkDataReturned - Optional argument that determines whether or not to check if the data is not empty
     * @returns The `Promise` for the custom query call which returns its `data` property
     */
    async function executeCustomQuery(queryName, params, shortDescription, checkDataReturned = true) {
        const queryParams = {
            params: JSON.stringify(params),
        };

        // Execute the custom query using the provided parameters
        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, queryParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => (checkDataReturned ? checkDataIsNotEmpty(res, shortDescription) : res))
            .then((res) => res.data);
    }

    async function updateFormRecord(
        fieldValuesToUpdate,
        templateName,
        recordGUID,
        shortDescription = `Update form record ${recordGUID}`
    ) {
        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, templateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function updateRecordAsPaid(relatedRecordIdPermits) {
        /// Use a Set to keep track of unique Related Record IDs
        const uniqueIds = new Set();

        let feesPaidCheckboxAndStatus = {
            'Fees Paid': true,
            Status: 'Needs Submission',
        };

        for (const item of relatedRecordIdPermits) {
            const recordId = item['related Record ID'];
            let templateName = getTemplateName(recordId);

            if (templateName === 'Unknown Template') {
                //ignore the template
                continue;
            }

            // If we haven't already updated this record, do it now:
            if (!uniqueIds.has(recordId)) {
                uniqueIds.add(recordId);
                //Keep stack/list and when it is empty we will update the formRecord.!
                try {
                    // Before update check if the target record status is "required signatures received" or "pending revision"
                    const formRecordStatus = await getFormRecords(recordId, templateName);

                    // Get status with fallback for different cases
                    const record = formRecordStatus?.[0];
                    const statusValue = record?.Status || record?.status;

                    if (statusValue) {
                        const lowerStatus = statusValue.toLowerCase();

                        // Validate if record status is "Submitted" or "Needs Submission"
                        if (lowerStatus === 'required signatures received') {
                            feesPaidCheckboxAndStatus.Status = 'Needs Submission';
                        }

                        if (lowerStatus === 'pending revisions') {
                            feesPaidCheckboxAndStatus.Status = 'Needs Resubmission';
                        }
                    }

                    const updatedRecord = await updateFormRecord(
                        feesPaidCheckboxAndStatus,
                        templateName,
                        item['related Record GUID']
                    );
                    console.log('Updated:', updatedRecord);
                } catch (error) {
                    console.error('Error updating record:', error);
                }
            }
        }
    }

    function getTemplateName(recordId) {
        let templateName = '';

        switch (true) {
            case recordId.includes('FPAN') && !recordId.includes('RENEWAL'):
                templateName = 'Forest Practices Application Notification';
                break;

            case recordId.includes('RENEWAL'):
                templateName = 'FPAN Renewal';
                break;

            case recordId.includes('STEP-1-LONG-TERM-FPA'):
                templateName = 'Step 1 Long Term FPA';
                break;

            default:
                templateName = 'Unknown Template';
                break;
        }

        return templateName;
    }

    function hasUnpaidStatus(permitPaymentItemsStatus) {
        let isUnpaid = false;

        for (const [appId, status] of permitPaymentItemsStatus) {
            if (status === 'Unpaid') {
                console.log(`Application/permit still have unpaid balance: ${appId}`);
                isUnpaid = true;
                break; // stop checking after first failure
            }
        }

        if (!isUnpaid) {
            console.log('All fees have been paid for the applications');
        }

        return isUnpaid;
    }

    function setPaymentItemStatus(appId, data) {
        return data['related Record ID'] === appId && data.status.toLowerCase() === 'paid' ? 'Paid' : 'Unpaid';
    }

    function getFormRecords(filterValue, templateName) {
        const shortDescription = `Get form records`;
        const getFormsParams = {
            q: `[Top Form ID] eq '${filterValue}'`,
            fields: 'Status',
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const shoppingCartID = getFieldValueByName('SourceDocId');

        // Check if required parameters were provided
        if (!shoppingCartID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        const shoppingCartIdParam = [
            {
                parameterName: 'ShoppingCartId',
                value: shoppingCartID,
            },
        ];

        //get all related Payment Items (related records) associated with the shopping cartID
        const relatedRecordIdPermits = await executeCustomQuery(
            GetRelatedPaymentItems,
            shoppingCartIdParam,
            `Getting related ${APPLICATIONS}s for items to ${shoppingCartID}.`,
            false
        );

        // permitPaymentItemsStatus "Paid" | "Unpaid"
        const permitPaymentItemsStatus = new Map();

        // ‑‑‑ loop over every row (duplicates included) ‑‑‑
        for (const row of relatedRecordIdPermits) {
            const id = row['related Record ID']; // current ID

            // If a payment item has a status of unpaid then there is still a remaining balance
            // that needs to be paid. Therefore we will NOT update the permit's application to paid.

            //change the status to paid and unpaid
            if (permitPaymentItemsStatus.get(id) === 'Unpaid') {
                continue; // skip, no need to run again
            }

            // Not seen yet, or previously “Paid” check paymentItem Status for the permit
            const result = permitPaymentItemsStatus.has(id)
                ? permitPaymentItemsStatus.get(id) // reuse previous Paid
                : setPaymentItemStatus(id, row); // if first time set status

            permitPaymentItemsStatus.set(id, result); // store / overwrite permit's status

            console.log(`${id}: ${result}`);
        }

        if (hasUnpaidStatus(permitPaymentItemsStatus)) {
            responseMessage = 'Application still has unpaid fees. Please pay them before submitting application.';
        } else {
            //loop through the related record IDs to update the hidden "Fees Paid" checkbox true
            await updateRecordAsPaid(relatedRecordIdPermits);
            responseMessage = 'Updating applications "Fees Paid" complete.';
        }

        // BUILD THE SUCCESS RESPONSE OBJECT
        variableUpdates['MicroserviceResult'] = true;
        variableUpdates['MicroserviceMessage'] = responseMessage;
        variableUpdates['ApplyAppFeesPaidRes'] = 'Success';
    } catch (error) {
        let errorToReturn = error.message ? error.message : `Unhandled error occurred: ${JSON.stringify(error)}`;

        if (errorLog.length > 0) {
            errorToReturn += '; ' + JSON.stringify(errorLog);
        }

        logger.info(errorToReturn);

        // BUILD THE ERROR RESPONSE OBJECT
        variableUpdates['MicroserviceResult'] = false;
        variableUpdates['MicroserviceMessage'] = responseMessage;
        variableUpdates['ApplyAppFeesPaidRes'] = 'Error';
    } finally {
        // Signal the completion of the workflow item
        const completeResp = await vvClient.scripts
            .completeWorkflowWebService(executionId, variableUpdates)
            .then((res) => checkMetaAndStatus(res, 'asdf'));
        if (completeResp.meta.status == 200) {
            logger.info('Completion signaled to WF engine successfully.');
        } else {
            logger.info('There was an error signaling WF completion.');
        }
    }
};
