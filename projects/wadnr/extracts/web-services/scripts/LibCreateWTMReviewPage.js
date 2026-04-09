/**
 * LibCreateWTMReviewPage
 * Category: Workflow
 * Modified: 2025-11-19T21:15:33.337Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: ff6be65d-a38d-f011-82f4-eead855597dc
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
    Script Name:    LibCreateWTMReviewPage
    Customer:       WADNR
    Purpose:        The purpose of this library is to create a WTM Review Page after a Water Type Modification
                    Form (WTMF) has been submitted. The library also updates the review page with relevant data
                    from the source WTMF
    Preconditions:

    Parameters:
                    The following represent variables passed into the function:
                    Form ID: Form ID of the application
                    Region: Region of the application
                    Project Name: Project Name of the application (Optional)
                    Form Type: Form Type of the application
                    Update Client Side: Flag to update client side
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1° Create the WTM Review Page
                    2° Relate the WTMF to the created WTM Review Page using the Record/Form ID
                    3° Generate the Received Date and WTM Number by calling GetWTMNumberAndDateOfReceipt
                    4° Retrieve data to populate the review page by calling LibGetWTMReviewPageRelatedData
                    5° Update application review page with the data from the libraries
                    6° If flag == No flagged update original application
                    7° Return the following: WTM Number, Form ID of the WTM Review Page, GUID of the WTM Review Page, Received Dat

    Date of Dev:    09/09/2025
    Last Rev Date:  09/09/2025

    Revision Notes:
                    09/09/2025 - Alfredo Scilabra:   First Setup of the script.
                    11/19/2025 - Sebastian Rolando: Add mapping for the Status value of the WTM Review Page
    */

    logger.info(`Start of the process LibCreateWTMReviewPage at ${Date()}`);

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

    function getRecordGUID(formTemplateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`, // recordID = "INDV-000001"
            fields: 'revisionId',
        };

        return vvClient.forms
            .getForms(getParentFormParams, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0].revisionId);
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

    async function runWebService(webServiceName, webServiceParams) {
        const shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[2]);
    }

    function createWTMReview(projectName, region, formId) {
        const shortDescription = `Post form WTM Review Page`;
        const newRecordData = {
            //'Project Name': projectName, //TODO: this field does not exist yet
            Region: region,
            'Related Record ID': formId,
            'WTMF Status': 'Received',
            Status: 'Received',
        };

        return vvClient.forms
            .postForms(null, newRecordData, 'WTM Review Page')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function updateForm(wTMFormGuid, formTemplateName, updateObj) {
        const shortDescription = `Update form record ${wTMFormGuid}`;

        return vvClient.forms
            .postFormRevision(null, updateObj, formTemplateName, wTMFormGuid)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const formId = getFieldValueByName('Form ID');
        const region = getFieldValueByName('Region');
        const projectName = getFieldValueByName('Project Name', true) || '';
        const formType = getFieldValueByName('Form Type');
        const updateClientSide = getFieldValueByName('Update Client Side') || 'Yes';

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if (!formId || !region || !formType) {
            throw new Error(errorLog.join('; '));
        }

        const wTMReviewData = await createWTMReview(projectName, region, formId);

        const wTMFormGuid = await getRecordGUID('Water Type Modification Form', formId);
        await relateRecords(wTMFormGuid, wTMReviewData['instanceName']);

        const wtmNumberAndDateOfReceiptParams = [
            {
                name: 'Form ID',
                value: formId,
            },
            {
                name: 'Region Code',
                value: region,
            },
            {
                name: 'WTM Review Page Form ID',
                value: wTMReviewData['instanceName'],
            },
        ];

        const WTM_NumberAndReceivedDate = await runWebService(
            'GetWTMNumberAndDateOfReceipt',
            wtmNumberAndDateOfReceiptParams
        );

        await updateForm(wTMReviewData['revisionId'], 'WTM Review Page', {
            'WTMF No': WTM_NumberAndReceivedDate['WTM_Number'],
            'Date of Receipt': WTM_NumberAndReceivedDate['DateOfReceipt'],
        });

        //TODO: un-comment this part when LibGetWTMReviewPageRelatedData is ready
        // const applicationReviewPageRelatedDataParams = [
        //   {
        //     name: 'WTM Number',
        //     value: WTM_NumberAndReceivedDate['FPAN_Number'],
        //   },
        //   {
        //     name: 'Form ID',
        //     value: formId,
        //   },
        // ];

        // const applicationReviewRelatedData = await runWebService(
        //   'LibGetWTMReviewPageRelatedData',
        //   applicationReviewPageRelatedDataParams
        // );

        if (updateClientSide === 'No') {
            await updateForm(wTMFormGuid, 'Water Type Modification Form', {
                'WTMF Number': WTM_NumberAndReceivedDate['WTM_Number'],
                'Date of Receipt': WTM_NumberAndReceivedDate['DateOfReceipt'],
                Status: 'Received',
            });
        }

        const returnObj = {
            'WTM Number': WTM_NumberAndReceivedDate['WTM_Number'],
            'Received Date': WTM_NumberAndReceivedDate['DateOfReceipt'],
            'WTM Review Page ID': wTMReviewData.instanceName,
            'WTM Review Page GUID': wTMReviewData.revisionId,
        };

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Successfully Created WTM Review Page';
        outputCollection[2] = returnObj;
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
