/**
 * ForestRoadsVerifyUnique
 * Category: Form
 * Modified: 2025-12-15T14:58:47.963Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: 35bb175b-c1d9-f011-830a-daf327a92d22
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
    Script Name:    ForestRoadsVerifyUnique
    Customer:       WADNR
    Purpose:        Check if a Forest Roads is duplicated by Related Record ID, Parent Context, and required fields
    Preconditions:
                    LibFormVerifyUniqueRecord implemented
    Parameters:     The following represent variables passed into the function:
                    Related Record ID: String - ID of the parent record
                    Form ID: String - ID of the form
                    Parent Context: String - Context of the parent ('LTFPAQ9', 'FPACAQ2')
                    Road Identifier: String - Identifier for the road
                    Road Construction Length: Number - Length of road construction
                    Steepest Side Slope: Number - Steepest slope on the side
                    Road Abandonment Length: Number - Length of road abandonment
                    Abandonment Date: Date - Date of abandonment
                    Date Assessed: Date - Date the road was assessed
                    Road Assessed: Boolean - Whether the road was assessed
                    Comments: String - Additional comments
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Checks all data was received correctly
                    2° Calls "LibFormVerifyUniqueRecord" to check if a record already exists with that Related Record ID and required fields
                    3° Returns if the record is unique or not

    Date of Dev:    12/15/2025
    Last Rev Date:  12/15/2025
 
    Revision Notes:
                    12/15/2025 - Federico Cuelho: First Setup of the script
    */

    logger.info(`Start of the process ForestRoadsVerifyUnique at ${Date()}`);

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

    // Define constants for field names and other strings
    const FIELD_NAMES = {
        RELATED_RECORD_ID: 'Related Record ID',
        FORM_ID: 'Form ID',
        PARENT_CONTEXT: 'Parent Context',
        ROAD_IDENTIFIER: 'Road Identifier',
        ROAD_CONSTRUCTION_LENGTH: 'Road Construction Length',
        STEEPEST_SIDE_SLOPE: 'Steepest Side Slope',
        ROAD_ABANDONMENT_LENGTH: 'Road Abandonment Length',
        ABANDONMENT_DATE: 'Abandonment Date',
        DATE_ASSESSED: 'Date Assessed',
        ROAD_ASSESSED: 'Road Assessed',
        COMMENTS: 'Comments',
    };

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */

    // Description used to better identify API methods errors
    let shortDescription = '';

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
                    if (!isOptional) {
                        throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                    } else {
                        return null; // Return null for optional fields with no value
                    }
                }

                return fieldValue;
            }
        } catch (error) {
            if (!isOptional) {
                errorLog.push(error.message); // Log errors only for required fields
            }
            return null; // Return null for optional fields even if an error occurs
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

    function validateFieldsBasedOnContext(parentContext, getFieldValueByName) {
        let roadIdentifier = null;
        let dateAssessed = null;
        let roadAssessed = null;

        if (parentContext === 'Default') {
            roadIdentifier = getFieldValueByName(FIELD_NAMES.ROAD_IDENTIFIER);
            if (!roadIdentifier) {
                errorLog.push('Road Identifier is required when Parent Context is Default.');
            }
        } else if (parentContext === 'LTFPAQ9') {
            roadIdentifier = getFieldValueByName(FIELD_NAMES.ROAD_IDENTIFIER, true);
            if (!roadIdentifier) {
                dateAssessed = getFieldValueByName(FIELD_NAMES.DATE_ASSESSED, true);
                roadAssessed = getFieldValueByName(FIELD_NAMES.ROAD_ASSESSED, true);
            } else {
                dateAssessed = getFieldValueByName(FIELD_NAMES.DATE_ASSESSED);
                roadAssessed = getFieldValueByName(FIELD_NAMES.ROAD_ASSESSED);
                if (!dateAssessed || !roadAssessed) {
                    errorLog.push(
                        'Date Assessed and Road Assessed are required when Road Identifier is provided and Parent Context is LTFPAQ9.'
                    );
                }
            }
        }

        return { roadIdentifier, dateAssessed, roadAssessed };
    }

    async function verifyUniqueRecord(
        relatedRecordID,
        formId,
        parentContext,
        roadIdentifier,
        roadConstructionLength,
        steepestSideSlope,
        roadAbandonmentLength,
        abandonmentDate,
        dateAssessed,
        roadAssessed,
        comments
    ) {
        let uniqueRecordArr = '';

        // Build the query dynamically based on provided values
        const queryParts = [];

        if (relatedRecordID) queryParts.push(`[Related Record ID] eq '${relatedRecordID}'`);
        if (parentContext) queryParts.push(`[Parent Context] eq '${parentContext}'`);
        if (roadIdentifier) queryParts.push(`[Road Identifier] eq '${roadIdentifier}'`);
        if (roadConstructionLength) queryParts.push(`[Road Construction Length] eq '${roadConstructionLength}'`);
        if (steepestSideSlope) queryParts.push(`[Steepest Side Slope] eq '${steepestSideSlope}'`);
        if (roadAbandonmentLength) queryParts.push(`[Road Abandonment Length] eq '${roadAbandonmentLength}'`);
        if (abandonmentDate) queryParts.push(`[Abandonment Date] eq '${abandonmentDate}'`);
        if (dateAssessed) queryParts.push(`[Date Assessed] eq '${dateAssessed}'`);
        if (roadAssessed) queryParts.push(`[Road Assessed] eq '${roadAssessed}'`);
        if (comments) queryParts.push(`[Comments] eq '${comments}'`);

        const query = queryParts.join(' and ');

        uniqueRecordArr = [
            {
                name: 'templateId',
                value: 'Forest Roads',
            },
            {
                name: 'query',
                value: query,
            },
            {
                name: 'formId',
                value: formId,
            },
        ];

        shortDescription = `Executing LibFormVerifyUniqueRecord for '${relatedRecordID}'`;
        try {
            const res = await vvClient.scripts.runWebService('LibFormVerifyUniqueRecord', uniqueRecordArr);
            const parsedRes = parseRes(res);
            checkMetaAndStatus(parsedRes, shortDescription);
            checkDataPropertyExists(parsedRes, shortDescription);
            checkDataIsNotEmpty(parsedRes, shortDescription);
            return parsedRes;
        } catch (error) {
            throw new Error(`Error in verifyUniqueRecord: ${error.message}`);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // GET THE VALUES OF THE FIELDS
        // Required fields
        const relatedRecordID = getFieldValueByName(FIELD_NAMES.RELATED_RECORD_ID);
        const formId = getFieldValueByName(FIELD_NAMES.FORM_ID);
        const parentContext = getFieldValueByName(FIELD_NAMES.PARENT_CONTEXT);

        // CHECKS IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!relatedRecordID || !formId || !parentContext) {
            // Throw an error directly based on the conditions
            throw new Error(`Missing required fields: ${errorLog.join('; ')}`);
        }

        // 1° Get and validate fields based on Parent Context
        const roadConstructionLength = getFieldValueByName(FIELD_NAMES.ROAD_CONSTRUCTION_LENGTH, true);
        const steepestSideSlope = getFieldValueByName(FIELD_NAMES.STEEPEST_SIDE_SLOPE, true);
        const roadAbandonmentLength = getFieldValueByName(FIELD_NAMES.ROAD_ABANDONMENT_LENGTH, true);
        const abandonmentDate = getFieldValueByName(FIELD_NAMES.ABANDONMENT_DATE, true);
        const comments = getFieldValueByName(FIELD_NAMES.COMMENTS, true);
        const { roadIdentifier, dateAssessed, roadAssessed } = validateFieldsBasedOnContext(
            parentContext,
            getFieldValueByName
        );

        // 2° CALLS THE FUNCTION TO VERIFY IF THE RECORD IS UNIQUE
        const verifyUniqueRes = await verifyUniqueRecord(
            relatedRecordID,
            formId,
            parentContext,
            roadIdentifier,
            roadConstructionLength,
            steepestSideSlope,
            roadAbandonmentLength,
            abandonmentDate,
            dateAssessed,
            roadAssessed,
            comments
        );
        let unique = verifyUniqueRes.data['status'];

        // 3° PROCESS THE RESPONSE TO RETURN IF THE RECORD IS UNIQUE OR NOT
        if (!unique || unique.toLowerCase() === 'error') {
            throw new Error('Error while verifying unique record.');
        } else if (unique.toLowerCase() === 'not unique') {
            errorLog.push(
                'Not Unique - A duplicate Legal Description was found. Please review the form information and make any necessary changes.'
            );
            throw new Error();
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = `Legal Description is ${unique}`;
        outputCollection[2] = verifyUniqueRes;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this
        outputCollection[1] =
            errorLog.length > 0 ? 'Some errors occurred' : error.message || `Unhandled error occurred: ${error}`;
        outputCollection[2] = errorLog.length > 0 ? `Error/s: ${errorLog.join('; ')}` : null;
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
