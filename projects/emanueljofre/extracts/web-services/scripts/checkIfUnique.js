/**
 * checkIfUnique
 * Category: Form
 * Modified: 2021-07-02T17:04:14.04Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: b29c8a3a-a3da-eb11-8204-e3982f57380d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
let logger = require('../log');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "EmanuelJofre";
    options.databaseAlias = "Main";
    options.userId = "emanuel.jofre+api@onetree.com";
    options.password = "achq1Ozpg3xD";
    options.clientId = "4150133e-ddef-4d8e-af91-1e7c39f16a25";
    options.clientSecret = "RKxMRhdeJPdt+3A3B/kNT19rbTawYpPLx84LSpzrHZ0=";
    return options;
  };

module.exports.main = async function (ffCollection, vvClient, response) {
  /*Script Name:  EmployeeAssignmentVerify
   Customer:      Florida Department of Health, Early Steps
   Purpose:       The purpose of this process is to verify if the form record is unique.
   Parameters:    Agency ID - (String, Required) Used in the query to verify if the record is unique or unique matched.
                  Email - (String, Required) Used in the query to verify if the record is unique or unique matched.
                  End Date - (String, Required) Used in the query to verify if the record is unique or unique matched.
                  Record ID - (String, Required) Used in the query to verify if the record is unique or unique matched and LibUserUpdate.
                  Start Date - (String, Required) Used in the query to verify if the record is unique or unique matched.
                  Status - (String, Required) Used in the query to verify if the record is unique or unique matched.
              
   Return Array:  1. Status: 'Success', 'Error'
                  2. Message
                  3. Status of the verify call
                  
   Pseudo code:   1. Call VerifyUniqueRecord to determine whether the template record is unique per the passed in information.
                  2. Send response with return array.
 
   Date of Dev:   4/7/2020
   Last Rev Date: 4/7/2020
   Revision Notes:
   4/7/2020  - Rocky Borg: Script created
   */

  logger.info('Start of the process EmployeeAssignmentVerify at ' + Date())

  /**********************
   Configurable Variables
  ***********************/
  // Error message guidances
  let missingFieldGuidance = 'Please provide a value for the missing field and try again, or contact a system administrator if this problem continues.'

  // Response array populated in try or catch block, used in response sent in finally block.
  let outputCollection = []

  // Array for capturing error messages that may occur within helper functions.
  let errorLog = []

  /****************
   Helper Functions
  *****************/
  // Check if field object has a value property and that value is truthy before returning value.
  function getFieldValueByName(fieldName, isOptional) {
      try {
          let fieldObj = ffCollection.getFormFieldByName(fieldName)
          let fieldValue = fieldObj && fieldObj.hasOwnProperty('value') ? fieldObj.value : null

          if (fieldValue === null) {
          throw new Error(`A value property for ${fieldName} was not found.`)
          }

          if (!isOptional && !fieldValue) {
          throw new Error(`A value for ${fieldName} was not provided.`)
          }

          return fieldValue
      } catch (error) {
          errorLog.push(error)
      }
  }


  try {
    /*********************
     Form Record Variables
    **********************/
    //Create variables for the values on the form record
    const nameToVerify = getFieldValueByName('Name')
    
    // Specific fields are detailed in the errorLog sent in the response to the client.
    if (errorLog.length > 0) {
      throw new Error(`${missingFieldGuidance}`)
    }


    /****************
     BEGIN ASYNC CODE
    *****************/
    // STEP 1 - Call VerifyUniqueRecord 

    let uniqueRecordArr = [
      {
        name: 'templateId',
        value:  "postForm"
      },
      {
        name: 'query',
        value: "TestName eq '"+ nameToVerify + "'"
      },
      {
        name: 'formId',
        value: "postForm-000002" 
      }
    ];

    let verifyUniqueResp = await vvClient.scripts.runWebService('LibFormVerifyUniqueRecord', uniqueRecordArr)
    let verifyUniqueData = verifyUniqueResp.hasOwnProperty('data') ? verifyUniqueResp.data : null;
    let verifyUniqueStatus = verifyUniqueData.hasOwnProperty('status') ? verifyUniqueData.status : null;

    if (verifyUniqueResp.meta.status !== 200) {
      throw new Error(`There was an error when calling LibFormVerifyUniqueRecord.`)
    }

    if (verifyUniqueData === null) {
      throw new Error(`Data was not be returned when calling LibFormVerifyUniqueRecord.`)
    }

    if (verifyUniqueStatus === null) {
      throw new Error(`A status was not be returned when calling LibFormVerifyUniqueRecord.`)
    }

    if (verifyUniqueStatus === 'Error') {
      throw new Error(`The call to LibFormVerifyUniqueRecord returned with an error. ${verifyUniqueData.statusMessage}.`)
    }

    if (verifyUniqueStatus === 'Not Unique') {
      throw new Error('This Employee Assignment record is a duplicate of another Record. Another Employee Assignment record already exists with the same Form ID, Email, Status, and an overlapping Start and End Date.')
    }
    
    if (verifyUniqueStatus !== 'Unique' && verifyUniqueStatus !== 'Unique Matched') {
      throw new Error(`The call to LibFormVerifyUniqueRecord returned with an unhandled error.`)
    }

    // STEP 2 - Send response with return array.
    outputCollection[0] = 'Success'
    outputCollection[1] = 'Unique'

  } catch (error) {
    // Log errors captured.
    logger.info(JSON.stringify(`${error, errorLog}`))
    outputCollection[0] = 'Error'
    outputCollection[1] = `${errorLog.join(' ')} ${error.message}`
  } finally {
    response.json(200, outputCollection)
  }
}
