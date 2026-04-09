/**
 * LibShoppingCartCreate
 * Category: Workflow
 * Modified: 2025-01-30T16:30:06.263Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 77f4cb54-83d2-ef11-82c1-f717fbb433ff
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
    /*Script Name:	LibShoppingCartCreate
	  Customer:     WADNR
	  Purpose:      The purpose of this process is to create a shopping cart if one does not already exist for a given Provider

	  Parameters:   Individual ID             (String, Required) - The ID of the Individual to create a Shopping Cart for
                    isPayByCheck            (String) - (True/False) Signifies whether the Shopping Cart must be paid via check. Defaults to false.
                    isCCTPPaidByCustomer    (String) - (True/False) Signifies whether the credit card processing fee is paid by the customer or the program office. Defaults to false.
                    Bypass Verification     (String) - (True/False) Flag to bypass verification or not. Defaults to false.

	  Return Array:   
					outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2] returnObject (object): An object with the following properties:
                      shoppingCartGUID (string): GUID of newly created (or existing if verification executed) cart
                      shoppingCartFormID (string): ID of newly created (or existing if verification executed) cart
                      cartExists (boolean): If the cart existed before it was created
	  Pseudo code:   
	  				1. CHECK that required parameters were provided in valid formats
					2. IF the Bypass Verification is false or not provided:
						a. DETERMINE if the cart already exists using `LibShoppingCartVerifyExistence`
					3. IF the Shopping Cart is determined to not exist already:
						a. GET the Individual's information by their ID
						b. CREATE the Shopping Cart using the Individual's billing details
					4. RETURN the Shopping Cart's revision/form ID and whether it existed already
  
      Date of Dev: 01/13/2025
      Revision Notes:
      01/13/2025 - John Sevilla: Script migrated.
      01/22/2025 - John Sevilla: Updated for new params
      01/30/2025 - John Sevilla: Updated how data is retrieved for Individual
	  */

    logger.info('Start of the process LibShoppingCartCreate at ' + Date());

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
    const SHOPPING_CART = 'Shopping Cart';

    const LibShoppingCartVerifyExistence = 'LibShoppingCartVerifyExistence';
    const getIndividualDataByIDQueryName = 'zWebSvc Get Individual Data by ID';

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
        const [status, statusMsg, ...data] = vvClientRes.data;

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

    function createFormRecord(newRecordData, templateName, shortDescription = `Post form ${templateName}`) {
        return vvClient.forms
            .postForms(null, newRecordData, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * Takes any value and attempts to parse it as a boolean string (case-insensitive), returning true if parsed as 'true'
     * @param {*} value
     * @returns {boolean}
     */
    function getBoolStrValue(value) {
        return String(value).toLowerCase() === 'true';
    }

    /**
     * @param {string} queryName
     * @param {object} sqlParams An object used like a map for sql params (e.g. For @ProviderID in query,
     * sqlParams = { 'ProviderID': 'PROVIDER-00000N' })
     *
     * @returns {object[]} VV query result data objects. May be empty.
     */
    function getCustomQueryDataBySQLParams(queryName, sqlParams) {
        const shortDescription = `Custom Query using SQL Parameters for '${queryName}'`;

        const customQueryData = {};
        if (sqlParams) {
            const sqlParamArr = [];
            for (const parameterName in sqlParams) {
                sqlParamArr.push({
                    parameterName,
                    value: sqlParams[parameterName],
                });
            }
            customQueryData.params = JSON.stringify(sqlParamArr);
        }

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * Note: Similar query/data used for ShoppingCartVerifyExistingCart
     * @param {string} individualID
     * @returns {object} - Individual data object
     */
    async function getIndividualDataByID(individualID) {
        const [individualData] = await getCustomQueryDataBySQLParams(getIndividualDataByIDQueryName, {
            IndividualID: individualID,
            UserID: '',
        });

        if (!individualData) {
            throw new Error(`Unable to find individual data for ID "${individualID}"`);
        }

        return individualData;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const individualID = getFieldValueByName('Individual ID');
        const isPayByCheck = getBoolStrValue(getFieldValueByName('isPayByCheck', true));
        const isCCTPPaidByCustomer = getBoolStrValue(getFieldValueByName('isCCTPPaidByCustomer', true));
        // Get optional web service parameters
        const bypassVerification = getBoolStrValue(getFieldValueByName('Bypass Verification', true));

        // Check if required parameters were provided
        if (!individualID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: verifyCartExists } = new WebServiceManager(LibShoppingCartVerifyExistence);

        let shoppingCartGUID;
        let shoppingCartFormID;
        let cartExists = false;

        if (bypassVerification === false) {
            // Create web service parameters to verify existence of Shopping Cart
            const verifyCartParams = [
                {
                    name: 'Individual ID',
                    value: individualID,
                },
                {
                    name: 'isPayByCheck',
                    value: isPayByCheck,
                },
                {
                    name: 'isCCTPPaidByCustomer',
                    value: isCCTPPaidByCustomer,
                },
            ];

            // Get the returned ID data, and set corresponding variable if it is defined
            const [verifiedCartData] = await verifyCartExists(verifyCartParams, individualID);
            shoppingCartGUID = verifiedCartData.shoppingCartGUID || null;
            shoppingCartFormID = verifiedCartData.shoppingCartFormID || null;
            cartExists = shoppingCartGUID !== null;
        }

        if (!cartExists) {
            // No shopping cart exists of the given collection type for the Individual, so get the Individual's information
            const individualData = await getIndividualDataByID(individualID);

            const createCartDescription = `Creating ${SHOPPING_CART} for ${individualID}`;
            // Create the Shopping Cart post object from the Provider data
            const createCartData = {
                'Payer Name': `${individualData['first Name']} ${individualData['last Name']}`,
                'Mailing Country': individualData['country'],
                'Mailing Street': individualData['address Line 1'],
                'Mailing Street1': individualData['address Line 2'],
                'Mailing Street2': individualData['address Line 3'],
                'Mailing Zip Code': individualData['zip Code'],
                'Mailing City': individualData['city'],
                'Mailing State': individualData['state Code'],
                'Individual ID': individualID,
                Status: 'Unpaid',
                isPayByCheck: isPayByCheck,
                isCCTPPaidByCustomer: isCCTPPaidByCustomer,
            };

            // Check whether the Shopping Cart can only be paid by check, and set its payment type accordingly
            if (isPayByCheck) {
                createCartData['Payment Type'] = 'Check';
            }

            const { revisionId: cartGUID, instanceName: cartID } = await createFormRecord(
                createCartData,
                SHOPPING_CART,
                createCartDescription
            );
            // Set the cart's ID based on what was returned in the response
            shoppingCartGUID = cartGUID;
            shoppingCartFormID = cartID;
        }

        // Define the return object based on the determined identifiers for the Shopping Cart
        const returnObject = {
            shoppingCartGUID,
            shoppingCartFormID,
            cartExists,
        };

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibShoppingCartCreate returned successfully';
        outputCollection[2] = returnObject;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this
        outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        outputCollection[2] = null;
        outputCollection[3] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
