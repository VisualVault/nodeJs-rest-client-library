/**
 * LibOwnerUpdate
 * Category: Workflow
 * Modified: 2026-03-20T19:35:17.437Z by john.sevilla@visualvault.com
 * Script ID: Script Id: dd796b74-ae1a-f011-82d5-cb8a21848379
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
    /*
      Script Name:    LibOwnerUpdate
      Customer:       WADNR
      Purpose:        Updates ownership across application forms tied to a specific
                      FPAN Number. It is triggered by an FPA/N Record Change Request and updates the Individual
                      ID on all matching application forms. For each updated form, a corresponding FPA/N Record
                      Owner is created to log the ownership transfer.

      Preconditions:

      Parameters:     The following represent variables passed into the function:
                      Individual ID (String, Required): The new owner's Individual ID.
                      FPAN Number (String, Required): The FPAN Number used to locate related application forms.
                      Form ID (String, Required): The Form ID of the FPA/N Record Change Request initiating the process.
      Return Object:
                      outputCollection[0]: Status
                      outputCollection[1]: Short description message
                      outputCollection[2]: Data
      Pseudo code:
                      1 Get the values of the fields
                      2 Check if the required parameters are present
                      3 Identifies and retrieves all supported application forms where the FPAN Number
                        matches the provided value.
                      4 Replaces the Individual ID with the new value (newOwnerIndividualID) and save each form
                      5 Create a corresponding FPA/N Record Owner form for each updated application
                      6 Change folder permissions to set new proponent as Viewer and remove the old one
                      7 Build the success response array

      Date of Dev:    04/16/2025

      Revision Notes:
                      04/16/2025 - Alfredo Scilabra:  First Setup of the script
                      04/22/2025 - Mauro Rapuano:  Changed name 'Form ID Field' to 'Form ID' on getNewDataFromUpdatedRecords to complete field on 'FPAN Record Owner' form
                                                    and 'Effective Date' instead of 'Date of Transfer'
                      09/11/2025 - Mauro Rapuano:  Change folder permissions to set new proponent as Viewer and remove the old one
                      09/18/2025 - Nicolas Culini: Added change of originator
                      02/04/2026 - Mauro Rapuano: Removed error when old user is not found in folder permission update, as Apps created by OS users don't have an Individual ID
                      03/19/2026 - John Sevilla: Update folder path derivation to account for legacy FPA numbers

      */

    logger.info(`Start of the process LibOwnerUpdate at ${Date()}`);
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
    const TARGET_APPLICATIONS_TEMPLATES = [
        'Forest Practices Aerial Chemical Application',
        'Forest Practices Application Notification',
        'Step 1 Long Term FPA',
        'FPAN Renewal',
        'Long-Term Application 5-Day Notice',
        'FPAN Amendment Request',
        'FPAN Notice of Transfer',
    ];

    const libChangeFolderPermissions = 'LibWorkflowChangeFolderPermissions';

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

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;
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
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode) {
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

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    function getFormRecords(getFormsParams, templateName) {
        const shortDescription = `Get form ${templateName}`;
        const overrideGetFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(overrideGetFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateFormRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}, template ${formTemplateName}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function createFormRecord(newRecordData, templateName) {
        const shortDescription = `Post form ${templateName}`;
        return vvClient.forms
            .postForms(null, newRecordData, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getNewDataFromUpdatedRecords(updatedRecords, originalRecords, params) {
        const { targetFpanNumber, newOwnerIndividualID, initFpanFormID } = params;
        const today = dayjs().toISOString();
        return updatedRecords.map((record) => {
            const updatedFormID = record.data.instanceName;
            const originalRecord = originalRecords.find((el) => el.instanceName == updatedFormID);

            return {
                'Effective Date': today,
                'FPAN Number': targetFpanNumber,
                'Form ID': originalRecord.instanceName,
                'New Owner ID': newOwnerIndividualID,
                'Original Owner ID': originalRecord['individual ID'],
                'Related Record ID': initFpanFormID,
            };
        });
    }

    function getFolderPathFromAppNumber(appNumber) {
        appNumber = String(appNumber).trim();

        // Validate the against the fpOnline number formats
        const fpOnlineNumberFormatMatch = appNumber.match(/^[^-]+-[^-]+-(\d{2})-(\d+)/);
        if (fpOnlineNumberFormatMatch) {
            let [, year, sequenceNumber] = fpOnlineNumberFormatMatch;
            year = '20' + year;
            sequenceNumber = parseInt(sequenceNumber, 10);
            const upper = Math.ceil(sequenceNumber / 1000) * 1000;
            const lower = upper - 999;

            return `/FPA/${year}/${lower}-${upper}/${appNumber}`;
        }

        // If unable to match above, validate against the legacy FPA number format
        const legacyFPANumberFormatMatch = appNumber.match(/^\d+$/);
        if (legacyFPANumberFormatMatch) {
            return `/FPA/Legacy/${appNumber}`;
        }

        // If nothing matches, return an empty string
        return '';
    }

    async function getUserIdByIndividualId(individualId) {
        // Get UserID from IndividualID
        const targetParams = {
            q: `[Form ID] eq '${individualId}'`,
            fields: 'revisionId, instanceName, User ID',
        };

        const individualRecord = await getFormRecords(targetParams, 'Individual Record');

        return !isNullEmptyUndefined(individualRecord) ? individualRecord[0]['user ID'] : '';
    }

    async function updateFolderPermissions(newUserId, oldUserId, folderPath) {
        const shortDescription = `Run Web Service: ${libChangeFolderPermissions}`;

        const webServiceParams = [
            // One object for each parameter sent to the next web service
            // You can convert this array to an argument of this function
            {
                name: 'New Entity',
                value: newUserId,
            },
            {
                name: 'New Entity Type',
                value: 'User',
            },
            {
                name: 'Remove Entity',
                value: oldUserId,
            },
            {
                name: 'Remove Entity Type',
                value: 'User',
            },
            {
                name: 'Permission Type',
                value: 'Viewer',
            },
            {
                name: 'Folder Path',
                value: folderPath,
            },
            {
                name: 'Apply to subfolders',
                value: true,
            },
        ];

        return (
            vvClient.scripts
                .runWebService(libChangeFolderPermissions, webServiceParams)
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data)
        );
    }

    function updateFormOriginator(newUserId, formId) {
        const shortDescription = `Setting new originator ${newUserId} for ${formId}`;

        return vvClient.forms.updateFormInstanceOriginator(formId, newUserId);
    }

    function getUserGuid(userID) {
        const shortDescription = `Get user for user ID: ${userID}`;
        const getUserQuery = {
            q: `[userid] eq '${userID}'`, // userID = 'user@id.com'
            expand: 'true',
        };

        return vvClient.users
            .getUser(getUserQuery)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]['id']);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1 Get the values of the fields
        const newOwnerIndividualID = getFieldValueByName('Individual ID');
        const targetFpanNumber = getFieldValueByName('FPAN Number');
        const initFpanFormID = getFieldValueByName('Form ID');

        // 2 Check if the required parameters are present and complete list of holidays
        if (!newOwnerIndividualID || !targetFpanNumber || !initFpanFormID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3 Identifies and retrieves all supported application forms where the FPAN Number matches the provided value.
        const targetParams = {
            q: `[FPAN Number] eq '${targetFpanNumber}'`,
            fields: 'revisionId, instanceName, Individual ID',
        };

        // Getting target records
        const targetFormRecordsArray = await Promise.all(
            TARGET_APPLICATIONS_TEMPLATES.map((templateName) => getFormRecords(targetParams, templateName))
        );

        const targetFormRecordsFlat = targetFormRecordsArray.flat();
        const updatedRecords = [];

        if (!isNullEmptyUndefined(targetFormRecordsFlat)) {
            // Saving found records under corresponding tempalte name for further iteration
            const targetFormRecords = TARGET_APPLICATIONS_TEMPLATES.reduce((acc, templateName, index) => {
                acc[templateName] = targetFormRecordsArray[index];
                return acc;
            }, {});

            // 4 Replaces the Individual ID with the new value (newOwnerIndividualID) and save each form
            const fieldsToUpdate = {
                'Individual ID': newOwnerIndividualID,
            };

            for (const [templateName, targetRecords] of Object.entries(targetFormRecords)) {
                const updateResult = await Promise.all(
                    targetRecords.map((record) => updateFormRecord(templateName, record.revisionId, fieldsToUpdate))
                );
                updatedRecords.push(...updateResult);
            }
            // 5 Create a corresponding FPA/N Record Owner form for each updated application
            const newFPANRecordOwnerRecords = getNewDataFromUpdatedRecords(updatedRecords, targetFormRecordsFlat, {
                targetFpanNumber,
                newOwnerIndividualID,
                initFpanFormID,
            });
            await Promise.all(
                newFPANRecordOwnerRecords.map((newData) => createFormRecord(newData, 'FPAN Record Owner'))
            );
        }

        // 6 Change folder permissions to set new proponent as Viewer and remove the old one
        const folderPath = getFolderPathFromAppNumber(targetFpanNumber);
        if (isNullEmptyUndefined(folderPath)) {
            throw new Error('Error while setting new folder permissions - Path not found');
        }

        const [newUserId, oldUserId] = await Promise.all([
            getUserIdByIndividualId(newOwnerIndividualID),
            getUserIdByIndividualId(targetFormRecordsFlat[0]['individual ID']),
        ]);
        if (isNullEmptyUndefined(newUserId)) {
            throw new Error('Error while setting new folder permissions - User not found');
        }

        await updateFolderPermissions(newUserId, oldUserId, folderPath);
        const newUserGuid = await getUserGuid(newUserId);

        //Getting records again, since we need latest revisionId
        const targetFormRecordsUpdateOriginator = await Promise.all(
            TARGET_APPLICATIONS_TEMPLATES.map((templateName) => getFormRecords(targetParams, templateName))
        );

        await Promise.all(
            targetFormRecordsUpdateOriginator
                .flat()
                .map((record) => updateFormOriginator(newUserGuid, record['revisionId']))
        );

        // 7 Build the success response array
        const message = updatedRecords.length == 0 ? 'No records found' : 'The FPA/N record was successfully assigned.';
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = message;
        outputCollection[2] = { 'Updated records': updatedRecords.length };
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
