/**
 * LibWorkflowAutoSubmit
 * Category: Workflow
 * Modified: 2026-03-20T19:38:31.36Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 79a360f9-0ba9-f011-82f0-8c97be6eb69c
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
    Script Name:    LibWorkflowAutoSubmit
    Customer:       WADNR
    Purpose:        Automates first-time submissions for fee-based applications (FPAN, LTA Step 1, Renewal) once they are Paid. It executes the same business logic as the
                    manual Submit button—including ARP creation/update, field updates, status transitions, status
                    history creation, document path updates, and notifications.
    Preconditions:
                    - 
    Parameters:     
                    formId (String, Required) Form instance ID
                    formType (String, Required) must be one of: FPAN, LTA Step 1 or Renewal
    Return Object:
                    1. MicroserviceResult - Return true if process ran successfully.  Return false if an error occurred.
                    2. MicroserviceMessage - Message about what happened.
    Psuedo code: 
                    1° Get parameters
                    2° Check if the required parameters are present
                    3° Check preconditions (Fees Paid = True, AutoSubmissionNeeded = True, Not already submitted)
                    4° Do submit-equivalence process
                        4.1 Appendix A status update (only for FPAN)
                        4.2 Call LibCreateApplicationReviewPage or LibUpdateApplicationReviewPage
                        4.3 Set 'FPAN Number', 'Date of Receipt', 'ARP ID', 'Status' = 'Submitted', 'Upload Document Path'
                        4.4 Create Status History for Submitted Status and move uploaded documents
                        4.5 Create Status History for Received Status
                        4.6 Update form's fields and send notifications
                    5° Build data response object

    Date of Dev:    10/13/2025

    Revision Notes:
    10/13/2025 - Mauro Rapuano:  First Setup of the script
    12/10/2025 - Mauro Rapuano:  Added Application Review Page ID to Status History creation call
    03/18/2026 - Mauro Rapuano:  Updated code to use WA Timezone 
    03/19/2026 - John Sevilla:   Update folder path derivation to account for legacy FPA numbers 
    */

    logger.info('Start of the process LibWorkflowAutoSubmit at ' + Date());

    /**************************************
     Response and error handling variables
    ***************************************/

    let returnObject;

    // Respond immediately before the "processing"
    const responseParams = {
        success: true,
        message: 'Process started successfully.',
    };
    response.json(200, responseParams);

    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /***********************
     Configurable Variables
    ************************/

    const libCreateApplicationReviewPage = 'LibCreateApplicationReviewPage';
    const libUpdateApplicationReviewPage = 'LibUpdateApplicationReviewPage';
    const libCreateStatusHistory = 'LibStatusHistoryCreate';
    const fpanUpdateStatusAllAppendixA = 'FPANUpdateStatusAllAppendixA';

    const notSubmittedStatus = [
        'Needs Submission',
        'Need Submission',
        'Required Signatures Received',
        'Submitted', // Included as this is a mid status in the submit process (so it can resume if an error happens)
    ];

    /*****************
     Script Variables
    ******************/

    // Describes the process being checked using the parsing and checking helper functions
    let shortDescription = '';
    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    /*****************
     Helper Functions
    ******************/

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
            // If an error ocurrs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
        Checks that the meta property of a vvCliente API response object has the expected status code
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
        Checks that the data property of a vvCliente API response object exists 
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
        Checks that the data property of a vvCliente API response object is not empty
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

    async function getForm(formId, formTemplate) {
        const shortDescription = `Get form ${formTemplate}`;
        const getFormsParams = {
            q: `[instanceName] eq '${formId}'`,
            //expand: true, // true to get all the form's fields
            fields: 'revisionId, instanceName, Fees Paid, AutoSubmissionNeeded, Status, FPAN Number, Region, Project Name, Long Term Application, Upload Document Path',
        };

        return (
            vvClient.forms
                .getForms(getFormsParams, formTemplate)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
                .then((res) => res.data)
        );
    }

    async function callLibCreateApplicationReviewPage(formId, region, projectName, appType, q3answer) {
        const shortDescription = `Run Web Service: ${libCreateApplicationReviewPage}`;

        const webServiceParams = [
            {
                name: 'Form ID',
                value: formId,
            },
            {
                name: 'Region',
                value: region,
            },
            {
                name: 'Project Name',
                value: projectName,
            },
            {
                name: 'Form Type',
                value: 'FPA',
            },
            {
                name: 'Long Term Application',
                value: q3answer,
            },
            {
                name: 'Update Client Side',
                value: 'Yes',
            },
        ];

        return vvClient.scripts
            .runWebService(libCreateApplicationReviewPage, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function callLibUpdateApplicationReviewPage(formId, region, fpaNumber, appType) {
        const shortDescription = `Run Web Service: ${libUpdateApplicationReviewPage}`;

        const webServiceParams = [
            {
                name: 'Form ID',
                value: formId,
            },
            {
                name: 'Region',
                value: region,
            },
            {
                name: 'FPAN Number',
                value: fpaNumber,
            },
            {
                name: 'Application Type',
                value: appType,
            },
            {
                name: 'Update Client Side',
                value: 'Yes',
            },
        ];

        return vvClient.scripts
            .runWebService(libUpdateApplicationReviewPage, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function callLibStatusHistoryCreate(
        formType,
        fpanNumber,
        relatedRecordId,
        beforeStatusValue,
        statusChange,
        statusModifiedDate,
        arpId
    ) {
        const shortDescription = `Run Web Service: ${libCreateStatusHistory}`;

        const now = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
        const webServiceParams = [
            { name: 'Form Type', value: formType },
            { name: 'FPAN Number', value: fpanNumber },
            { name: 'Related Record ID', value: relatedRecordId },
            { name: 'Before Status Value', value: beforeStatusValue },
            { name: 'Status Change', value: statusChange },
            { name: 'Status Modified By', value: 'WADNR.api' },
            { name: 'Status Modified Date', value: statusModifiedDate },
            { name: 'Application Review Page ID', value: arpId },
        ];

        return (
            vvClient.scripts
                .runWebService(libCreateStatusHistory, webServiceParams)
                //.then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data)
        );
    }

    function detectAppType(formType) {
        if (formType === 'fpan') return 'FPAN';
        if (formType === 'lta step 1' || formType === 'step1') return 'LTA-1';
        if (formType === 'renewal') return 'FPAN';
    }

    function getFormName(formType) {
        if (formType === 'fpan') return 'Forest Practices Application Notification';
        if (formType === 'lta step 1' || formType === 'step1') return 'Step 1 Long Term FPA';
        if (formType === 'renewal') return 'FPAN Renewal';
    }

    async function updateFormRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    async function updateAppendixAStatus(formId) {
        const shortDescription = `Run Web Service: ${fpanUpdateStatusAllAppendixA}`;

        const webServiceParams = [
            {
                name: 'Form ID',
                value: formId,
            },
        ];

        return (
            vvClient.scripts
                .runWebService(libCreateApplicationReviewPage, webServiceParams)
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription))
                .then((res) => res.data)
        );
    }

    function getDocumentPath(fpaNumber, rangeNotRequired) {
        if (typeof rangeNotRequired === 'undefined') {
            rangeNotRequired = false;
        } else if (typeof rangeNotRequired !== 'boolean') {
            throw new Error('Param "rangeNotRequired" must be "true" or "false".');
        }

        fpaNumber = String(fpaNumber).trim();

        // Validate the against the fpOnline number formats
        const fpOnlineNumberFormatMatch = fpaNumber.match(/^[^-]+-[^-]+-(\d{2})-(\d+)/);
        if (fpOnlineNumberFormatMatch) {
            let [, year, sequenceNumber] = fpOnlineNumberFormatMatch;
            year = '20' + year;
            sequenceNumber = parseInt(sequenceNumber, 10);
            const upper = Math.ceil(sequenceNumber / 1000) * 1000;
            const lower = upper - 999;

            if (rangeNotRequired) {
                return `${year}/${fpaNumber}`;
            } else {
                return `${year}/${lower}-${upper}/${fpaNumber}`;
            }
        }

        // If unable to match above, validate against the legacy FPA number format
        const legacyFPANumberFormatMatch = fpaNumber.match(/^\d+$/);
        if (legacyFPANumberFormatMatch) {
            return `Legacy/${fpaNumber}`;
        }

        // If nothing matches, return an empty string
        return '';
    }

    async function getARPDataByFPANNumber(fpanNumber) {
        const shortDescription = `Get Application Review Page for ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            //expand: true, // true to get all the form's fields
            fields: 'revisionId, instanceName, fpaN Number, fpaN Date of Receipt, ltA Date of Receipt, fpaN Renewal Date of Receipt, Application Type',
        };

        return (
            vvClient.forms
                .getForms(getFormsParams, 'Application Review Page')
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
                .then((res) => res.data)
        );
    }

    async function getARPDataByRelatedRecordID(formId) {
        const shortDescription = `Get Application Review Page for ${formId}`;
        const getFormsParams = {
            q: `[Related Record ID] eq '${formId}'`,
            //expand: true, // true to get all the form's fields
            fields: 'revisionId, instanceName, fpaN Number, fpaN Date of Receipt, ltA Date of Receipt, fpaN Renewal Date of Receipt, Application Type',
        };

        return (
            vvClient.forms
                .getForms(getFormsParams, 'Application Review Page')
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                //.then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
                .then((res) => res.data)
        );
    }

    function getRegionCode(regionName) {
        switch (regionName) {
            case 'Northeast':
                return 'NE';
            case 'Northwest':
                return 'NW';
            case 'Southeast':
                return 'SE';
            case 'Olympic':
                return 'OL';
            case 'South Puget Sound':
                return 'SP';
            case 'Pacific Cascade':
                return 'PC';
            default:
                return regionName;
        }
    }

    /**********
     MAIN CODE 
    **********/

    try {
        // 1° Get parameters
        const formId = getFieldValueByName('formId');
        const formType = getFieldValueByName('formType').toLowerCase();

        // 2° Check if the required parameters are present
        if (!formId || !formType) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° Check preconditions (Fees Paid = True, AutoSubmissionNeeded = True, Not already submitted)
        // Get form record
        const formTemplate = getFormName(formType);
        const record = await getForm(formId, formTemplate);
        if (record.length === 0) {
            throw new Error(`${formType} record ${formId} not found`);
        }

        let fpaNumber;
        let dateOfReceipt;
        let arpID;
        let arpData = null;
        const oldStatus = record[0]['status'];
        const isSubmitted = !notSubmittedStatus.includes(record[0]['status']);

        if (!isSubmitted) {
            if (record[0]['fees Paid'] !== 'True') {
                throw new Error('Fees Paid not set');
            }
            if (record[0]['autoSubmissionNeeded'] !== 'True') {
                throw new Error('AutoSubmissionNeeded not set');
            }

            // 4° Do submit-equivalence process
            // 4.1 Appendix A status update (only for FPAN)
            if (formType === 'fpan') {
                await updateAppendixAStatus(formId);
            }

            // 4.2 Call LibCreateApplicationReviewPage or LibUpdateApplicationReviewPage
            let appType = detectAppType(formType);

            // If ARP already exists and not a Renewal (an error happened at next steps), don't create a new one
            const regionCode = getRegionCode(record[0]['region']);

            if (formType === 'renewal') {
                arpPreviousData = await getARPDataByFPANNumber(record[0]['fpaN Number']);
            } else {
                arpPreviousData = await getARPDataByRelatedRecordID(record[0]['instanceName']);
            }

            if (arpPreviousData.length === 0) {
                // Renewal updates ARP, while FPAN and LTA Step 1 create a new one
                const q3answer =
                    formType === 'lta step 1' || formType === 'step1'
                        ? 'Yes'
                        : record[0]['Is Long Term Application'] === 'True'
                          ? 'Yes'
                          : 'No';
                arpData = await callLibCreateApplicationReviewPage(
                    formId,
                    regionCode,
                    record[0]['project Name'],
                    appType,
                    q3answer
                );

                if (!arpData || !arpData[0] || arpData[0] != 'Success') {
                    throw new Error('Error creating or updating ARP');
                }

                fpaNumber = arpData[2]['FPAN_Number'];
                dateOfReceipt = arpData[2]['DateOfReceipt'];
                arpID = arpData[2]['Application Review ID'];
            } else if (formType === 'renewal') {
                appType = arpPreviousData[0]['application Type'];
                arpData = await callLibUpdateApplicationReviewPage(
                    formId,
                    regionCode,
                    record[0]['fpaN Number'],
                    appType
                );

                if (!arpData || !arpData[0] || arpData[0] != 'Success') {
                    throw new Error('Error creating or updating ARP');
                }

                fpaNumber = arpData[2]['FPAN Number'];
                dateOfReceipt = arpData[2]['Date of Receipt'];
                arpID = arpData[2]['Application Review Page Form ID'];
            } else {
                fpaNumber = arpPreviousData[0]['fpaN Number'];

                dateOfReceipt =
                    formType === 'fpan'
                        ? arpPreviousData['fpaN Date of Receipt']
                        : formType === 'lta step 1' || formType === 'step1'
                          ? arpPreviousData['ltA Date of Receipt']
                          : formType === 'renewal'
                            ? arpPreviousData['fpaN Renewal Date of Receipt']
                            : null;

                arpID = arpPreviousData[0]['instanceName'];
            }

            // 4.3 Set 'FPAN Number', 'Date of Receipt', 'ARP ID', 'Status' = 'Submitted', 'Upload Document Path'
            const fpaNumberParamsPath = getDocumentPath(fpaNumber);
            const newDocumentPath = '/FPA/' + fpaNumberParamsPath;
            const formTemplateName = getFormName(formType);

            await updateFormRecord(formTemplateName, record[0]['revisionId'], {
                Status: 'Submitted',
                'Upload Document Path': newDocumentPath,
                'FPAN Number': fpaNumber,
            });

            // 4.4 Create Status History for Submitted Status and move uploaded documents
            let statusHistoryRes = await callLibStatusHistoryCreate(
                formTemplateName,
                fpaNumber,
                formId,
                oldStatus,
                'Submitted',
                dayjs(new Date().toLocaleString()).tz('America/Los_Angeles').format('MM/DD/YYYY HH:mm:ss'),
                arpID
            );

            if (!statusHistoryRes || !statusHistoryRes[0] || statusHistoryRes[0] != 'Success') {
                // Rollback status in case of error
                await updateFormRecord(formTemplateName, record[0]['revisionId'], {
                    Status: oldStatus,
                    'Upload Document Path': '',
                    'FPAN Number': '',
                });
                throw new Error('Error creating Status History for Submitted status');
            }

            // 4.5 Create Status History for Received Status
            await callLibStatusHistoryCreate(
                formTemplateName,
                fpaNumber,
                formId,
                'Submitted',
                'Received',
                dayjs(new Date().toLocaleString()).tz('America/Los_Angeles').format('MM/DD/YYYY HH:mm:ss'),
                arpID
            );

            if (!statusHistoryRes || !statusHistoryRes[0] || statusHistoryRes[0] != 'Success') {
                // Rollback status in case of error
                await updateFormRecord(formTemplateName, record[0]['revisionId'], {
                    Status: oldStatus,
                    'Upload Document Path': '',
                    'FPAN Number': '',
                });
                throw new Error('Error creating Status History for Received status');
            }

            // 4.6 Update form's fields and send notifications
            await updateFormRecord(formTemplateName, record[0]['revisionId'], {
                'Created Date': dayjs(new Date().toLocaleString())
                    .tz('America/Los_Angeles')
                    .format('MM/DD/YYYY HH:mm:ss'),
                'Submitted Date': dayjs(new Date().toLocaleString())
                    .tz('America/Los_Angeles')
                    .format('MM/DD/YYYY HH:mm:ss'),
                'Date of Receipt': dateOfReceipt,
                'ARP ID': arpID,
                Status: 'Received',
                'Form Saved': 'True',
                'Notification Flag': 'False',
                UpdateSubformsToSubmitted: 'True',
            });
        } else {
            arpData = await getARPDataByFPANNumber(record[0]['fpaN Number']);
            if (arpData.length === 0) {
                throw new Error(`Application Review Page not found for ${record[0]['fpaN Number']}`);
            } else {
                arpData = arpData[0];
            }

            fpaNumber = arpData['fpaN Number'];

            dateOfReceipt =
                formType === 'fpan'
                    ? arpData['fpaN Date of Receipt']
                    : formType === 'lta step 1' || formType === 'step1'
                      ? arpData['ltA Date of Receipt']
                      : formType === 'renewal'
                        ? arpData['fpaN Renewal Date of Receipt']
                        : null;

            arpID = arpData['instanceName'];
        }

        // 5. Build data response object
        const dataObj = {
            FormType: formType,
            TargetStatus: 'Received',
            Transitions: ['Submitted', 'Received'],
            ArpId: arpID,
            DateOfReceipt: dateOfReceipt,
            FPANumberAssigned: fpaNumber,
            StatusHistoryRecorded: true,
        };

        // Create the following object that will be used when the api call is made to communicate the workflow item is complete.
        // First two items of the object are required to tell if the process completed successfully and the message that should be returned.
        // The other items in the object would have the name of any workflow variable that would be updated with data coming from the microservice/node script.
        returnObject = {
            MicroserviceResult: true,
            MicroserviceMessage: 'Microservice completed successfully',
            DocID: formId,
            'Process Message': 'Form transition completed successfully',
            Data: dataObj,
        };
    } catch (err) {
        logger.info('Error encountered' + err);

        returnObject = {
            MicroserviceResult: false,
            MicroserviceMessage: err,
        };
    } finally {
        shortDescription = 'Sending the workflow completion response to the log server';

        // If the complete was successful or not to the log server. This helps to track down what occurred when a microservice completed.
        await vvClient.scripts
            .completeWorkflowWebService(executionId, returnObject)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then(() => logger.info('Completion signaled to WF engine successfully.'))
            .catch(() => logger.info('There was an error signaling WF completion.'));
    }
};
