/**
 * FeeSCHFinalizePendingTransactions
 * Category: Scheduled
 * Modified: 2025-01-09T15:13:46.39Z by john.sevilla@visualvault.com
 * Script ID: Script Id: e267ea38-9cce-ef11-82bf-a0dcc70b93c8
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-10
 */
const logger = require('../log');
const dayjs = require('dayjs');
const currency = require('currency.js');

module.exports.getCredentials = function () {
  var options = {};
  options.customerAlias = "WADNR";
  options.databaseAlias = "fpOnline";
  options.userId = "09f356bb-3f44-49b1-a55f-d2caa2de9cc1";
  options.password = "xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=";
  options.clientId = "09f356bb-3f44-49b1-a55f-d2caa2de9cc1";
  options.clientSecret = "xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=";
  return options;
};

module.exports.main = async function (vvClient, response, token) {
    /*
    Script Name:    FeeSCHFinalizePendingTransactions
    Customer:       WADNR
    Purpose:        Finalizing pending Transaction records whose associated Fee has been fully paid for any
                    Fees that were started within a configurable period of time

    Parameters:     NONE
 
    Return Object:
                    Message will be sent back to VV as part of the ending of this scheduled process.
    Pseudo code:
                    1. CALCULATE the cutoff/exclusion date for Fees to exclude any that should not be processed at this time
                    2. GET pending Transactions and associated Fee data within the valid timeframe calculated
                    3. FOR any pending Transactions returned:
                        a. CALCULATE their Fee's finalized balance with `LibFeeCalculateBalance`
                        b. IF their finalized balance is zero (fully paid):
                            i.  UPDATE the Transaction's status to 'Finalized' using `LibTransactionFinalizeTransaction`
                    4. RETURN a success message for the scheduled service
 
    Date of Dev: 01/08/2025
    Last Rev Date: 01/08/2025
    Revision Notes:
    01/08/2025 - John Sevilla: Script migrated.
    */

    logger.info(`Start of logic for FeeSCHFinalizePendingTransactions on ${new Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // You will see the responseMessage in the scheduled process log ONLY if the process runs manually.
    response.json(200, `Start of logic for FeeSCHFinalizePendingTransactions on ${new Date()}`);

    // Array for capturing error messages that may occur during the execution of the script.
    let errorLog = [];

    // Contains the success or error response message that is sent when the service completes
    let responseMessage = '';

    // Identifies the process in VV servers
    const scheduledProcessGUID = token;

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    // Form Template Names
    const TRANSACTION = 'Transaction';

    // Web Services Names
    const LibFeeCalculateBalance = 'LibFeeCalculateBalance';
    const LibTransactionFinalizeTransaction = 'LibTransactionFinalizeTransaction';

    // Custom Query Names
    /**
     * This query makes use of several TSQL clauses/functions in order return the data in a format that is optimized for this web service's purposes.
     * 
     * _Links to the relevant documentation for each function/clause are provided below_:
     * - {@link https://learn.microsoft.com/en-us/sql/t-sql/queries/with-common-table-expression-transact-sql?view=sql-server-ver16 WITH}
     * - {@link https://learn.microsoft.com/en-us/sql/t-sql/queries/select-over-clause-transact-sql?view=sql-server-ver16#a-using-the-over-clause-with-the-row_number-function PARTITION BY}
     * - {@link https://learn.microsoft.com/en-us/sql/t-sql/functions/string-agg-transact-sql?view=sql-server-ver16 STRING_AGG}
     * - {@link https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql?view=sql-server-ver16 GROUP BY}
     */
    const GetFeePendingTransactionsAfterCutoff = 'zWebSvc Get Fee Pending Transactions After Cutoff';

    // Transaction Statuses
    const PENDING = 'Pending';
    const FINALIZED = 'Finalized';

    /** **NOTE**: Represents the period of time in days for fees started since the cutoff to today. 
     *  Used for determining valid fee transactions for processing. */
    const FEE_CUTOFF_DATE_OFFSET = 365;

    /** **NOTE**: Represents the number of days since a Fee record was last modified so that we can exclude 
     *  records from the results that were recently modified */
    const FEE_EXCLUSION_DATE_OFFSET = 7;

    /** **NOTE**: Used in the custom query to get pending Transactions for the Provider so that their Fee records can be divided (partitioned) into groups, for up to `n` items for each division. 
     *  - This limit is set in place by the total number of records that can be  handled by the `LibFeeCalculateBalance` web service since it can only process a limited number of specified records.
     *  - e.g., if this limit is set to `10`, and a given Provider (`PROVIDER-001`) has `23` pending Transactions, then their rows will return something approximately like the following:
     *    - `PROVIDER-001`, `[T1 ... T10]` 
     *    - `PROVIDER-001`, `[T11 ... T20]` 
     *    - `PROVIDER-001`, `[T21 ... T23]` */
    const TRANSACTION_PARTITION_LIMIT = 10;

    /* -------------------------------------------------------------------------- */
    /*                              Script Variables                              */
    /* -------------------------------------------------------------------------- */

    /** Stores the form ID for any pending transaction records that were updated to 'Finalized' */
    const finalizedTransactions = [];

    // Stores the number of pending transaction records that are processed by the scheduled service, but not necessarily finalized
    let pendingTransactionsCount = 0;

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

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
            throw new Error(`${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`);
        }

        const status = vvClientRes.meta.status;

        // If the status is not the expected one, throw an error
        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason = vvClientRes.meta.errors && vvClientRes.meta.errors[0] ? vvClientRes.meta.errors[0].reason : 'unspecified';
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
                throw new Error(`${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`);
            }
        }

        return vvClientRes;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the data property of a vvCliente API response object is not empty
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
                throw new Error(`${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`);
            }
            // If it is a Web Service response, check that the first value is not an Error status
            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(`${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`);
                }
            }
        }
        return vvClientRes;
    }

    /**
	 * 
	 * @param {Object} vvClientRes - Parsed response object from the API call
	 * @param {String} webServiceName - Name of the executed web service to be evaluated
     * @param {String} target - A descriptor of the web service target (e.g., a Form ID)
	 * @returns {Array} The remaining entries in the `data` property of the response following the status and its status message, as an `Array`
	 */
	function checkWebServiceRes(vvClientRes, webServiceName, target) {
		const [ status, statusMsg, ...data ] = vvClientRes.data;

		if (status === "Error") {
			throw new Error(statusMsg);
		}
		else if (status !== "Success") {
            throw new Error(`An unexpected status (${status}) was returned when calling ${webServiceName} for ${target}.`);
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
		 * @param {String} target - A descriptor of the web service target (e.g., a Form ID)
		 * @returns The `Promise` for the web service API call which returns its `data` property
		 */
		this.runWebService = (webServiceParams, target) => {
			// Generate the description using the description of the web service's target
			const shortDescription = `Executing ${this.webServiceName} for '${target}'`;
			return vvClient.scripts.runWebService(this.webServiceName, webServiceParams)
				.then((res) => parseRes(res))
				.then((res) => checkMetaAndStatus(res, shortDescription))
				.then((res) => checkDataPropertyExists(res, shortDescription))
				.then((res) => checkDataIsNotEmpty(res, shortDescription))
				.then((res) => checkWebServiceRes(res, this.webServiceName, target));
		}
	}

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Instantiate the web service manager for each web service to be able to create web service requests
        const { runWebService: calculateBalance } = new WebServiceManager(LibFeeCalculateBalance);
		const { runWebService: finalizeTransaction } = new WebServiceManager(LibTransactionFinalizeTransaction);

        // Calculate the cutoff date for Fees with pending Transactions by subtracting today's date by the offset
        const cutoffDate = dayjs().subtract(FEE_CUTOFF_DATE_OFFSET, 'day').toISOString();

        // Calculate the exclusion date for Fees last modified to exclude results that have recently been processed
        const exclusionDate = dayjs().subtract(FEE_EXCLUSION_DATE_OFFSET, 'day').toISOString();

        // Search for all pending Transactions within the valid timeframe
        const getPendingTransactionsParams = {
            params: JSON.stringify([
                {
                    parameterName:  'cutoffDate',
                    value:          cutoffDate
                },
                {
                    parameterName:  'exclusionDate',
                    value:          exclusionDate
                },
                {
                    parameterName:  'txPartitionLimit',
                    value:          TRANSACTION_PARTITION_LIMIT
                }
            ])
        };
        const getPendingTransactionsDescription = `Getting ${PENDING.toLowerCase()} ${TRANSACTION}s before ${exclusionDate} and after ${cutoffDate}.`; 

        // Get the pending Transactions and their associated Fee data
        /** 
         * Array of custom query results where each row returned contains a `providerID` property for the Provider associated with the transaction collection.
         * A single provider may have multiple `transactionDataJSON` returned depending on the quantity of their pending transactions and the configured number of
         * divisions for those transactions. Each JSON string represents an array of objects, where each object contains a Fee ID and its associated Transaction ID
         * @type {{ providerID: string, transactionDataJSON: { transactionID: string, feeID: string }[]}[]}
         */
        const pendingTransactionCollections = await vvClient.customQuery.getCustomQueryResultsByName(GetFeePendingTransactionsAfterCutoff, getPendingTransactionsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, getPendingTransactionsDescription))
            .then((res) => checkDataPropertyExists(res, getPendingTransactionsDescription))
            .then((res) => res.data);

        // For any pending Transactions, calculate its associated Fee balance(s) to determine if they have been fully paid or not
        if (pendingTransactionCollections.length > 0) {
            for (let transactionCollection of pendingTransactionCollections) {
                // Get the Provider ID, in addition to its Transaction Data JSON string for this collection
                // NOTE: The JSON string is an array of objects which each contain: the Transaction record ID and the Fee record ID
                const { providerID, transactionDataJSON } = transactionCollection;

                // Parse the transaction data JSON string as an array, and instantiate a new `Map`, associating each Fee to its corresponding Transaction by their form IDs
                const transactionDataArr = JSON.parse(transactionDataJSON);
                const feeTransactionMap = new Map(
                    transactionDataArr.map(({ feeID, transactionID }) => [feeID, transactionID])
                );

                // Increment the count of processed transactions by the number of elements in the fee/transaction map
                pendingTransactionsCount += feeTransactionMap.size;

                // Declare the list of Fee IDs for this collection by getting the key values for the fee/transaction map and converting it to an array
                const feeIDs = Array.from(feeTransactionMap.keys());

                // Define the parameters to calculate the balance of the fee(s) for the given Provider in this collection
                const calculateBalanceParams = [
                    {
                        name: 	"Fee IDs",
                        value:	feeIDs
                    },
                    {
                        name: 	"Provider ID",
                        value:	providerID
                    },
                    {
                        name:	"All Provider Flag",
                        value: 	"False"
                    }
                ];

                // Calculate the balance and determine for each transaction if its associated Fee is fully paid
                const balanceResult = await calculateBalance(calculateBalanceParams, feeIDs.join('/'))
                    .then((webServiceData) => {
                        // Destruct the web service's returned data to get the relevant balance data
                        const [ balanceDataArr ] = webServiceData;

                        // Iterate over the array of balance data returned and filter the results to only get Fees which have been paid in full
                        const fullyPaidFees = balanceDataArr.reduce((fullyPaidFees, feeBalanceObj) => {
                            // Get the currency value for the finalized balance remaining and check if its value is `0`, which indicates it was fully paid
                            const finalizedBalanceRemaining = currency(feeBalanceObj["Balance Due calculated from Finalized Transactions"]).value;
                            if (finalizedBalanceRemaining == 0) {
                                fullyPaidFees.push(feeBalanceObj["Fee ID"]);
                            }

                            return fullyPaidFees;
                        }, []);
                        
                        // Evaluate the determined fully paid Fees and return an array containing each of their corresponding Transaction record IDs
                        const transactionsToFinalize = [];
                        if (fullyPaidFees.length > 0) fullyPaidFees.forEach((paidFeeID) => {
                            // Get the Fee's Transaction record ID from its corresponding `Map`
                            const transactionID = feeTransactionMap.get(paidFeeID);
                            transactionsToFinalize.push(transactionID);
                        });

                        return { transactionsToFinalize };
                    }).catch((error) => new Error(error));

                // Verify that no error occurred from the result of calling LibFeeCalculateBalance
                if (balanceResult instanceof Error) {
                    // The result was returned as an error, so append it to the error log and throw it as-is
                    errorLog.push(balanceResult);
                    throw balanceResult;
                }

                // Determine whether we need to finalize the pending Transaction(s) based on our previous evaluation
                if (balanceResult.transactionsToFinalize.length > 0) {
                    // Create web service parameters to finalize the transaction(s) using `LibTransactionFinalizeTransaction`
                    const finalizeTransactionParams = [
                        { 
                            name:   "Array Transaction Record ID",
                            value:  balanceResult.transactionsToFinalize
                        }
                    ];

                    // Wait for the transaction(s) to be finalized, then add them to the list of finalized Transactions when it completes successfully
                    await finalizeTransaction(finalizeTransactionParams, balanceResult.transactionsToFinalize.join('/'));
                    finalizedTransactions.push(...balanceResult.transactionsToFinalize);
                }
                else {
                    // It was determined that no Transactions in this set should be finalized, so proceed to the next transaction collection
                    continue;
                }
            }

            // Determine response message based on the number of pending transactions processed
            responseMessage = `${finalizedTransactions.length} ${TRANSACTION}s were successfully updated from '${PENDING}' to '${FINALIZED}' `;
            responseMessage += `from a total of ${pendingTransactionsCount} ${PENDING.toLowerCase()} ${TRANSACTION}(s).`;
        } 
        else {
            responseMessage = `No ${PENDING.toLowerCase()} ${TRANSACTION}s before '${exclusionDate}' and after '${cutoffDate}' were found.`;
        }

        // SEND THE SUCCESS RESPONSE MESSAGE
        // NOTE: You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // SEND THE ERROR RESPONSE MESSAGE
        if (errorLog.length > 0) {
            responseMessage = `Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = `Unhandled error occurred: ${error}`;
        }

        // NOTE: You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};

