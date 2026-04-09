/**
 * LibUpdateWTMReviewPage
 * Category: Workflow
 * Modified: 2025-12-31T00:35:10.84Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: 7a364e6e-a88d-f011-82f4-eead855597dc
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
    /*
  Script Name:    LibUpdateWTMReviewPage
  Customer:       WADNR
  Purpose:        The purpose of this library is to update the WTM Review Page (WTMRP) after a Water Type
                  Modification Form (WTMF) has been submitted. It may also be used at other times to refresh
                  WTMRP data.
  Preconditions:

  Parameters:     The following represent variables passed into the function:
                      Form ID: Form ID of the application
                      Region: Region associated with the application
                      WTM Number: WTM Number
                      Update Client Side: flag that determines whether or not received by date is
                          updated on the application review page (yes, no)
  Return Object:
                  outputCollection[0]: Status
                  outputCollection[1]: Short description message
                  outputCollection[2]: Data
  Pseudo code:
                  1° GET THE VALUES OF THE FIELDS
                  2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
                  3° Get the WTM Review Page (WTMRP) for the WTM Number provided.
                  4° Relate the WTMF application to the existing WTMRP using the Record/Form ID
                  5° Generate the Received Date using business-hours
                  6° Collect information to populate the WTMRP
                  7° Update the WTM Review Page
                  8° If Update Client-Side = No - Update the WTMF with the Received Date and set status = Received
                  9° Return the WTM Number, Form ID of the WTMRP, and GUID of the WTMRP.

  Date of Dev:    09/09/2025
  Last Rev Date:  09/09/2025

  Revision Notes:
                  09/09/2025 - Alfredo Scilabra:  First Setup of the script
                  11/19/2025 - Sebastian Rolando: Add mapping for the Status value of the WTM Review Page
  */

    logger.info(`Start of the process LibUpdateWTMReviewPage at ${Date()}`);

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
        let fieldValue = ''; // Default value

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                // Check if the value property exits
                fieldValue = 'value' in field ? field.value : fieldValue;

                // Trim the value if it's a string to avoid strings with only spaces like "   "
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                // Check if the field is required and if it has a value. Added a condition to avoid 0 to be considered a falsy value
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

                // Check if the field is a dropdown with the default value "Select Item"
                // Some dropdowns have this value as the default one but some others don't
                const ddSelectItem = fieldValue === 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    fieldValue = '';
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }
            }
        } catch (error) {
            errorLog.push(error.message);
        } finally {
            return fieldValue;
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

    function getWtmReviewPage(wtmNumber) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get WTM Review Page of WTMF Number ${wtmNumber}`;
        const getFormsParams = {
            q: `[WTMF No] eq '${wtmNumber}'`,
            expand: true, // true to get all the form's fields
        };

        return vvClient.forms
            .getForms(getFormsParams, 'WTM Review Page')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
            .then((res) => res.data[0]);
    }

    function callExternalWs(webServiceName, webServiceParams) {
        const shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getRecords(formTemplateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`, // recordID = "INDV-000001"
            expand: true,
        };

        return vvClient.forms
            .getForms(getParentFormParams, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function updateRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function relateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    function getFormattedTodayDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
        const dd = String(today.getDate()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}`;
    }

    async function getReceivedDate() {
        const [LibCalculateBusinessDateStatus, , calculateDateResult] = await callExternalWs(
            'LibCalculateBusinessDate',
            [
                {
                    name: 'Start Date',
                    value: getFormattedTodayDate(),
                },
                {
                    name: 'Number of Business Days',
                    value: '0',
                },
            ]
        );

        if (LibCalculateBusinessDateStatus !== 'Success') {
            throw new Error('Error calculating received date.');
        }

        return calculateDateResult.calculatedDate;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const formID = getFieldValueByName('Form ID');
        const region = getFieldValueByName('Region');
        const wtmNumber = getFieldValueByName('WTM Number');
        const status = getFieldValueByName('Status', true);
        const updateClientSide = getFieldValueByName('Update Client Side') || 'Yes';

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!formID || !region || !wtmNumber) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3°
        const wtmReviewPageData = await getWtmReviewPage(wtmNumber);

        // 4°
        const [wTMFormRecord] = await getRecords('Water Type Modification Form', formID);
        if (!wTMFormRecord) {
            throw new Error('Water Type Modification Form record not found');
        }
        const wTMFormGuid = wTMFormRecord.revisionId;
        await relateRecords(wTMFormGuid, wtmReviewPageData.instanceName);

        // 5°
        const receivedDate = await getReceivedDate();

        // 6°
        // TODO: uncomment this when LibGetWTMReviewPageRelatedData is done
        //const wTMData = await getWTMRelatedData(wtmNumber);

        const updateObject = {
            'WTMF Status': status || wTMFormRecord.status,
            Status: status || wTMFormRecord.status,
            'Date of Receipt': receivedDate,
            //TODO: add more update data here when LibGetWTMReviewPageRelatedData is done
        };

        const updateWTMRes = await updateRecord('WTM Review Page', wtmReviewPageData.revisionId, updateObject);

        // 8°
        if (updateClientSide === 'No') {
            const updateWaterTypeModificationRes = await updateRecord('Water Type Modification Form', wTMFormGuid, {
                'Date of Receipt': receivedDate,
                Status: 'Received',
            });
        }

        // 9° SEND SUCCESS RESPONSE
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'WTM Review Page successfully updated';
        outputCollection[2] = {
            'WTM Number': wtmNumber,
            'Received Date': receivedDate,
            'WTM Review Page Form ID': wtmReviewPageData.instanceName,
            'WTM Review Page GUID': wtmReviewPageData.revisionId,
        };
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY

        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE

        response.json(200, outputCollection);
    }
};
