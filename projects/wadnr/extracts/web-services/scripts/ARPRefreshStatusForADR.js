/**
 * ARPRefreshStatusForADR
 * Category: Form
 * Modified: 2026-02-20T13:11:10.48Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 67858305-beec-f011-830e-a9f5c566a94f
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
    Script Name:    ARPRefreshStatusForADR 
    Customer:       WADNR
    Purpose:        Update Document Status field for Associated Document Relation records related to the ARP, based on the main application Status
    Preconditions:  -
    Parameters:     The following represent variables passed into the function:
                    Form Id: String - Form ID of the ARP
                    Related Record ID: String - Form ID of the main application
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1° Get the values of the fields
                    2° Check if the required parameters are present
                    3° Get Status form the Main Application (Related Record ID)
                    4° Calculate the Status for the Subforms
                    5° Get Associated Document Relation records related to the ARP
                    6° Update Status for Associated Document Relation records related to the ARP
                    7° Build the success response array
 
    Date of Dev:    01/08/2026
    Last Rev Date:  02/20/2026
 
    Revision Notes:
                    01/08/2026 - Sebastian Rolando:  First Setup of the script
                    02/20/2026 - Mauro Rapuano: Commented out main applications to avoid updating its ADR records
    */

    logger.info(`Start of the process ARPRefreshStatusForADR at ${Date()}`);

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

    const ADRTemplateName = 'Associated Document Relation';

    const VALID_SUBFORM_TYPES_BY_MAIN_APP_TYPE = [
        //'Forest Practices Application Notification',
        'Legal Description',
        'Appendix D Slope Stability Informational',
        'Appendix J Forest Practices Marbled Murrelet',
        'Appendix A Water Type Classification',
        'Appendix H Eastern Washington Natural Regeneration Plan',
        'Typed Water',
        'Forest Roads',
        'Rockpit',
        'Spoils',
        'Wetlands',
        'Timber',
        'Forest Tax Number',
        'S or F Waters',
        'NP Waters',
        //'Forest Practices Aerial Chemical Application',
        'Chemical Information',
        //'Step 1 Long Term FPA',
        'Sensitive Site',
        'Field Representative',
        'Survey',
        'Nesting Platforms',
        'Unit Identifier',
        'Stream Segment',
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

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', 'Step 1 Long Term FPA'],
            ['FPA-AERIAL-CHEMICAL', 'Forest Practices Aerial Chemical Application'],
            ['FPAN', 'Forest Practices Application Notification'],
            ['WTM', 'Water Type Modification Form'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    function getMainAppStatus(mainAppID) {
        const templateName = detectFormTemplateFromID(mainAppID);

        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get form ${mainAppID}`;
        const getFormsParams = {
            q: `[instanceName] eq '${mainAppID}'`,
            // expand: true, // true to get all the form's fields
            fields: 'Status', // to get only the fields 'id' and 'name'
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
            .then((res) => res.data[0]['status']);
    }

    function calculateSubFormStatus(mainAppStatus) {
        return mainAppStatus === 'Draft' || mainAppStatus === 'Pending Revisions' ? 'Draft' : 'Submitted';
    }

    function getAssociatedDocumentRelationRecords(ARPID) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get the related record to ${ARPID}, from template ${ADRTemplateName}`;
        const getFormsParams = {
            q: `[ARP ID or WTM RP ID] eq '${ARPID}' AND [Document or Form] eq 'Form' AND [Status] eq 'Enabled'`,
            // expand: true, // true to get all the form's fields
            fields: 'revisionId, Related Record ID, Document Form Name', // to get only the fields 'id' and 'name'
        };

        return (
            vvClient.forms
                .getForms(getFormsParams, ADRTemplateName)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
                .then((res) => res?.data)
        );
    }

    function updateAssociatedDocumentRelation(record, mainAppID, mainAppStatus, subFormStatus) {
        const shortDescription = `Update form record ${record['related Record ID']}`;
        const fieldValuesToUpdate = {
            'Document Form Status': mainAppID === record['related Record ID'] ? mainAppStatus : subFormStatus,
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, ADRTemplateName, record.revisionId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const ARPID = getFieldValueByName('Form ID');
        const mainAppID = getFieldValueByName('Related Record ID');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if (!ARPID || !mainAppID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° Get Status form the Main Application (Related Record ID)
        const mainAppStatus = await getMainAppStatus(mainAppID);

        // 4° Calculate the Status for the Subforms
        const subFormStatus = calculateSubFormStatus(mainAppStatus);

        // 5° Get Associated Document Relation records related to the ARP
        const associatedDocumentRelationRecordsList = await getAssociatedDocumentRelationRecords(ARPID);

        const filteredAssociatedDocumentRelationRecordsList = associatedDocumentRelationRecordsList.filter((record) =>
            VALID_SUBFORM_TYPES_BY_MAIN_APP_TYPE.includes(record['document Form Name'])
        );

        // 6° Update Status for Associated Document Relation records related to the ARP
        await Promise.all(
            filteredAssociatedDocumentRelationRecordsList.map((record) => {
                updateAssociatedDocumentRelation(record, mainAppID, mainAppStatus, subFormStatus);
            })
        );

        // 6° BUILD THE SUCCESS RESPONSE ARRAY

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Success short description here';
        // outputCollection[2] = someVariableWithData;
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
