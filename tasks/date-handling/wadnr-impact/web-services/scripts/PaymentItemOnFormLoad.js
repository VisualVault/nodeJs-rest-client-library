/**
 * PaymentItemOnFormLoad
 * Category: Workflow
 * Modified: 2025-02-04T18:25:31.477Z by john.sevilla@visualvault.com
 * Script ID: Script Id: b1c9a5c9-a4cf-ef11-82bf-a0dcc70b93c8
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
    /*Script Name: PaymentItemOnFormLoad
  Customer:      WADNR
  Purpose:       Performs checks and lookups that must happen as the Payment Item is loaded.
  Parameters:    Individual ID (String, Required) - The Form ID of the Payment Item's Individual
                 Fee ID (String, Required) - The Form ID of the Payment Item's Fee

  Return Array:   
                [0] Status: 'Success', 'Error'
                [1] Message
                [2] websvcData (Object) with the following properties:
                  calculatedFee (Object) - Data associated with the payment item's fee after being recalculated (using LibFeeCalculateBalance)
  Pseudo code:   
                1. Calculate balance of the Payment Item's Fee
                2. Add fee data to websvcData object
  
  Date of Dev: 01/10/2025
  Revision Notes:
  01/10/2025 - John Sevilla: Script migrated.
  02/04/2025 - John Sevilla: Update for new params
  */

    logger.info('Start of the process PaymentItemOnFormLoad at ' + Date());

    /****************
  Config Variables
  *****************/
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';
    const CalculateFeeBalanceWebsvcName = 'LibFeeCalculateBalance';

    /****************
  Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];
    let websvcData = {};

    try {
        /*********************
    Form Record Variables
    **********************/
        const IndividualID = getFieldValueByName('Individual ID');
        const FeeID = getFieldValueByName('Fee ID');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
    Helper Functions
    *****************/
        // Check if field object has a value property and that value is truthy before returning value.
        function getFieldValueByName(fieldName, isOptional) {
            try {
                let fieldObj = ffCollection.getFormFieldByName(fieldName);
                let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

                if (!isOptional && !fieldValue) {
                    throw new Error(`${fieldName}`);
                }
                return fieldValue;
            } catch (error) {
                errorLog.push(error.message);
            }
        }

        /**
         * Calls the calculate fee balance library on the given Individual ID and Fee ID
         * @param {String} individualID
         * @param {String} feeID
         * @returns {Object} Data on the calculated fee such as: Fee Amount Asssessed, Current Balance, Allow Installment, Balance Due, Total of Unfinalized Transactions, Balance Due calculated from Finalized Transactions
         */
        async function calculateFeeRecordBalance(individualID, feeID) {
            let calculateFeeBalanceParams = [
                { name: 'Fee IDs', value: [feeID] },
                { name: 'Individual ID', value: individualID },
                { name: 'All Business Fees Flag', value: 'False' },
            ];

            let calculateFeeBalanceResp = await vvClient.scripts.runWebService(
                CalculateFeeBalanceWebsvcName,
                calculateFeeBalanceParams
            );
            let calculateFeeBalanceData = calculateFeeBalanceResp.hasOwnProperty('data')
                ? calculateFeeBalanceResp.data
                : null;
            if (calculateFeeBalanceResp.meta.status !== 200) {
                throw new Error(`There was an error when calling ${CalculateFeeBalanceWebsvcName}.`);
            } else if (!Array.isArray(calculateFeeBalanceData)) {
                throw new Error(`Data was not returned when calling ${CalculateFeeBalanceWebsvcName}.`);
            } else if (calculateFeeBalanceData[0] === 'Error') {
                throw new Error(
                    `The call to ${CalculateFeeBalanceWebsvcName} returned with an error. ${calculateFeeBalanceData[1]}.`
                );
            } else if (calculateFeeBalanceData[0] !== 'Success') {
                throw new Error(`The call to ${CalculateFeeBalanceWebsvcName} returned with an unhandled error.`);
            } else if (Array.isArray(calculateFeeBalanceData[2]) === false || calculateFeeBalanceData[2].length < 1) {
                throw new Error(`Unexpected data returned from ${CalculateFeeBalanceWebsvcName}.`);
            }

            return calculateFeeBalanceData[2][0];
        }

        /****************
    BEGIN ASYNC CODE
    *****************/
        // Step 1. Calculate balance of the Payment Item's Fee
        let calculatedFee = await calculateFeeRecordBalance(IndividualID, FeeID);

        // Step 2. Add fee data to websvcData object
        websvcData.calculatedFee = {
            'Fee ID': calculatedFee['Fee ID'],
            'Balance Due calculated from Finalized Transactions':
                calculatedFee['Balance Due calculated from Finalized Transactions'],
        };

        // send to client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'PaymentItemOnFormLoad has returned successfully';
        outputCollection[2] = websvcData;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
