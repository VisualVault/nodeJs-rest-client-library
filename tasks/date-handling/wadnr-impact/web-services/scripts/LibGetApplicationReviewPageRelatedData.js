/**
 * LibGetApplicationReviewPageRelatedData
 * Category: Form
 * Modified: 2026-02-19T14:43:20.467Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: d976430d-fa13-f011-82d2-d3e905652a41
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
    Script Name:    LibGetApplicationReviewPageRelatedData
    Customer:       WADNR
    Purpose:        The purpose of this script is to retrieve autopopulated data for the Application Review Page
    Parameters:     The following represent variables passed into the function:
                    FPAN Number: Number of FPAN application to look up Optional SEE NOTE
                    Form ID: FPAN application form ID to look up Optional SEE NOTE
                    NOTE: Either ‘FPAN Number’ or ‘FormID’ must be provided as part of the input
                    parameters. At least one of these is required.
                    Type: Type of application to lookup (FPAN, LTA, AERIAL, etc)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1° GET THE VALUES OF THE FIELDS
                    2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
                    3° CHECK IF TYPE IS FPA/N OR LTA-2, THEN RETRIEVE RELATED FORMS AND PERFORM CALCULATIONS
                        3.1° RETRIEVE FORMS
                        3.2° SUM CALCULATION
                        3.3° OBTAIN RENEWAL INFORMATION
                        3.4° OBTAIN ADDITIONAL INFORMATION FOR LTA-2
                        3.5° ASSEMBLE RESPONSE OBJECT
                    4° CHECK IF TYPE IS LTA-1 OR AERIAL, THEN RETRIEVE RELATED FORMS AND PERFORM CALCULATIONS
                        4.1° RETRIEVE FORMS
                        4.2° SUM CALCULATION
                        4.3° OBTAIN RENEWAL INFORMATION
                        4.4° ASSEMBLE RESPONSE OBJECT
                    5° BUILD THE SUCCESS RESPONSE ARRAY

    Date of Dev:    04/08/2025
    Last Rev Date:  08/21/2025

    Revision Notes:
                    04/08/2025 - Austin Stone:  First Setup of the script
                    04/15/2025 - Alfredo Scilabra:  Added Form ID as optional param
                    06/06/2025 - Alfredo Scilabra:  Updated getWaterCrossing func to retrieve only enabled records
                    06/20/2025 - Alfredo Scilabra:  WADNR-6085 Cleanup and Fixes
                    08/21/2025 - Moises Savelli: Adjust date of receipt calculation
                    01/22/2026 - Sebastian Rolando: Fix Status Value for Renewal
    */

    logger.info(`Start of the process LibGetApplicationReviewPageRelatedData at ${Date()}`);

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

    function getApplication(fpanNumberOrApplicationFormID, templateName, byFormID) {
        const shortDescription = `Get FPAN Form ID of FPAN Number ${fpanNumberOrApplicationFormID}`;

        const getFormParams = {
            q: `${byFormID ? '[Top Form ID]' : '[FPAN Number]'} eq '${fpanNumberOrApplicationFormID}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function getFormRecords(fpanFormID, templateName) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get associated ${templateName} for FPAN form ID ${fpanFormID}`;
        const getFormsParams = {
            q: `[related Record ID] eq '${fpanFormID}'`,
            expand: true, // true to get all the form's fields
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getWaterCrossing(fpanFormID) {
        const shortDescription = `Get associated Water Crossings records for FPAN form ID ${fpanFormID}`;
        const getFormsParams = {
            q: `[fpan ID] eq '${fpanFormID}' AND [Status] ne 'Disabled'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Water Crossings')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const fpanNumber = getFieldValueByName('FPAN Number').trim().toUpperCase();
        const fpanType = getFieldValueByName('Type').trim().toUpperCase();
        let applicationFormID = getFieldValueByName('Form ID', true).trim();

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if ((!fpanNumber && !applicationFormID) || !fpanType) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }
        const applicationReviewPage = await getApplication(fpanNumber, 'Application Review Page');

        if (!applicationReviewPage) {
            errorLog.push('Application review page not found.');
            throw new Error(errorLog.join('; '));
        }

        // 3° CHECK IF TYPE IS FPA/N OR LTA-2, THEN RETRIEVE RELATED FORMS AND PERFORM CALCULATIONS
        let responseObj;
        if (fpanType === 'FPA/N' || fpanType === 'LTA-2') {
            // 3.1° RETRIEVE FORMS
            const fpan = await getApplication(
                applicationFormID !== '' ? applicationFormID : fpanNumber,
                'Forest Practices Application Notification',
                applicationFormID !== ''
            );
            const fpanFormID = fpan['top Form ID'];
            let renewal = await getFormRecords(fpanFormID, 'FPAN Renewal');
            if (renewal.length > 0) {
                renewal = renewal[0];
            }
            const timber = await getFormRecords(fpanFormID, 'Timber');
            const rockPit = await getFormRecords(fpanFormID, 'Rockpit');
            const forestRoads = await getFormRecords(fpanFormID, 'Forest Roads');
            const waterCrossings = await getWaterCrossing(fpanFormID);
            const spoils = await getFormRecords(fpanFormID, 'Spoils');
            const positionManagement = await getFormRecords(fpanFormID, 'Position Management');

            // 3.2° SUM CALCULATION
            const hydraulicProject = waterCrossings.length;
            let timberHarvest = 0;
            let biomass = 0;
            let rockPitExisting = 0;
            let rockPitNew = 0;
            let roadConstruction = 0;
            let roadAbandonment = 0;
            let spoilDeposits = 0;
            timber.forEach((item) => {
                timberHarvest += item['acres Harvested'];
                biomass += item['biomass Volume Harvested'];
            });
            rockPit.forEach((item) => {
                rockPitExisting += item['acres of Existing Rock Pit Developed'];
                rockPitNew += item['acres of New Rock Pit Developed'];
            });
            forestRoads.forEach((item) => {
                roadConstruction += item['road Construction Length'];
                roadAbandonment += item['road Abandonment Length'];
            });
            spoils.forEach((item) => {
                spoilDeposits += item['amount of Spoils Deposited'];
            });

            // 3.3° OBTAIN RENEWAL INFORMATION
            let renewalStatus = '';
            let renewalDateOfReceipt = '';
            if (renewal) {
                if (
                    ![
                        'Draft',
                        'Pending Required Signatures',
                        'Required Signatures Received',
                        'Withdrawn',
                        'Disapproved',
                    ].includes(renewal['status'])
                ) {
                    renewalStatus = renewal['status'];
                    renewalDateOfReceipt = renewal['date of Receipt'] ? renewal['date of Receipt'].split('T')[0] : '';
                }
            }

            // 3.4° OBTAIN ADDITIONAL INFORMATION FOR LTA-2
            let ltaStatus = '';
            let ltaDateOfReceipt = '';
            if (fpanType === 'LTA-2') {
                const LTAStep1 = await getApplication(fpanNumber, 'Step 1 Long Term FPA');
                ltaStatus = LTAStep1['status'];
                ltaDateOfReceipt = LTAStep1['date of Receipt'] ? LTAStep1['date of Receipt'].split('T')[0] : '';
            }

            // 3.5° ASSEMBLE RESPONSE OBJECT
            responseObj = {
                fpanNumber: fpanNumber,
                applicationReviewPageID: applicationReviewPage['form ID'],
                fpanDateOfReceipt: fpan['date of Receipt'] ? fpan['date of Receipt'].split('T')[0] : '',
                fpanExpirationDate: fpan['expiration Date'] ? fpan['expiration Date'].split('T')[0] : '',
                renewalStatus: renewalStatus,
                renewalDateOfReceipt: renewalDateOfReceipt,
                ltaDateOfReceipt: ltaDateOfReceipt,
                ltaStatus: ltaStatus,
                timberHarvest: timberHarvest,
                biomass: biomass,
                rockPitExisting: rockPitExisting,
                rockPitNew: rockPitNew,
                roadConstruction: roadConstruction,
                roadAbandonment: roadAbandonment,
                hydraulicProject: hydraulicProject,
                spoilDeposits: spoilDeposits,
                aerialSpray: 0,
                fpForesterPosition: positionManagement[0] ? positionManagement[0]['position No'] : '',
            };
        }

        // 4° CHECK IF TYPE IS LTA-1 OR AERIAL, THEN RETRIEVE RELATED FORMS AND PERFORM CALCULATIONS
        if (fpanType === 'LTA-1' || fpanType === 'AERIAL') {
            // 4.1° RETRIEVE FORMS
            let application;
            if (fpanType === 'LTA-1') {
                application = await getApplication(
                    applicationFormID !== '' ? applicationFormID : fpanNumber,
                    'Step 1 Long Term FPA',
                    applicationFormID !== ''
                );
            } else {
                application = await getApplication(
                    applicationFormID !== '' ? applicationFormID : fpanNumber,
                    'Forest Practices Aerial Chemical Application',
                    applicationFormID !== ''
                );
            }
            applicationFormID = application['top Form ID'];
            const legalDescription = await getFormRecords(applicationFormID, 'Legal Description');
            let renewal = await getFormRecords(applicationFormID, 'FPAN Renewal');

            if (renewal.length > 0) {
                renewal = renewal[0];
            }

            // 4.2° SUM CALCULATION
            let aerialSpray = 0;
            legalDescription.forEach((item) => {
                aerialSpray += parseInt(item['acres']);
            });

            // 4.3° OBTAIN RENEWAL INFORMATION
            let renewalStatus = '';
            let renewalDateOfReceipt = '';
            if (renewal) {
                if (
                    ![
                        'Draft',
                        'Pending Required Signatures',
                        'Required Signatures Received',
                        'Withdrawn',
                        'Disapproved',
                    ].includes(renewal['status'])
                ) {
                    renewalStatus = renewal['status'];
                    renewalDateOfReceipt = renewal['date of Receipt'] ? renewal['date of Receipt'].split('T')[0] : '';
                }
            }

            // 4.4° ASSEMBLE RESPONSE OBJECT
            responseObj = {
                fpanNumber: fpanNumber,
                applicationReviewPageID: applicationReviewPage['form ID'],
                fpanDateOfReceipt:
                    application['date of Receipt'] || application['received Date'] || application['Received Date'],
                fpanExpirationDate: applicationReviewPage['fpaN Decision Expiration Date'],
                renewalStatus: renewalStatus,
                renewalDateOfReceipt: renewalDateOfReceipt,
                ltaDateOfReceipt:
                    application['date of Receipt'] && fpanType === 'LTA-1'
                        ? application['date of Receipt'].split('T')[0]
                        : '',
                ltaStatus: fpanType === 'LTA-1' ? application['status'] : '',
                timberHarvest: 0,
                biomass: 0,
                rockPitExisting: 0,
                rockPitNew: 0,
                roadConstruction: 0,
                roadAbandonment: 0,
                hydraulicProject: 0,
                spoilDeposits: 0,
                aerialSpray: aerialSpray,
                fpForesterPosition: '',
            };
        }

        // case only for renewal
        if (fpanType === 'RENEWAL') {
            responseObj = {
                fpanExpirationDate: applicationReviewPage['fpaN Decision Expiration Date'],
            };
        }

        // 5° BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Application review page data successfully retrieved';
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
