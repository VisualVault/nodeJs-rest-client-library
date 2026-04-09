/**
 * WorkflowShoppingCartReturnedCheck
 * Category: Workflow
 * Modified: 2025-01-14T18:45:57.943Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 8aa7bf9d-93d2-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');

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
    /*Script Name:  WorkflowShoppingCartReturnedCheck
     Customer:      WADNR
     Purpose:       The purpose of this process is to update the system when the financial staff flags an issue with the check
     Parameters:    ShoppingCartID - (String, Required)
                    ProviderNEWcheck - (String, Required)
                    ProviderNOTNEWcheck - (String, Required)
                
     Return Array:  No return array
                    
     Pseudo code:   1. Perform a getforms on the payment items related to the shoping cart
                    2. postforms on all payment items with check returned
                    3. Create new transaction records
                    4. If the provider is not going to send a check then create more transaction records.
                    5. get all the emails of all the profile admins associated with the provider
                    6. send out an email to all the profile admins
                    7. cleanup and finalize workflow
    
     Date of Dev: 01/13/2025
     Last Rev Date: 01/13/2025
     Revision Notes:
     01/13/2025 - John Sevilla: Script migrated.
     */

    logger.info('Start of the process WorkflowShoppingCartReturnedCheck at ' + Date());

    //respond immediately before the "processing"
    response.json(200, { success: true, message: 'Process started successfully.' });

    /**********************
     Configurable Variables
    ***********************/
    //customquery to pull emails associated with a provider
    let customQueryGetProfileAdminEmails = 'zWebSvc Find Profile Admin Email By Provider';

    //Template ID for the Payment Item
    let PaymentTemplateID = 'Payment Item';

    //Webservices called
    let TransactionCreateWebSvc = 'LibTransactionCreateTransaction';

    let executionId = response.req.headers['vv-execution-id']; //Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    let missingFieldGuidance =
        'Please provide a value for the missing field and try again, or contact a system administrator if this problem continues.';

    // Response array populated in try or catch block, used in response sent in finally block.
    let outputCollection = [];
    // Array for capturing error messages that may occur within helper functions.
    let errorLog = [];

    let providerID = '';
    let profileAdminEmaillArray;
    let emailArray = [];
    let emailTemplateName = 'Shopping Cart Check Returned';

    try {
        /*********************
         Form Record Variables
        **********************/
        //Create variables for the values on the form record
        let shoppingCartID = getFieldValueByName('SourceDocId');
        let ProviderNEWcheck = getFieldValueByName('PROV NEW CHECK');
        let ProviderNOTNEWcheck = getFieldValueByName('PROV NOT NEW CHECK');

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

                if (fieldValue === null) {
                    throw new Error(`A value property for ${fieldName} was not found.`);
                }
                if (!isOptional && !fieldValue) {
                    throw new Error(`A value for ${fieldName} was not provided.`);
                }
                return fieldValue;
            } catch (error) {
                errorLog.push(error);
            }
        }

        /****************
         BEGIN ASYNC CODE
        *****************/

        //1. Perform a getforms on the payment items related to the shoping cart
        let queryParamsPaymentItem = {
            q: `[Related Record ID] eq '${shoppingCartID}'`,
            fields: 'Status,Transaction Amount,Provider ID,Fee ID,Fund,Cost Center,GL Account',
        };

        let getFormsRespPaymentItem = await vvClient.forms.getForms(queryParamsPaymentItem, PaymentTemplateID);
        getFormsRespPaymentItem = JSON.parse(getFormsRespPaymentItem);
        let getFormsDataPaymentItem = getFormsRespPaymentItem.hasOwnProperty('data')
            ? getFormsRespPaymentItem.data
            : null;

        if (getFormsRespPaymentItem.meta.status !== 200) {
            throw new Error(`Error encountered when calling getForms. ${getFormsRespPaymentItem.meta.statusMsg}.`);
        }
        if (!Array.isArray(getFormsDataPaymentItem)) {
            throw new Error(`Data was not returned when calling getForms.`);
        }

        providerID = getFormsDataPaymentItem[0]['provider ID'];

        for (var paymentItemRecord of getFormsDataPaymentItem) {
            //Pull and store the GUID

            //2. postforms on all payment items with check returned
            let PaymentItemGUID = paymentItemRecord['revisionId'];

            let formUpdateObj = {};

            formUpdateObj['Check Returned'] = 'True';

            //2. Create new transaction records
            let postFormResp = await vvClient.forms.postFormRevision(
                null,
                formUpdateObj,
                PaymentTemplateID,
                PaymentItemGUID
            );
            if (postFormResp.meta.status !== 201) {
                throw new Error(
                    `An error was encountered when attempting to update the ${PaymentTemplateID} form. ${postFormResp.hasOwnProperty('meta') ? postFormResp.meta.statusMsg : postFormResp.message}`
                );
            }

            //3. Create new transaction records
            let webSvcParams1 = [
                { name: 'Transaction Category', value: 'Returned Check' },
                { name: 'Balance Change', value: 'Increase' },
                { name: 'Transaction Description', value: 'Returned Check' },
                { name: 'Transaction Amount', value: paymentItemRecord['transaction Amount'] },
                { name: 'Transaction Date', value: dayjs().toISOString() },
                { name: 'Fund', value: paymentItemRecord['fund'] },
                { name: 'Cost Center', value: paymentItemRecord['cost Center'] },
                { name: 'GL Account', value: paymentItemRecord['gL Account'] },
                { name: 'Related Record ID', value: shoppingCartID },
                { name: 'Fee ID', value: paymentItemRecord['fee ID'] },
                { name: 'Provider ID', value: paymentItemRecord['provider ID'] },
                { name: 'Status', value: 'Finalized' },
                { name: 'License ID', value: '' },
                { name: 'Transaction ID', value: '' },
            ];

            let createTransactionResp = await vvClient.scripts.runWebService(TransactionCreateWebSvc, webSvcParams1);
            let createTransactionData = createTransactionResp.hasOwnProperty('data')
                ? createTransactionResp.data
                : null;

            if (createTransactionResp.meta.status !== 200) {
                errorMessage = `There was an error when calling ${TransactionCreateWebSvc}.`;
            } else if (!Array.isArray(createTransactionData)) {
                errorMessage = `Data was not returned when calling ${TransactionCreateWebSvc}.`;
            } else if (createTransactionData[0] === 'Error') {
                errorMessage = `The call to ${TransactionCreateWebSvc} returned with an error. ${createTransactionData[1]}.`;
            } else if (createTransactionData[0] !== 'Success') {
                errorMessage = `The call to ${TransactionCreateWebSvc} returned with an unhandled error.`;
            } else if (!Array.isArray(createTransactionData[1]) || createTransactionData[1].length < 2) {
                throw new Error(`Unexpected data returned from ${TransactionCreateWebSvc}.`);
            }

            //4. If the provider is not going to send a check then create more transaction records.
            if (ProviderNOTNEWcheck == 'True') {
                let webSvcParams2 = [
                    { name: 'Transaction Category', value: 'Application Credit' },
                    { name: 'Balance Change', value: 'Decrease' },
                    { name: 'Transaction Description', value: 'Returned Check - Application Credit' },
                    { name: 'Transaction Amount', value: paymentItemRecord['transaction Amount'] },
                    { name: 'Transaction Date', value: dayjs().toISOString() },
                    { name: 'Fund', value: paymentItemRecord['fund'] },
                    { name: 'Cost Center', value: paymentItemRecord['cost Center'] },
                    { name: 'GL Account', value: paymentItemRecord['gL Account'] },
                    { name: 'Related Record ID', value: shoppingCartID },
                    { name: 'Fee ID', value: paymentItemRecord['fee ID'] },
                    { name: 'Provider ID', value: paymentItemRecord['provider ID'] },
                    { name: 'Status', value: 'Finalized' },
                    { name: 'License ID', value: '' },
                    { name: 'Transaction ID', value: '' },
                ];

                let createTransactionResp2 = await vvClient.scripts.runWebService(
                    TransactionCreateWebSvc,
                    webSvcParams2
                );
                let createTransactionData2 = createTransactionResp2.hasOwnProperty('data')
                    ? createTransactionResp2.data
                    : null;

                if (createTransactionResp2.meta.status !== 200) {
                    errorMessage = `There was an error when calling ${TransactionCreateWebSvc}.`;
                } else if (!Array.isArray(createTransactionData2)) {
                    errorMessage = `Data was not returned when calling ${TransactionCreateWebSvc}.`;
                } else if (createTransactionData2[0] === 'Error') {
                    errorMessage = `The call to ${TransactionCreateWebSvc} returned with an error. ${createTransactionData2[1]}.`;
                } else if (createTransactionData2[0] !== 'Success') {
                    errorMessage = `The call to ${TransactionCreateWebSvc} returned with an unhandled error.`;
                } else if (!Array.isArray(createTransactionData2[1]) || createTransactionData2[1].length < 2) {
                    throw new Error(`Unexpected data returned from ${TransactionCreateWebSvc}.`);
                }
            }
        }

        //5. get all the emails of all the profile admins associated with the provider
        // Query Params for getCustomQueryResultsByName.
        let sqlParams = [{ parameterName: 'ProviderID', value: providerID }];
        let queryParams = {
            params: JSON.stringify(sqlParams),
        };

        let customQueryResp = await vvClient.customQuery.getCustomQueryResultsByName(
            customQueryGetProfileAdminEmails,
            queryParams
        );
        customQueryResp = JSON.parse(customQueryResp);
        let customQueryData = customQueryResp.hasOwnProperty('data') ? customQueryResp.data : null;
        let customQueryLength = Array.isArray(customQueryData) ? customQueryData.length : 0;

        if (customQueryResp.meta.status !== 200) {
            throw new Error(`Error encountered when calling '${customQueryName}'. ${customQueryResp.meta.statusMsg}.`);
        }
        if (!customQueryData || !Array.isArray(customQueryData)) {
            throw new Error(`Data was not returned when calling '${customQueryName}'.`);
        }

        for (const emails of customQueryData) {
            if (emails.email) {
                emailArray.push(emails.email);
            }
        }

        //6. send out an email to all the profile admins
        profileAdminEmaillArray = emailArray.toString();

        let tokenArr = [{ name: '[Provider ID]', value: providerID }];
        let emailRequestArr = [
            { name: 'Email Name', value: emailTemplateName },
            { name: 'Tokens', value: tokenArr },
            { name: 'Email Address', value: profileAdminEmaillArray },
            { name: 'Email AddressCC', value: '' },
            { name: 'SendDateTime', value: '' },
            { name: 'RELATETORECORD', value: [providerID] },
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: {
                    'Primary Record ID': providerID,
                    'Other Record': shoppingCartID,
                },
            },
        ];

        let emailCommLogResp = await vvClient.scripts.runWebService(
            'LibEmailGenerateAndCreateCommunicationLog',
            emailRequestArr
        );
        let emailCommLogData = emailCommLogResp.hasOwnProperty('data') ? emailCommLogResp.data : null;

        if (emailCommLogResp.meta.status !== 200) {
            throw new Error(`There was an error when calling LibEmailGenerateAndCreateCommunicationLog.`);
        }
        if (!emailCommLogData || !Array.isArray(emailCommLogData)) {
            throw new Error(`Data was not returned when calling LibEmailGenerateAndCreateCommunicationLog.`);
        }
        if (emailCommLogData[0] === 'Error') {
            throw new Error(
                `The call to LibEmailGenerateAndCreateCommunicationLog returned with an error. ${emailCommLogData[1]}.`
            );
        }
        if (emailCommLogData[0] !== 'Success') {
            throw new Error(`The call to LibEmailGenerateAndCreateCommunicationLog returned with an unhandled error.`);
        }

        //7. cleanup and finalize workflow
        let variableUpdates = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Shopping Cart Returned Check Process Completed',
        };
        let completeResp = await vvClient.scripts.completeWorkflowWebService(executionId, variableUpdates);

        if (completeResp.meta.status == 200) {
            logger.info('Completion signaled to WF engine successfully.');
        } else {
            logger.info('There was an error signaling WF completion.');
        }
    } catch (err) {
        logger.info('Error encountered' + err);
        let errorToReturn = err;

        if (errorLog.length > 0) {
            logger.info(JSON.stringify(`${err} ${errorLog}`));
            errorToReturn = errorToReturn + '; ' + `${errorLog}`;
        }

        let variableUpdates = {
            MicroserviceResult: true,
            MicroserviceMessage: errorToReturn,
        };
        // Signal the completion of the workflow item
        let completeResp = await vvClient.scripts.completeWorkflowWebService(executionId, variableUpdates);
        if (completeResp.meta.status == 200) {
            logger.info('Completion signaled to WF engine successfully.');
        } else {
            logger.info('There was an error signaling WF completion.');
        }
    }
};
