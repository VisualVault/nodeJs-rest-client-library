/**
 * FeeWaiveForgiveFee
 * Category: Workflow
 * Modified: 2026-03-05T17:40:51.627Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 3639a77d-0bce-ef11-82bd-d3a492f2461d
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
    /*Script Name:	FeeWaiveForgiveFee
	  Customer:     WADNR
	  Purpose:      Allow Finance Editors the ability to waive or forgive a fee before the provider has paid for it. This allows for staff to waive items such as fees when statute allows this for non-profit organizations for example. 

	  Parameters:   
          Action (String, Required) The desired action to perform on the Fee (Waive|Forgive)
          Individual ID (String, Required) Form ID for the Individual related to the Fee
					Form ID (String, Required) Instance name of the given Fee
					Fee Description (String, Required) Description of the Fee
					Fund (String, Required) The Fund related to the Fee
					Cost Center (String, Required) The Cost Center related to the Fee
					GL Account (String, Required) The GL Account related to the Fee

	  Return Array:   
					outputCollection[0]: Status
          outputCollection[1]: Short description message
          outputCollection[2]: (String) Revision ID (GUID) for the forgiven/waived Fee
	  Pseudo code:   
          1. GET unpaid Payment Items for this Fee and their related Shopping Cart status
					2. IF the action is 'Waived':
						a. CHECK that the related Shopping Cart(s) for the Payment Item are not paid
					3. FOR any unpaid Payment Items related to the Fee:
						a. UPDATE its status based on the desired action using `LibPaymentItemUpdate`
					4. CALCULATE the current balance for the Fee using `LibFeeCalculateBalance`
					5. GET the revision ID and related record ID for the Fee
					6. IF there the Fee's current balance is greater than 0:
						a. CREATE a Transaction record to zero the balance using `LibTransactionCreateTransaction`
					7. UPDATE the Fee's status and current balance to reflect the action performed
					8. RETURN the revision ID of the updated Fee along with descriptive information
  
    Date of Dev: 01/08/2025
    Last Rev Date: 03/05/2026
    Revision Notes:
    01/08/2025 - John Sevilla: Script migrated.
    03/05/2026 - Mauro Rapuano: Updated Provider ID to be Individual ID
	  */

    logger.info('Start of the process FeeWaiveForgiveFee at ' + Date());

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
    const PAYMENT_ITEM = 'Payment Item';
    const FEE = 'Fee';

    // Web Service Names
    const LibPaymentItemUpdate = 'LibPaymentItemUpdate';
    const LibFeeCalculateBalance = 'LibFeeCalculateBalance';
    const LibTransactionCreateTransaction = 'LibTransactionCreateTransaction';

    // Custom Query Names
    const GetFeeUnpaidPaymentItems = 'zWebSvc Get Fee Unpaid Payment Items';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // Form Statuses
    const FINALIZED = 'Finalized';

    // Action Definitions
    const WAIVE = 'Waive';
    const FORGIVE = 'Forgive';
    /** **NOTE**: Associates each action to its corresponding transaction and fee data */
    const ACTIONS = new Map([
        [
            WAIVE,
            {
                identifier: 'WAIVED',
                category: 'Fee Waived',
                status: 'Waived',
                descriptor: 'waived',
            },
        ],
        [
            FORGIVE,
            {
                identifier: 'FORGIVEN BALANCE',
                category: 'Fee Voided',
                status: 'Voided Balance',
                descriptor: 'forgiven',
            },
        ],
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get required web service parameters
        const action = getFieldValueByName('Action');
        const individualID = getFieldValueByName('Individual ID');
        const feeID = getFieldValueByName('Form ID');
        const feeDescription = getFieldValueByName('Fee Description');
        const fund = getFieldValueByName('Fund');
        const costCenter = getFieldValueByName('Cost Center');
        const glAccount = getFieldValueByName('GL Account');

        // Check if required parameters were provided
        if (!action || !individualID || !feeID || !feeDescription || !fund || !costCenter || !glAccount) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // Get the transaction category for this action and check that it is a valid option
        const actionData = ACTIONS.get(action) || null;
        if (!actionData) {
            throw new Error(`${action} is not a valid action.`);
        }

        // Get the properties for the selected action from its data object
        const {
            identifier: transactionIdentifier,
            category: transactionCategory,
            status: statusToUpdate,
            descriptor: updateDescriptor,
        } = actionData;

        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: updatePaymentItem } = new WebServiceManager(LibPaymentItemUpdate);
        const { runWebService: calculateBalance } = new WebServiceManager(LibFeeCalculateBalance);
        const { runWebService: createTransaction } = new WebServiceManager(LibTransactionCreateTransaction);

        // Define the query parameters to search for unpaid Payment Items related to this Fee
        const queryDescription = `Getting unpaid ${PAYMENT_ITEM}s for '${feeID}'`;
        const paymentQueryParams = {
            params: JSON.stringify([
                {
                    parameterName: 'feeID',
                    value: feeID,
                },
            ]),
        };

        // Get any unpaid Payment Items for this Fee and the related Shopping Cart status
        const unpaidPaymentItemsData = await vvClient.customQuery
            .getCustomQueryResultsByName(GetFeeUnpaidPaymentItems, paymentQueryParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, queryDescription))
            .then((res) => checkDataPropertyExists(res, queryDescription))
            .then((res) => res.data);

        // For the 'Waive' action, check that no Shopping Cart related to the Payment Item(s) is already paid
        if (action == WAIVE) {
            const shoppingCartIsPaid = unpaidPaymentItemsData.some((paymentItem) =>
                Boolean(paymentItem.shoppingCartIsPaid)
            );

            if (shoppingCartIsPaid) {
                throw new Error(
                    `The balance cannot be ${updateDescriptor} because the ${FEE}'s ${PAYMENT_ITEM}s are in ${SHOPPING_CART}s that are ineligible to be ${updateDescriptor}.`
                );
            }
        }

        // For any unpaid Payment Items, update their status
        for (let unpaidPaymentItem of unpaidPaymentItemsData) {
            // Get the form ID for this Payment Item
            const { paymentItemID } = unpaidPaymentItem;

            const updatePaymentItemParams = [
                {
                    name: 'Payment Item ID',
                    value: paymentItemID,
                },
                {
                    name: 'PaymentItemUpdateObject',
                    value: {
                        Status: 'Waived',
                        // NOTE: Setting `Related Record ID` to a blank string disassociates from Shopping Cart
                        'Related Record ID': '',
                    },
                },
                {
                    name: 'Transaction Record Category',
                    value: transactionCategory,
                },
                {
                    name: 'External Transaction ID',
                    value: transactionIdentifier,
                },
                // NOTE: Whether it is forgiven/waived, the Payment Item's status should always be set as 'Finalized'
                {
                    name: 'Finalize Transaction Record Status',
                    value: FINALIZED,
                },
            ];

            // Call the `LibPaymentItemUpdate` web service to update the given Payment Item
            await updatePaymentItem(updatePaymentItemParams, paymentItemID);
        }

        // Calculate the current balance of the Fee using `LibFeeCalculateBalance`
        const calculateBalanceParams = [
            {
                name: 'Fee IDs',
                value: [feeID],
            },
            {
                name: 'Individual ID',
                value: individualID,
            },
            {
                name: 'All Business Fees Flag',
                value: 'False',
            },
        ];

        const [calculatedBalanceData] = await calculateBalance(calculateBalanceParams, feeID);

        // Check that there was a remaining balance for the Fee based on the response from the web service
        if (!calculatedBalanceData) {
            throw new Error(`There is no remaining balance for the ${FEE} to be ${updateDescriptor}.`);
        }

        const feeCurrentBalance = calculatedBalanceData['Current Balance'];

        // Get the form data for the Fee
        const getFeeDescription = `Getting revision ID for '${feeID}'`;
        const getFeeParams = {
            q: `[Form ID] eq '${feeID}'`,
            fields: 'id,name,[Related Record ID]',
        };

        // Get the Fee's revision ID and related record ID
        const { revisionId: feeGUID, ['related Record ID']: feeRelatedRecordID } = await vvClient.forms
            .getForms(getFeeParams, FEE)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, getFeeDescription))
            .then((res) => checkDataPropertyExists(res, getFeeDescription))
            .then((res) => checkDataIsNotEmpty(res, getFeeDescription))
            .then((res) => res.data[0]);

        // If there is a remaining balance create a Transaction record to zero the balance
        if (feeCurrentBalance > 0) {
            const createTransactionParams = [
                { name: 'Status', value: FINALIZED },
                { name: 'Related Record ID', value: feeRelatedRecordID },
                { name: 'Individual ID', value: individualID },
                { name: 'Fee ID', value: feeID },
                { name: 'Transaction Category', value: transactionCategory },
                { name: 'Transaction Description', value: feeDescription },
                { name: 'Transaction Amount', value: feeCurrentBalance },
                { name: 'Transaction Date', value: new Date().toISOString() },
                { name: 'Transaction ID', value: transactionIdentifier },
                { name: 'Balance Change', value: 'Decrease' },
                { name: 'Cost Center', value: costCenter },
                { name: 'GL Account', value: glAccount },
                { name: 'Fund', value: fund },
            ];

            await createTransaction(createTransactionParams, feeID);
        }

        // Build the Fee's update object and process description
        const feeUpdateDescription = `Updating ${feeID} to '${statusToUpdate}'.`;
        const feeUpdateObject = {
            Status: statusToUpdate,
            'Current Balance': 0,
        };

        // Update the Fee using the update object and gets its revision ID
        const updatedFeeGUID = await vvClient.forms
            .postFormRevision(null, feeUpdateObject, FEE, feeGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, feeUpdateDescription))
            .then((res) => checkDataPropertyExists(res, feeUpdateDescription))
            .then((res) => checkDataIsNotEmpty(res, feeUpdateDescription))
            .then((res) => res.data.revisionId);

        // Define the return object for displaying success message to user
        const displayMsgObj = {
            title: 'Fee ' + updateDescriptor.charAt(0).toUpperCase() + updateDescriptor.slice(1).toLowerCase(),
            desc: updateDescriptor,
            guid: updatedFeeGUID,
        };

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = `${feeID} was successfully ${updateDescriptor}.`;
        outputCollection[2] = displayMsgObj;
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
