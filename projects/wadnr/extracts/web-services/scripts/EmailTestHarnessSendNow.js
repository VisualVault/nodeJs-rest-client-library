/**
 * EmailTestHarnessSendNow
 * Category: Form
 * Modified: 2024-10-24T19:46:16.21Z by brian.davis@visualvault.com
 * Script ID: Script Id: 3f4984ea-c290-ef11-82ae-862bfd7a22f1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
//EmailTestHarnessSendNow
var logger = require('../log');

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
    /*Script Name:  EmailTestHarnessSendNow
 Customer:      WADNR
 Purpose:       Test LibGenerateCommLogEmailSendNow
 Parameters:
    'Email Template Name'
    'Sent To'
    'Send CC'
    'Region ID'
    'OtherRecordID'
    'Token Name 1'
    'Token Value 1'
    'Token Name 2'
    'Token Value 2'
    'Token Name 3'
    'Token Value 3'
    'Token Name 4'
    'Token Value 4'
    'Token Name 5'
    'Token Value 5'

 Return Array:
                1. Status: 'Success', 'Error'
                2. Message: 'Communication Log Generated', return the error that occurred in the above logic. 

 Psuedo code: 
            1. Call LibGenerateCommLogEmailSendNow
            
 Date of Dev:  10/23/2024
 Last Rev Date: 
 Revision Notes:
        10/23/2024 - Brian Davis: Script created
 */

    logger.info('Start of the EmailTestHarnessSendNow at ' + Date());

    //Configurable Variables Start

    //Configurable Variables End

    //Script Variables Start
    let outputCollection = [];
    let errorLog = [];
    //Script Variables End

    try {
        /**********************
         Form Record Variables
        **********************/
        //Create variables for the values from the form record
        let emailName = getFieldValueByName('Email Template Name');
        let emailAddressList = getFieldValueByName('Sent To', 'optional');
        let emailAddressListCC = getFieldValueByName('Send CC', 'optional');
        let RegionID = getFieldValueByName('Region ID', 'optional');
        let OtherRecordID = getFieldValueByName('OtherRecordID', 'optional');
        let TokenNameOne = getFieldValueByName('Token Name 1', 'optional');
        let TokenValueOne = getFieldValueByName('Token Value 1', 'optional');
        let TokenNameTwo = getFieldValueByName('Token Name 2', 'optional');
        let TokenValueTwo = getFieldValueByName('Token Value 2', 'optional');
        let TokenNameThree = getFieldValueByName('Token Name 3', 'optional');
        let TokenValueThree = getFieldValueByName('Token Value 3', 'optional');
        let TokenNameFour = getFieldValueByName('Token Name 4', 'optional');
        let TokenValueFour = getFieldValueByName('Token Value 4', 'optional');
        let TokenNameFive = getFieldValueByName('Token Name 5', 'optional');
        let TokenValueFive = getFieldValueByName('Token Value 5', 'optional');
        let TokenValueSix = getFieldValueByName('Token Value 6', 'optional');
        let TokenNameSix = getFieldValueByName('Token Name 6', 'optional');
        let TokenValueSeven = getFieldValueByName('Token Value 7', 'optional');
        let TokenNameSeven = getFieldValueByName('Token Name 7', 'optional');
        let TokenValueEight = getFieldValueByName('Token Value 8', 'optional');
        let TokenNameEight = getFieldValueByName('Token Name 8', 'optional');
        let TokenValueNine = getFieldValueByName('Token Value 9', 'optional');
        let TokenNameNine = getFieldValueByName('Token Name 9', 'optional');
        let TokenValueTen = getFieldValueByName('Token Value 10', 'optional');
        let TokenNameTen = getFieldValueByName('Token Name 10', 'optional');
        let userID = getFieldValueByName('Sent/Recorded By', 'optional');

        /*********************
         Helper Functions
        *********************/
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

        /*********************
         BEGIN ASYNC CODE
        *********************/
        //Step 1 - call LibGenerateCommLogEmailSendNow
        let emailTemplateName = emailName;

        let tokenArr = [
            { name: '[' + TokenNameOne + ']', value: TokenValueOne },
            { name: '[' + TokenNameTwo + ']', value: TokenValueTwo },
            { name: '[' + TokenNameThree + ']', value: TokenValueThree },
            { name: '[' + TokenNameFour + ']', value: TokenValueFour },
            { name: '[' + TokenNameFive + ']', value: TokenValueFive },
            { name: '[' + TokenNameSix + ']', value: TokenValueSix },
            { name: '[' + TokenNameSeven + ']', value: TokenValueSeven },
            { name: '[' + TokenNameEight + ']', value: TokenValueEight },
            { name: '[' + TokenNameNine + ']', value: TokenValueNine },
            { name: '[' + TokenNameTen + ']', value: TokenValueTen },
        ];
        let emailRequestArr = [
            { name: 'Email Name', value: emailTemplateName },
            { name: 'Tokens', value: tokenArr },
            { name: 'Email Address', value: emailAddressList },
            { name: 'Email AddressCC', value: emailAddressListCC },
            { name: 'SendDateTime', value: new Date().toISOString() },
            {
                name: 'RELATETORECORD',
                value: RegionID.length > 2 ? [RegionID] : [],
            },
            //{ name: 'RELATETORECORD', value: [relateRecordOne, relateRecordTwo] },
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: {
                    'Primary Record ID': RegionID,
                    'Sent/Recorded By': userID,
                    'Other Record': OtherRecordID,
                },
            },
        ];

        let emailCommLogResp = await vvClient.scripts.runWebService('LibGenerateCommLogEmailSendNow', emailRequestArr);
        let emailCommLogData = emailCommLogResp.hasOwnProperty('data') ? emailCommLogResp.data : null;

        if (emailCommLogResp.meta.status !== 200) {
            throw new Error(`There was an error when calling LibGenerateCommLogEmailSendNow.`);
        }
        if (!emailCommLogData || !Array.isArray(emailCommLogData)) {
            throw new Error(`Data was not returned when calling LibGenerateCommLogEmailSendNow.`);
        }
        if (emailCommLogData[0] === 'Error') {
            throw new Error(
                `The call to LibGenerateCommLogEmailSendNow returned with an error. ${emailCommLogData[1]}.`
            );
        }
        if (emailCommLogData[0] !== 'Success') {
            throw new Error(`The call to LibGenerateCommLogEmailSendNow returned with an unhandled error.`);
        }

        outputCollection[0] = 'Success';
        outputCollection[1] = 'Communication Log Generated';
        outputCollection[2] = null;
    } catch (error) {
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message}`;
        outputCollection[2] = null;
    } finally {
        response.json(200, outputCollection);
    }
};
