/**
 * LibUpdateApplicationReviewPage
 * Category: Form
 * Modified: 2026-04-02T17:30:37.01Z by lucas.herrera@visualvault.com
 * Script ID: Script Id: 0c4b2b89-3416-f011-82d3-f3203e068116
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
      Script Name:    LibUpdateApplicationReviewPage
      Customer:       WADNR
      Purpose:        The purpose of this script is to update the Application Review Page
      Preconditions:
                      This library requires the following libraries:
                          - LibGetApplicationReviewPageRelatedData
                          - LibCalculateBusinessDate
      Parameters:     The following represent variables passed into the function:
                          Form ID: Form ID of the application
                          Region: Region associated with the application
                          FPAN Number: FPAN number of the application
                          Application Type: Type of application submitted (FPA/N, LTA-1, LTA-2, AERIAL)
                          Update Client Side: flag that determines whether or not received by date is
                              updated on the application review page (yes, no)
      Return Object:
                      outputCollection[0]: Status
                      outputCollection[1]: Short description message
                      outputCollection[2]: Data
      Pseudo code:
                      1° GET THE VALUES OF THE FIELDS
                      2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
                      3° GET THE APPLICATION REVIEW PAGE
                      4° RELATE THE APPLICATION TO THE APPLICATION REVIEW PAGE
                      5° CALCULATE THE RECEIVED BY DATE
                      6° GET THE VALUES TO POPULATE THE APPLICATION REVIEW PAGE
                      7° UPDATE THE APPLICATION REVIEW PAGE WITH THE RETRIEVED DATA
                      8° IF UPDATE CLIENT SIDE IS NO, UPDATE THE RECEIVED BY DATE ON THE APPLICATION
                      9° SEND SUCCESS RESPONSE

      Date of Dev:    04/10/2025
      Last Rev Date:  03/25/2026

      Revision Notes:
                      04/10/2025 - Austin Stone:  First Setup of the script
                      04/23/2025 - Alfredo Scilabra:  Set Is Aerial Chemical Resubmission and
                                      Aerial Chemical Status Updated At params as Optional
                                      Also added Is LTA Step1 Resubmission and LTA Step1 Status Updated At Optional params
                      04/24/2025 - Alfredo Scilabra:  Add Is Renewal Resubmission and Renewal Status Updated At Optional params
                                      Also some reformatting to improve reading/scalability
                      05/06/2025 - Alfredo Scilabra:  Add Is FPAN Resubmission and FPAN Status Updated At Optional params
                      05/21/2025 - Mauro Rapuano:  Add Application Type when updating ARP to include LTA Step 2
                      05/23/2025 - Mauro Rapuano:  Add getLTAStep1Status to update header status on resubmit
                      05/26/2025 - Mauro Rapuano:  Add getRenewalStatus to update header status on resubmit
                      05/26/2025 - Alfredo Scilabra: Add a validation to prevent Realted Record ID override
                      05/27/2025 - Alfredo Scilabra: Add a helper field to store renewal ID
                      05/27/2025 - Mauro Rapuano: Fix when updating Renewal status to Submitted/Received
                      06/04/2025 - Mauro Rapuano: Set businessDays param to 0 instead of 1 when calling LibCalculateBusinessDate
                      09/04/2025 - Mauro Rapuano: Add flags to indicate if there is no LTA-1 or Renewal submitted form.
                      10/22/2025 - Alfredo Scilabra: Add suppor for copying contact information
                      01/19/2026 - Mauro Rapuano: Update Received Date to use America/Los_Angeles timezone
                      01/20/2026 - Sebastian Rolando: Prevent update header Status for ARP when Form Id does not belong from Main Application
                      01/26/2026 - Sebastian Rolando: Add mapping to store last LTA-1 related record when LTA-2 is submitted
                      03/25/2026 - Mauro Rapuano: Updated validation to avoid overriding Related Record ID when updating not main forms
                      04/02/2026 - Lucas Herrera: Added exception to only update the Last Related Record ID when LTA-2 is submitted

      */

    logger.info(`Start of the process LibUpdateApplicationReviewPage at ${Date()}`);

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

    const CONTACT_PERSON_FIELD_NAMES_BY_FORM_TYPE = new Map([
        [
            'Forest Practices Application Notification',
            {
                firstName: 'first Name Contact Person',
                lastName: 'last Name Contact Person',
                email: 'email Contact Person',
                phone: 'phone Contact Person',
            },
        ],
        [
            'Forest Practices Aerial Chemical Application',
            {
                firstName: 'contact Person First Name',
                lastName: 'contact Person Last Name',
                email: 'contact Person Email',
                phone: 'contact Person Phone',
            },
        ],
        [
            'Step 1 Long Term FPA',
            {
                firstName: 'first Name Contact Person',
                lastName: 'last Name Contact Person',
                email: 'email Contact Person',
                phone: 'phone Contact Person',
            },
        ],
        [
            'Long-Term Application 5-Day Notice',
            {
                firstName: 'first Name Contact Person',
                lastName: 'last Name Contact Person',
                email: 'phone Contact Person',
                phone: 'email Contact Person',
            },
        ],
        [
            'FPAN Amendment Request',
            {
                firstName: 'first Name Contact Person',
                lastName: 'last Name Contact Person',
                email: 'email Contact Person',
                phone: 'phone Contact Person',
            },
        ],
        [
            'FPAN Renewal',
            {
                firstName: 'first Name Contact Person',
                lastName: 'last Name Contact Person',
                email: 'email Contact Person',
                phone: 'phone Contact Person',
            },
        ],
    ]);

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

    function getApplicationReviewPage(fpanNumber, templateName) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get FPAN Form ID of FPAN Number ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true, // true to get all the form's fields
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
            .then((res) => res.data[0]);
    }

    function getFPANStatus(fpanNumber) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get FPAN Form ID of FPAN Number ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true, // true to get all the form's fields
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Forest Practices Application Notification')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
            .then((res) => res.data[0].status);
    }

    function getLTAStep1Status(fpanNumber) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get Step 1 Long Term FPA Form ID of FPAN Number ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true, // true to get all the form's fields
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Step 1 Long Term FPA')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
            .then((res) => res.data[0].status);
    }

    function getRenewalStatus(fpanNumber) {
        // IMPORTANT: getForms has a limit of 200 records, if you need to get more than 200 records use getCustomQueryResultsByName
        const shortDescription = `Get FPAN Renewal Form ID of FPAN Number ${fpanNumber}`;
        const notInProcessStatus =
            "'Draft', 'Pending Required Signatures', 'Required Signatures Received', 'Withdrawal Requested', 'Ready to Delete'";
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}' and [Status] Not In (${notInProcessStatus})`,
            expand: true, // true to get all the form's fields
        };

        return vvClient.forms
            .getForms(getFormsParams, 'FPAN Renewal')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription)) // Comment out this line if the query could have no match
            .then((res) => res.data[0].status);
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

    function getRecord(formTemplateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`,
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

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateNames = [
            { prefix: 'STEP-1-LONG-TERM-FPA', name: 'Step 1 Long Term FPA' },
            {
                prefix: 'FPA-AERIAL-CHEMICAL',
                name: 'Forest Practices Aerial Chemical Application',
            },
            { prefix: 'FPAN-AMENDMENT', name: 'FPAN Amendment Request' },
            { prefix: 'FPAN-RENEWAL', name: 'FPAN Renewal' },
            { prefix: 'FPAN-T', name: 'FPAN Notice of Transfer' },
            { prefix: 'LT-5DN', name: 'Long-Term Application 5-Day Notice' },
            { prefix: 'FPAN', name: 'Forest Practices Application Notification' },
        ];

        const normalizedID = recordID.replace(/\s+/g, ''); // Remove spaces

        for (const { prefix, name } of templateNames) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
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

    async function getAPRData(fpanNumber, applicationType) {
        const [LibGetApplicationReviewPageStatus, , realtedDataResult] = await callExternalWs(
            'LibGetApplicationReviewPageRelatedData',
            [
                {
                    name: 'FPAN Number',
                    value: fpanNumber,
                },
                {
                    name: 'Type',
                    value: applicationType,
                },
            ]
        );

        if (LibGetApplicationReviewPageStatus !== 'Success') {
            throw new Error('Error getting ARP data.');
        }

        return realtedDataResult;
    }

    function getTemplateNameByApplicationType(applicationType) {
        const templates = {
            'FPA/N': 'Forest Practices Application Notification',
            'LTA-2': 'Forest Practices Application Notification',
            'LTA-1': 'Step 1 Long Term FPA',
            AERIAL: 'Forest Practices Aerial Chemical Application',
        };
        return templates[applicationType] || '';
    }

    function buildUpdateObject(
        {
            formID,
            APRData,
            receivedDate,
            fpanStatus,
            isAerialChemicalResubmission = false,
            isLTAStep1Resubmission = false,
            isRenewalResubmission = false,
            isFPANResubmission = false,
            aerialChemicalUpdatedAt,
            ltaStep1UpdatedAt,
            renewalUpdatedAt,
            fpanUpdatedAt,
            applicationType,
        },
        applicationReviewPage,
        applicationName
    ) {
        // Check if the Form ID belongs from a main app
        const isFormIDMainApp =
            (formID.startsWith('FPAN-') ||
                formID.startsWith('FPA-AERIAL-CHEMICAL-APPLICATION-') ||
                formID.startsWith('STEP-1-LONG-TERM-FPA-')) &&
            !formID.includes('-AMENDMENT-') &&
            !formID.includes('-RENEWAL-') &&
            !formID.includes('-5DN-') &&
            !formID.includes('-T-')
                ? true
                : false;

        const isFPAN = formID.startsWith('FPAN-') && isFormIDMainApp;

        const updateObject = {
            'Related Record ID': formID,
            // 'Last Related Record ID': ( applicationType === 'LTA-2' && applicationReviewPage['last Related Record ID'] === '' ) && applicationReviewPage['related Record ID'],
            'Last Related Record ID':
                isFPAN && applicationType === 'LTA-2' && applicationReviewPage['last Related Record ID'] === ''
                    ? applicationReviewPage['related Record ID']
                    : applicationReviewPage['last Related Record ID'],
            'Timber Harvest': APRData.timberHarvest,
            Biomass: APRData.biomass,
            'Rock Pit': APRData.rockPitExisting + APRData.rockPitNew,
            'Road Construction': APRData.roadConstruction,
            'Road Abandonment': APRData.roadAbandonment,
            'Hydraulic Project': APRData.hydraulicProject,
            'Spoil Deposits': APRData.spoilDeposits,
            'Aerial Spray': APRData.aerialSpray,
            'FPAN Date of Receipt': formID.startsWith('FPAN') ? receivedDate : APRData.fpanDateOfReceipt,
            'FPAN Renewal Status': formID.startsWith('FPAN-RENEWAL')
                ? fpanStatus === 'Submitted'
                    ? 'Received'
                    : fpanStatus
                : APRData.renewalStatus,
            'FPAN Renewal Date of Receipt': formID.startsWith('FPAN-RENEWAL')
                ? receivedDate
                : APRData.renewalDateOfReceipt,
            'LTA Step 1 Status': APRData.ltaStatus,
            'LTA Date of Receipt': APRData.ltaDateOfReceipt,
            ...(isFormIDMainApp && { 'FPAN Status': fpanStatus === 'Submitted' ? 'Received' : fpanStatus }),
            'Application Type': applicationType,
        };

        if (aerialChemicalUpdatedAt) {
            updateObject['Aerial Chemical Status Updated At'] = aerialChemicalUpdatedAt;
            updateObject['Aerial Chemical Status Flag'] = 'True';
        }

        if (ltaStep1UpdatedAt) {
            updateObject['LTAStep1 Status Updated At'] = ltaStep1UpdatedAt;
            updateObject['LTA Step 1 Status Flag'] = 'True';
        }

        if (renewalUpdatedAt) {
            updateObject['Renewal Status Updated At'] = renewalUpdatedAt;
            updateObject['FPAN Renewal Status Flag'] = 'True';
        }

        if (fpanUpdatedAt) {
            updateObject['FPAN Status Updated At'] = fpanUpdatedAt;
            updateObject['FPAN Status Flag'] = 'True';
        }

        return updateObject;
    }

    function parseBool(value) {
        return String(value).toLowerCase() === 'true';
    }

    function getContactPerson(application, applicationName) {
        const fieldMap = CONTACT_PERSON_FIELD_NAMES_BY_FORM_TYPE.get(applicationName);

        if (!fieldMap) {
            return {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
            };
        }

        return {
            firstName: application[fieldMap.firstName] || '',
            lastName: application[fieldMap.lastName] || '',
            email: application[fieldMap.email] || '',
            phone: application[fieldMap.phone] || '',
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const formID = getFieldValueByName('Form ID').trim();
        const region = getFieldValueByName('Region').trim();
        const fpanNumber = getFieldValueByName('FPAN Number').trim();
        const applicationType = getFieldValueByName('Application Type').trim().toUpperCase();
        const updateClientSide = getFieldValueByName('Update Client Side').trim().toLowerCase();

        // Optional Resubmission params
        // If resubmission flag is true UpdatedAt date is required
        const isAerialChemicalResubmission = parseBool(getFieldValueByName('Is Aerial Chemical Resubmission', true));
        const aerialChemicalUpdatedAt = getFieldValueByName(
            'Aerial Chemical Status Updated At',
            !isAerialChemicalResubmission
        );
        const isLTAStep1Resubmission = parseBool(getFieldValueByName('Is LTA Step1 Resubmission', true));
        const ltaStep1UpdatedAt = getFieldValueByName('LTA Step1 Status Updated At', !isLTAStep1Resubmission);
        const isRenewalResubmission = parseBool(getFieldValueByName('Is Renewal Resubmission', true));
        const renewalUpdatedAt = getFieldValueByName('Renewal Status Updated At', !isRenewalResubmission);
        const isFPANResubmission = parseBool(getFieldValueByName('Is FPAN Resubmission', true));
        const fpanUpdatedAt = getFieldValueByName('FPAN Status Updated At', !isFPANResubmission);

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT
        if (!formID || !region || !fpanNumber || !applicationType) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3° GET THE APPLICATION REVIEW PAGE
        const applicationReviewPage = await getApplicationReviewPage(fpanNumber, 'Application Review Page');

        // 4° RELATE THE APPLICATION TO THE APPLICATION REVIEW PAGE
        const applicationName = detectFormTemplateFromID(formID);
        const [sourceApplication] = await getRecord(applicationName, formID);
        const applicationGuid = sourceApplication.revisionId;
        await relateRecords(applicationGuid, applicationReviewPage.instanceName);

        // 5° CALCULATE THE RECEIVED BY DATE
        const receivedDateUtc = await getReceivedDate();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const receivedDate = formatter.format(new Date(receivedDateUtc));

        // 6° GET THE VALUES TO POPULATE THE APPLICATION REVIEW PAGE
        const APRData = await getAPRData(fpanNumber, applicationType);

        let fpanStatus = '';
        if (applicationType == 'FPA/N' || applicationType == 'LTA-2') {
            fpanStatus = await getFPANStatus(fpanNumber);
        }
        if (applicationType == 'LTA-1') {
            fpanStatus = await getLTAStep1Status(fpanNumber);
        }
        if (formID.startsWith('FPAN-RENEWAL')) {
            fpanStatus = await getRenewalStatus(fpanNumber);
        }

        // 7° UPDATE THE APPLICATION REVIEW PAGE WITH THE RETRIEVED DATA
        const updateObject = buildUpdateObject(
            {
                formID,
                APRData,
                receivedDate,
                fpanStatus,
                isAerialChemicalResubmission,
                isLTAStep1Resubmission,
                isRenewalResubmission,
                isFPANResubmission,
                aerialChemicalUpdatedAt,
                ltaStep1UpdatedAt,
                renewalUpdatedAt,
                fpanUpdatedAt,
                applicationType,
            },
            applicationReviewPage,
            applicationName
        );

        const isFormIDMainApp =
            (formID.startsWith('FPAN-') ||
                formID.startsWith('FPA-AERIAL-CHEMICAL-APPLICATION-') ||
                formID.startsWith('STEP-1-LONG-TERM-FPA-')) &&
            !formID.includes('-AMENDMENT-') &&
            !formID.includes('-RENEWAL-') &&
            !formID.includes('-5DN-') &&
            !formID.includes('-T-')
                ? true
                : false;
        //Validation to prevent Realted Record ID override
        if (!isFormIDMainApp || (applicationReviewPage['related Record ID'] !== '' && applicationType !== 'LTA-2')) {
            delete updateObject['Related Record ID'];
        }

        if (applicationName === 'FPAN Renewal') {
            updateObject['Renewal ID'] = formID;
            updateObject['No Renewal submitted form'] = 'False';
        }

        const contactInformation = getContactPerson(sourceApplication, applicationName);

        const updateARPRes = await updateRecord('Application Review Page', applicationReviewPage['revisionId'], {
            ...updateObject,
            ...{
                'Contact Person First name': contactInformation.firstName,
                'Contact Person Last Name': contactInformation.lastName,
                'Contact Person Email': contactInformation.email,
                'Contact Person Phone': contactInformation.phone,
            },
        });

        // 8° IF UPDATE CLIENT SIDE IS NO, UPDATE THE RECEIVED BY DATE ON THE APPLICATION
        const templateName = getTemplateNameByApplicationType(applicationType);
        if (updateClientSide === 'no' && templateName != '') {
            const recordGUID = await getRecordGUID(templateName, formID);
            const updateApplicationRes = await updateRecord(templateName, recordGUID, {
                'Date of Receipt': receivedDate,
            });
        }

        // 9° SEND SUCCESS RESPONSE
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Application review page successfully updated';
        outputCollection[2] = {
            'FPAN Number': fpanNumber,
            'Application Review Page Form ID': applicationReviewPage['top Form ID'],
            'Application Review Page GUID': applicationReviewPage['revisionId'],
            'Date of Receipt': receivedDate,
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
