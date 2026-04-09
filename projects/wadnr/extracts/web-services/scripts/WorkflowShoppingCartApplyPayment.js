/**
 * WorkflowShoppingCartApplyPayment
 * Category: Workflow
 * Modified: 2025-04-23T15:44:38.14Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 9d3b1967-93d2-ef11-82bd-d3a492f2461d
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
    /*Script Name:	WorkflowShoppingCartApplyPayment
	  Customer:     WADNR
	  Purpose:      Finalizes the Shopping Cart's Payment Items, including their related records (Fee/Transaction), and
                    notifies the Provider's Profile Admin users if it was successful.

	  Parameters:   Form ID             (String, Required) Form ID of the Shopping Cart to apply the payment
                    Individual ID         (String, Required) Form ID of the Provider who is the payer of the Shopping Cart
                    Payer Name          (String, Required) The name of the Shopping Cart payer (provider)
                    Amount Received     (Number, Required) The amount paid for the Shoppng Cart

	  Return Object:   
                    MicroserviceResult:     (Boolean) true,
                    MicroserviceMessage:    (String) Short description message
                    ApplyPaymentRes:        (String) Status of the microservice's success (Success|Error)

	  Pseudo code:   
	  				1. UPDATE the Shopping Cart's related items as paid using `LibShoppingCartApplyPayment`
                    2. RETURN an object that signals the completion of the microservice and its success/error
  
      Date of Dev: 01/13/2025
      Last Rev Date: 01/13/2025
      Revision Notes:
      01/13/2025 - John Sevilla: Script migrated.
      04/22/2025 - Ross Rhone - Removing pennsylvania related code
	  */

    logger.info('Start of the process WorkflowShoppingCartApplyPayment at ' + Date());

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

    // Form Template Names
    const SHOPPING_CART = 'Shopping Cart';

    // Web Service Names
    const LibShoppingCartApplyPayment = 'LibShoppingCartApplyPayment';

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
                .then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data);
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const shoppingCartID = getFieldValueByName('SourceDocId');
        const amountReceived = getFieldValueByName('Amount Received');

        // Check if required parameters were provided
        if (!shoppingCartID || !amountReceived) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: applyPayment } = new WebServiceManager(LibShoppingCartApplyPayment);

        // Define the web service parameters for applying a payment to the Shopping Cart
        const applyPaymentWebServiceParams = [
            {
                name: 'Shopping Cart Data',
                value: [
                    {
                        'Shopping Cart ID': shoppingCartID,
                        'Amount Paid': amountReceived,
                    },
                ],
            },
        ];

        let attempts = 0;
        let applyPaymentSuccessful = false;
        while (attempts < RETRY_LIMIT) {
            try {
                const [status, statusMsg] = await applyPayment(applyPaymentWebServiceParams, shoppingCartID);

                if (status === 'Success') {
                    // The payment was successfully applied, so break out of the loop
                    applyPaymentSuccessful = true;
                    break;
                } else if (status === 'Error') {
                    // An error occurred while attempting to apply the payment to the Shopping Cart
                    throw new Error(statusMsg);
                } else {
                    // An unknown error returned from the called web service
                    throw new Error(
                        `An unknown error occurred while attempting to call '${LibShoppingCartApplyPayment}' for '${shoppingCartID}'`
                    );
                }
            } catch (error) {
                // An error occurred with the called web service, so add to the error log and increment the attempt count
                errorLog.push(error);
                attempts++;
            }
        }

        // Check that the payment was successfully applied to the Provider's Shopping Cart
        if (!applyPaymentSuccessful) {
            // Failed to apply the payment for all allowable attempts
            throw new Error(
                `Failed to apply payment for ${shoppingCartID} (${SHOPPING_CART}) across ${attempts} attempts.`
            );
        }

        // BUILD THE SUCCESS RESPONSE OBJECT
        variableUpdates['MicroserviceResult'] = true;
        variableUpdates['MicroserviceMessage'] = `${SHOPPING_CART} payment applied for Microservice workflow task.`;
        variableUpdates['ApplyPaymentRes'] = 'Success';
    } catch (error) {
        let errorToReturn = error.message ? error.message : `Unhandled error occurred: ${JSON.stringify(error)}`;

        if (errorLog.length > 0) {
            errorToReturn += '; ' + JSON.stringify(errorLog);
        }

        logger.info(errorToReturn);

        // BUILD THE ERROR RESPONSE OBJECT
        variableUpdates['MicroserviceResult'] = false;
        variableUpdates['MicroserviceMessage'] = `${SHOPPING_CART} payment applied for Microservice workflow task.`;
        variableUpdates['ApplyPaymentRes'] = 'Error';
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
