/**
 * LibCreateNotificationCommunication
 * Category: Workflow
 * Modified: 2025-03-13T19:03:01.903Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: e697d2a6-0f00-f011-82c6-9d10692b7556
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
        Script Name:    LibCreateNotificationCommunication
        Customer:       WA-DNR
        Purpose:        Create Notification Communication records
        Preconditions:
                        - N/A
        Parameters:     The following represent variables passed into the function:
                        - Related Record ID (String, Required): The unique identifier of the Application Review Page record associated with the notification.
                        - Section Data (JSON Object, Required): A JSON object containing the selected section and relevant fields for that section.
                            This param must include "Notification Section" and "Fields" keys only. "Field Name" keys are optional, but at least one of them must be included

                        Sample JSON:
                        {
                            "Notification Section": "Habitat: WDFW",
                            "Fields": {
                                "WDFW Biologist": "test",
                                "WDFW Conflict Inquiry Sent": "01/05/2025",
                                "WDFW Response Received": "01/05/2025",
                                "WDFW Comments": "test"
                            }
                        }

        Return Object:
                        outputCollection[0]: Status
                        outputCollection[1]: Short description message
                        outputCollection[2]: Data
        Pseudo code: 
                        1° Get the values of the fields
                        2° Check if the required parameters are present
                        3° Create the Communication Notification record
    
        Date of Dev:    03/13/2025
        Last Rev Date:  03/13/2025
    
        Revision Notes:
                        03/13/2025 - Mauro Rapuano: First Setup of the script
      */

    logger.info(`Start of the process LibCreateNotificationCommunication at ${Date()}`);

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

    const notificationCommunicationFormTemplate = 'Notification Communication';

    const notificationSections = [
        {
            name: 'Habitat: WDFW',
            fields: {
                'WDFW Biologist': {
                    required: false,
                    type: 'string',
                },
                'WDFW Conflict Inquiry Sent': {
                    required: false,
                    type: 'date',
                },
                'WDFW Response Received': {
                    required: false,
                    type: 'date',
                },
                'WDFW Comments': {
                    required: false,
                    type: 'string',
                },
            },
        },
        {
            name: 'Habitat: WNHP',
            fields: {
                'WNHP Conflict Inquiry Sent': {
                    required: false,
                    type: 'date',
                },
                'WNHP Response Received': {
                    required: false,
                    type: 'date',
                },
                'WNHP Comments': {
                    required: false,
                    type: 'string',
                },
            },
        },
        {
            name: 'Habitat: USFWS',
            fields: {
                'USFWS Conflict Inquiry Sent': {
                    required: false,
                    type: 'date',
                },
                'USFWS Response Received': {
                    required: false,
                    type: 'date',
                },
                'USFWS Comments': {
                    required: false,
                    type: 'string',
                },
            },
        },
        {
            name: 'Science Team',
            fields: {
                'LEG Name': {
                    required: false,
                    type: 'string',
                },
                'LEG Notification Sent': {
                    required: false,
                    type: 'date',
                },
                'LEG Report Received': {
                    required: false,
                    type: 'string',
                },
            },
        },
        {
            name: 'Cultural Resources: DAHP',
            fields: {
                'DAHP Conflict Inquiry Sent': {
                    required: false,
                    type: 'date',
                },
                'DAHP Response Received': {
                    required: false,
                    type: 'date',
                },
                'DAHP Comments': {
                    required: false,
                    type: 'string',
                },
            },
        },
        {
            name: 'Cultural Resources: Tribal',
            fields: {
                'Tribal Notification Sent To': {
                    required: false,
                    type: 'string',
                },
                'Date Tribal Notification Sent': {
                    required: false,
                    type: 'date',
                },
                'Tribal Meeting Request Received': {
                    required: false,
                    type: 'date',
                },
                'Tribal Meeting Occurred': {
                    required: false,
                    type: 'date',
                },
                'Tribal Notification Comments': {
                    required: false,
                    type: 'string',
                },
            },
        },
    ];

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

    function createNotificationCommunicationRecord(notificationCommunicationFormTemplate, newRecordData) {
        const shortDescription = `Post form ${notificationCommunicationFormTemplate}`;

        return vvClient.forms
            .postForms(null, newRecordData, notificationCommunicationFormTemplate)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function validateSectionData(sectionData) {
        /*
        Checks if the indicated Notification Section exists, if at least one field was filled and if they are correctly related to the Section
        Parameters:
            sectionData: Parsed Section Data param from the Lib
        */
        if (
            Object.keys(sectionData).some((key) => key != 'Notification Section' && key != 'Fields') ||
            Object.keys(sectionData).length != 2
        ) {
            throw new Error(
                `Section Data must be filled with 'Notification Section' and 'Fields' params. Please, review the parameters.`
            );
        }
        if (!notificationSections.some((section) => section.name === sectionData['Notification Section'])) {
            throw new Error(
                `Notification Section '${sectionData['Notification Section']}' not found. Please, review the parameters.`
            );
        }

        const section = notificationSections.filter((section) => section.name === sectionData['Notification Section']);
        const fieldsToCheck = Object.keys(sectionData['Fields']);

        if (fieldsToCheck.length < 1) {
            throw new Error(
                `At least one field should be completed for '${sectionData['Notification Section']}' section.`
            );
        }

        const fieldNames = Object.keys(section[0].fields);

        if (section.length > 0) {
            fieldsToCheck.forEach((field) => {
                if (!fieldNames.includes(field)) {
                    throw new Error(`Field '${field}' does not belong to '${sectionData['Notification Section']}'`);
                }
            });
        } else {
            throw new Error(`Error while getting Notification Section '${sectionData['Notification Section']}'`);
        }
    }

    function validateFieldsType(fields) {
        /*
            Validates if a parameter is correctly formatted depending on notificationSections object
            Param: fields - Object key-value, Parsed fields (name-value pair)
         */
        Object.entries(fields).forEach(([field, value]) => {
            const fieldDetails = getFieldDetails(field);

            if (fieldDetails && fieldDetails['type'] === 'date') {
                if (!isValidDate(value, fieldDetails['required'])) {
                    throw new Error(`Field '${field}' has an invalid date format.`);
                }
            }
        });
    }

    function getFieldDetails(fieldName) {
        /*
            Returns details for a specified field name (Required, Type)
            Param: fieldName - String, Name of the field to search for
        */
        for (const section of notificationSections) {
            if (section.fields[fieldName]) {
                return section.fields[fieldName];
            }
        }
        return null;
    }

    function isValidDate(field, required) {
        /*
            Validates if a string is a valid date. In case it is not required, empty field is allowed
            Param:  field - String, Value to evaluate
                    required- Boolean
        */
        if (field === '' && !required) {
            return true;
        }

        const parsedDate = new Date(field);
        if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
            return true;
        }

        return false;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const relatedRecordID = getFieldValueByName('Related Record ID');
        const sectionData = getFieldValueByName('Section Data');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!relatedRecordID || !sectionData) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        //Validate JSON object, param names and keys allowed
        const sectionDataObj = JSON.parse(sectionData);
        validateSectionData(sectionDataObj);

        //Validate Fields passed as param, if they are required and which type they are
        const fields = sectionDataObj.Fields;
        validateFieldsType(fields);

        // 3° Create Notification Communication
        let newNotificationCommunication = {
            'Related Record ID': relatedRecordID,
            ...sectionDataObj,
            ...sectionDataObj.Fields,
            Status: 'Enabled',
        };

        delete newNotificationCommunication.Fields;

        const newNotificationCommunicationRecord = await createNotificationCommunicationRecord(
            notificationCommunicationFormTemplate,
            newNotificationCommunication
        );

        // 4° BUILD THE SUCCESS RESPONSE ARRAY
        const responseObj = {
            notificationId: newNotificationCommunicationRecord['instanceName'],
            relatedRecordId: relatedRecordID,
            notificationSection: newNotificationCommunication['Notification Section'],
        };

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'The Notification Communication record was created successfully.';
        outputCollection[2] = responseObj;
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
