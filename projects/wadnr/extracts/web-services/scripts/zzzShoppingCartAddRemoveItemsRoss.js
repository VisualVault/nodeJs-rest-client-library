/**
 * zzzShoppingCartAddRemoveItemsRoss
 * Category: Workflow
 * Modified: 2025-06-03T20:39:54.47Z by moises.savelli@visualvault.com
 * Script ID: Script Id: d5059129-bf14-f011-82cb-e559b84bbe55
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
    /*Script Name:	ShoppingCartAddRemoveItems
	  Customer:     WADNR
	  Purpose:      Provides a unified mechanism to add/remove Payment Items from a Individual's Shopping Cart, including: findings any related Payment Items,
	  				updating/unrelating Payment Items based on the desired action, and notifying the user of any pertinent information.

	  Parameters:   Action:  			(Array, Required) - Desired action to perform on the selected Payment Items (Add|Remove)
	  				Notify User:		(String, Required) - Flag to indicate whether or not to notify user if a selected item has related Payment Items
	  				Shopping Cart ID:	(String, Required) - The Form ID of the current Shopping Cart record
                   	Shopping Cart GUID:	(String, Required) - The revision id of the current Shopping Cart record
					Selected Items:		(Array|String, Required) - Payment Item Form GUIDs to remove from Shopping Cart (Array), or the Payment Item ID to add back to the cart (String)
					Individual ID:		(String, Required) - The ID of the Individual for the current Shopping Cart

	  Return Array:   
					outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: (Number) The new Total Amount for the Shopping Cart after adding/removing Payment Items
	  Pseudo code:   
	  				1. CHECK that all parameters were provided in a valid format
					2. CREATE the Payment Item search string depending on the provided parameters
					3. GET any Payment Items related to the selected Payment Item(s)
					4. IF there are related items, and we need to notify the user:
						a. RETURN the related Payment Item data to the user
					   OTHERWISE if we have related items, add their revision IDs to the list of Payment Items
					5. CREATE the update object for the Payment Items depending on the action selected
					6. UPDATE all of the selected/related Payment Items
					7. UPDATE the related Shopping Cart using `LibShoppingCartManageItems` to get the new Total Amount
					8. IF the desired action is to 'Remove':
						a. UNRELATE each Payment Item from the Shopping Cart
					9. RETURN a data object that depends on the action selected
  
    Date of Dev: 01/13/2025
    Revision Notes:
    01/13/2025 - John Sevilla: Script migrated.
	02/04/2025 - John Sevilla: Update for new params
	  */

    logger.info('Start of the process ShoppingCartAddRemoveItems at ' + Date());

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

    // Form Template names
    const SHOPPING_CART = 'zShoppingCartRoss';
    const PAYMENT_ITEM = 'Payment Item';

    // Web Service Names
    const LibShoppingCartManageItems = 'zLibShoppingCartManageItemsRoss';

    // Custom Query Names
    const GetRelatedPaymentItems = 'zWebSvc Get Related Payment Items';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // Actions
    const ADD = 'Add';
    const REMOVE = 'Remove';

    /** **NOTE**: Associates each action with a function to verify the `Selected Items` parameter passed */
    const VALID_ACTIONS = new Map([
        [ADD, (param) => typeof param === 'string'],
        [REMOVE, (param) => Array.isArray(param) && param.length > 0],
    ]);

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

    /**
     * Executes a custom query by name by passing in query parameters
     * @param {String} queryName - The name of the custom query as it is defined in VisualVault
     * @param {Array} params - List of the parameter names and their value to be passed to the query
     * @param {String} shortDescription - Description of the query to be performed
     * @param {Boolean} checkDataReturned - Optional argument that determines whether or not to check if the data is not empty
     * @returns The `Promise` for the custom query call which returns its `data` property
     */
    function executeCustomQuery(queryName, params, shortDescription, checkDataReturned = true) {
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

    function getForms(getFormsParams, templateName, target, checkDataReturned = true) {
        const shortDescription = `Getting form data for '${target}'`;

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => (checkDataReturned ? checkDataIsNotEmpty(res, shortDescription) : res))
            .then((res) => res.data);
    }

    function updateFormRecord(
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

    /**
     * Updates several payment item records with a uniform update object
     * @param {string[]} paymentItemGUIDs
     * @param {object} fieldValuesToUpdate - Updates that will be made to ALL items
     * @returns {object} VV postformrevision data objects for the updated items
     */
    async function updatePaymentItemRecords(paymentItemGUIDs, fieldValuesToUpdate) {
        const paymentItemUpdatePromises = paymentItemGUIDs.map((piGUID) =>
            updateFormRecord(fieldValuesToUpdate, PAYMENT_ITEM, piGUID)
        );

        return Promise.all(paymentItemUpdatePromises);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    main_process: try {
        // Get required web service parameters
        const action = getFieldValueByName('Action');
        const notifyUser = getFieldValueByName('Notify User');
        const shoppingCartID = getFieldValueByName('Shopping Cart ID');
        const shoppingCartGUID = getFieldValueByName('Shopping Cart GUID');
        const selectedItems = getFieldValueByName('Selected Items');
        const individualID = getFieldValueByName('Individual ID');

        // Check if required parameters were provided
        if (!action || !notifyUser || !shoppingCartID || !shoppingCartGUID || !selectedItems || !individualID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Check that valid action was provided by getting its verification function
        // NOTE: It will be `null` if there is no matching action, and otherwise is a function to verify the `Selected Items` parameter
        const actionVerifier = VALID_ACTIONS.get(action) || null;
        if (!actionVerifier) {
            throw new Error(`'${action}' is not a valid action.`);
        }

        // Verify that the selected items were passed in with the correct data type based on the selected action
        const selectedItemsValid = actionVerifier(selectedItems);
        if (!selectedItemsValid) {
            throw new Error(
                `Invalid or missing data provided for Selected Items. Provided as '${selectedItems.constructor.name}' for the action of '${action}'.`
            );
        }

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: manageCartItems } = new WebServiceManager(LibShoppingCartManageItems);

        // Build the comma delimited string of Payment Items revision IDs to search for based on the selected action
        let paymentItemSearchString = '';
        const paymentItemGUIDs = new Set();
        if (action === ADD) {
            // We were provided the Payment Item's form ID, so acquire its revision ID
            const getPaymentItemParams = {
                q: `[Form ID] eq '${selectedItems}' AND [Shopping Cart Removed ID] eq '${shoppingCartID}'`,
                fields: 'id,name',
            };

            // Get the Payment Item returned from the query and assign its revision ID to the search string and its set
            const [paymentItemData] = await getForms(getPaymentItemParams, PAYMENT_ITEM, selectedItems);
            paymentItemSearchString = paymentItemData.revisionId;
            paymentItemGUIDs.add(paymentItemData.revisionId);
        } else if (action === REMOVE) {
            // The IDs are provided as an array, so simply return it as a string and iterate over the array to add to its set
            paymentItemSearchString = selectedItems.toString();
            selectedItems.forEach(paymentItemGUIDs.add, paymentItemGUIDs);
        } else {
            throw new Error(`Unrecognized action "${action}" when attempting to retrieve payment item data`);
        }

        // Update the search string so that all alphabetical characters in the revision ID are lower-case
        paymentItemSearchString = paymentItemSearchString.toLowerCase();

        // Get any related Payment Items using the search string
        const getRelatedPaymentItemsParams = [
            {
                parameterName: 'PaymentItemGUIDs',
                value: paymentItemSearchString,
            },
        ];

        const relatedPaymentItemData = await executeCustomQuery(
            GetRelatedPaymentItems,
            getRelatedPaymentItemsParams,
            `Getting related ${PAYMENT_ITEM}s for items to ${action.toLowerCase()}.`,
            false
        );

        // Evaluate if there are any related Payment Items and whether the user must be notified if so
        if (relatedPaymentItemData.length > 0 && notifyUser === 'True') {
            // BUILD THE SUCCESS RESPONSE ARRAY
            outputCollection[0] = 'Success';
            outputCollection[1] = 'Related Items Found';
            outputCollection[2] = relatedPaymentItemData;

            // Break out of the `try` block, and go straight to the `finally` block
            // NOTE: The `try` block is labeled as 'main_process' above to allow skipping to the `finally` block
            break main_process;
        }

        // For any related Payment Items, add them to the set of revision IDs
        if (relatedPaymentItemData.length > 0)
            for (let itemData of relatedPaymentItemData) {
                const { ['related Payments JSON']: relatedPaymentsJSON } = itemData;

                // Parse the JSON string of related Payment Items, and add their revision ID to the set
                // NOTE: We must convert the revision ID to lower-case to prevent duplicate IDs from being added
                const relatedItems = JSON.parse(relatedPaymentsJSON);
                relatedItems.forEach((relatedItem) => paymentItemGUIDs.add(relatedItem.revisionId.toLowerCase()));
            }

        const updateObj = {};
        if (action === ADD) {
            updateObj['Shopping Cart Removed ID'] = '';
            // NOTE: We do not set the `Related Record ID` field here because it is handled by `LibShoppingCartManageItems`
        } else if (action === REMOVE) {
            updateObj['Shopping Cart Removed ID'] = shoppingCartID;
            updateObj['Related Record ID'] = '';
        } else {
            throw new Error(`Unrecognized action "${action}" when attempting to update payment item data`);
        }

        // Update all of the Payment Item(s) with the update object based on the selected action
        const updatedPaymentItemRecords = await updatePaymentItemRecords(Array.from(paymentItemGUIDs), updateObj);

        // Call `LibShoppingCartManageItems` to get the new Total Amount for the Shopping Cart
        // NOTE: This will also pull in the added Payment Items and relate them again
        const manageItemsWebSvcParams = [
            { name: 'Shopping Cart ID', value: shoppingCartID },
            { name: 'Individual ID', value: individualID },
        ];
        const [paymentItemTotal] = await manageCartItems(manageItemsWebSvcParams, shoppingCartID);

        // Perform the desired action based on the selected action and build the return object
        const returnObj = {
            totalAmountDue: paymentItemTotal,
        };

        if (action === ADD) {
            // Define the return object's message
            returnObj.message = `${PAYMENT_ITEM + (paymentItemGUIDs.size > 1 ? 's' : '')} were successfully added to the ${SHOPPING_CART}.`;
        } else if (action === REMOVE) {
            // Unrelate each Payment Item from the Shopping Cart
            for (const paymentItemGUID of paymentItemGUIDs) {
                await vvClient.forms
                    .unrelateForm(shoppingCartGUID, paymentItemGUID)
                    .then((res) => parseRes(res))
                    .then((res) =>
                        checkMetaAndStatus(
                            res,
                            `Unrelating ${PAYMENT_ITEM} (${paymentItemGUID}) from ${SHOPPING_CART} (${shoppingCartGUID}).`
                        )
                    );
            }

            // Define the return object's message
            returnObj.message = `${PAYMENT_ITEM + (paymentItemGUIDs.size > 1 ? 's' : '')} were successfully removed from the ${SHOPPING_CART}.`;
        } else {
            throw new Error(
                `Unrecognized action "${action}" when attempting to measure payment item relationship to cart`
            );
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = `${action} Complete`;
        outputCollection[2] = returnObj;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred.';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        response.json(200, outputCollection);
    }
};
