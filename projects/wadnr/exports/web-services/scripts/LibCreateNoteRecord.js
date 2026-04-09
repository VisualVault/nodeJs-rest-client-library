/**
 * LibCreateNoteRecord
 * Category: Workflow
 * Modified: 2025-03-14T14:30:09.24Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 8ed6880e-85fb-ef11-82c4-953deda8420a
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
      Script Name:    LibCreateNoteRecord
      Customer:       WA-DNR
      Purpose:        Create Note records in the system
      Preconditions:
                      - N/A
      Parameters:     The following represent variables passed into the function:
                       noteObject: 
                          - Related Record ID
                          - NoteType
                          - NoteText
                          - User ID
                          
                      Example:
                          {
                            relatedRecordID: "123",
                            noteType: "Complaint",
                            noteText: "Individual Complaint",
                            userID: "patricio.bonetto@visualvault.com"
                          }
      Return Object:
                      outputCollection[0]: Status
                      outputCollection[1]: Short description message
                      outputCollection[2]: Data
      Pseudo code: 
                      1° Get the values of the fields
                      2° Check if the required parameters are present
                      3° Create the note record
   
      Date of Dev:    03/07/2025
      Last Rev Date:  03/07/2025
   
      Revision Notes:
                      03/07/2025 - Patricio Bonetto: WADNR-3675 - First Setup of the script
      */

    logger.info(`Start of the process LibCreateNoteRecord at ${Date()}`);

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

    const noteRecordFormTemplate = 'Note';
    const siteName = 'Home';

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

    function createNoteRecord(noteRecordFormTemplate, newRecordData) {
        const shortDescription = `Post form ${noteRecordFormTemplate}`;

        return vvClient.forms
            .postForms(null, newRecordData, noteRecordFormTemplate)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getSiteGUID(siteName) {
        const shortDescription = `Get site ${siteName}`;
        const site = {
            q: `name eq '${siteName}'`,
            fields: 'id',
        };

        return vvClient.sites
            .getSites(site)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0].id);
    }

    function getUserData(userID, siteGUID) {
        const shortDescription = `Get user ${userID}`;
        const usersParams = {
            q: `[userid] eq '${userID}'`, // comment this line to get all users
            // fields: 'id,name,userid,siteid,firstname,lastname,emailaddress',
            // uncomment the line above and comment the line below to get only some specific data from the user
            expand: 'true',
        };

        return vvClient.users
            .getUsers(usersParams, siteGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));
        // .then((res) => checkDataIsNotEmpty(res, shortDescription));
        //  If you want to throw an error and stop the process if no data is returned, uncomment the line above
    }

    function getNowFormattedDate() {
        const now = new Date();

        // Get individual components of the date
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
        const day = String(now.getDate()).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        // Create the formatted string
        const formattedDate = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;

        return formattedDate;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const relatedRecordID = getFieldValueByName('Related Record ID');
        const noteType = getFieldValueByName('Note Type');
        const noteText = getFieldValueByName('Note Text');
        const userID = getFieldValueByName('User ID');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if (!relatedRecordID || !userID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° Get User's data
        const siteGUID = await getSiteGUID(siteName);
        const userData = await getUserData(userID, siteGUID);

        const userFullName = userData.data[0].lastName + ', ' + userData.data[0].firstName;

        //4° Get this moment's date and time
        const formattedDate = getNowFormattedDate();

        // 5° Create Note Record
        const newNote = {
            'Related Record ID': relatedRecordID,
            'Note Type': noteType,
            'Note Text': noteText,
            'Created By': userFullName,
            'Modified By': userFullName,
            Status: 'Enabled',
            'Date Time': formattedDate,
        };

        const newNoteRecord = await createNoteRecord(noteRecordFormTemplate, newNote);

        // 6 create new object to return
        const newRecordObject = {
            ...newNote,
            noteRecordID: newNoteRecord.instanceName,
        };

        // 7° BUILD THE SUCCESS RESPONSE ARRAY

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'The Note record was created successfully.';
        outputCollection[2] = newRecordObject;
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
