/**
 * LibShoppingCartManageItems
 * Category: Workflow
 * Modified: 2025-09-15T20:36:34.32Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: 8e9c798e-83d2-ef11-82c1-f717fbb433ff
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const currency = require('currency.js');

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
    /* Script Name:   LibShoppingCartManageItems
       Customer:      VisualVault library function.
       Purpose:       The purpose of this process is to manage payment items on a shopping cart and return total balance of items
       Parameters:    Individual ID (String, Required) - The ID of the Individual to check for unpaid Payment Items for
                      Shopping Cart ID (String, Required) - The ID of the Shopping Cart to calculate Payment Items for
       Return Array:
                     [0] Status: 'Success', 'Error'
                     [1] Message
                     [2] PaymentItemTotal: Number
                     [3] FeePaidOnlyByCheck: String - "True"/"False"
       Psuedo code: 
                 1. CALL `LibShoppingCartHandleCarts` to update/create Payment Items for the Shopping Cart if needed
                 2. GET all Payment Items related to the Shopping Cart
                 3. CALCULATE unpaid Payment Item total
                 4. RETURN the Payment Item total and whether the Shopping Cart is paid by check or not

       Date of Dev: 01/13/2025
       Revision Notes:
       01/13/2025 - John Sevilla: Script migrated.
       01/27/2025 - John Sevilla: Updated for new params
      */

    const PROCESS_NAME = 'LibShoppingCartManageItems';
    logger.info(`Start of the process ${PROCESS_NAME} at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    // Form Template Names
    const PAYMENT_ITEM = 'Payment Item';

    // Web Service Names
    const LibShoppingCartHandleCarts = 'LibShoppingCartHandleCarts';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

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
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    /**
     *
     * @param {Object} vvClientRes - Parsed response object from the API call
     * @param {String} webServiceName - Name of the executed web service to be evaluated
     * @returns The third entry in the `data` property of the response corresponding to the actual response data
     */
    function checkWebServiceRes(vvClientRes, webServiceName) {
        const [status, statusMsg, data] = vvClientRes.data;

        if (status === 'Error') {
            throw new Error(statusMsg);
        } else if (status !== 'Success') {
            throw new Error(`The call to ${webServiceName} returned with an unhandled error.`);
        }

        return data;
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
                .then((res) => checkWebServiceRes(res, this.webServiceName));
        };
    }

    function getForm(templateName, query, fields, shortDescription, dataCanBeEmpty = true) {
        const getFormsParams = {
            q: query,
            fields: fields,
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => (dataCanBeEmpty ? res : checkDataIsNotEmpty(res, shortDescription)))
            .then((res) => res.data);
    }

    class ErrorLog {
        constructor(processName, error, credentials = { customerAlias: '', databaseAlias: '' }) {
            this.processName = processName;
            this.executionId = response.req.headers['vv-execution-id'];
            this.customerAlias = credentials.customerAlias;
            this.databaseAlias = credentials.databaseAlias;
            this.baseUrl = vvClient.getBaseUrl();
            // Instantiate the passed in error if it is not already
            if (!(error instanceof Error)) {
                const errorDefined = !!error;
                let errorMessage = '';
                errorMessage = errorDefined && (typeof error == 'string' ? error : null);
                errorMessage = errorMessage || error?.message || error?.statusMsg || error?.statusMessage || null;
                errorMessage = errorMessage || (Array.isArray(error) ? error.map((e) => String(e)).join('; ') : null);
                errorMessage = errorMessage || (errorLog.length > 0 ? `Error/s: ${errorLog.join('; ')}` : null);
                errorMessage = errorMessage || `Unhandled error occurred: ${JSON.stringify(error)}`;

                error = new Error(errorMessage);
            }
            this.error = error;
            this.errorLog = errorLog;
        }

        // ErrorLog class methods
        toJSON = (_key) => {
            const { error, errorLog, ...log } = this;
            log.message = error.message;
            log.stack = error.stack;
            log.errorLog = errorLog.map((e) => String(e));

            return log;
        };
        toString = () => JSON.stringify(this);
    }

    try {
        // Get required web service parameters
        const individualID = getFieldValueByName('Individual ID');
        const shoppingCartID = getFieldValueByName('Shopping Cart ID');

        // Check if required parameters were provided
        if (!individualID || !shoppingCartID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: handleShoppingCart } = new WebServiceManager(LibShoppingCartHandleCarts);

        // Call `LibShoppingCartHandleCarts` for this Shopping Cart to ensure that all desired Payment Items are related
        const handleCartParams = [
            {
                name: 'Individual ID',
                value: individualID,
            },
            {
                name: 'Shopping Cart ID',
                value: shoppingCartID,
            },
        ];
        const [handledCartData] = await handleShoppingCart(handleCartParams, shoppingCartID);

        // Create the search parameters to get related Payment Items (that have not been removed)
        const relatedItemsSearchTerms = [
            `[Status] eq 'Unpaid'`,
            `[Individual ID] eq '${individualID}'`,
            `[Shopping Cart Removed ID] eq ''`,
            `[Related Record ID] eq '${shoppingCartID}'`,
        ];

        // Get all Payment Items related to this Shopping Cart
        const unpaidRelatedItemsData = await getForm(
            PAYMENT_ITEM,
            relatedItemsSearchTerms.join(' AND '),
            'id,name,Fee ID,[Transaction Amount]',
            `Getting ${PAYMENT_ITEM}(s) for ${shoppingCartID} of '${individualID}'`
        );

        const filteredPaymentItems = unpaidRelatedItemsData.filter((paymentItem) =>
            handledCartData.relatedFees.includes(paymentItem['fee ID'])
        );

        // Calculate the sum of related Payment Items by their Transaction Amount
        let paymentItemTotal = filteredPaymentItems.reduce((paymentTotal, paymentItem) => {
            const transactionAmount = currency(paymentItem['transaction Amount']);
            paymentTotal = paymentTotal.add(transactionAmount);
            return paymentTotal;
        }, currency(0));

        // Set payment item total as the `currency` value property, and determine if the Shopping Cart is only paid by Check
        paymentItemTotal = paymentItemTotal.value;
        const paidOnlyByCheck = handledCartData.isPaidByCheck ? 'True' : 'False';

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibShoppingCartManageItems returned successfully';
        outputCollection[2] = paymentItemTotal;
        outputCollection[3] = paidOnlyByCheck;
    } catch (error) {
        const returnError = new ErrorLog(PROCESS_NAME, error, module.exports.getCredentials());
        logger.error(returnError.toString());

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error';
        outputCollection[1] = returnError.error.message;
        outputCollection[2] = null;
        outputCollection[3] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
