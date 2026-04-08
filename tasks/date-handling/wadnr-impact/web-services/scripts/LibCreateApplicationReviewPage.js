/**
 * LibCreateApplicationReviewPage
 * Category: Workflow
 * Modified: 2026-02-19T15:23:46.52Z by sebastian.rolando@visualvault.com
 * Script ID: Script Id: 46933576-dc16-f011-82d3-f3203e068116
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
    Script Name:    LibCreateApplicationReviewPage
    Customer:       WADNR
    Purpose:        Create the application review page
    Preconditions:
                    -GetFPANNumberAndDateOfReceipt Library
                    -LibGetApplicationReviewPageRelatedData Library
    Parameters:
                    The following represent variables passed into the function:
                    formId: FormID of the application
                    region: Region of the application
                    projectName: Project Name of the application
                    formType: Form Type of the application
                    q3Fpan: Q3 of FPAN (Only if original application is FPAN)
                    updateClientSide: Flag to update client side
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code:
                    1° Create Application Review Page
                    2° Relate the original application to the application review page
                    3° Generate received date and fpan number
                    4° Call library LibGetApplicationReviewPageRelatedData
                    5° Update application review page with the data from the libraries
                    6° If flag == No flagged update original application

    Date of Dev:    04/10/2025
    Last Rev Date:  10/22/2025

    Revision Notes:
                    04/10/2025 - Nicolas Culini:   First Setup of the script.
                    04/15/2025 - Alfredo Scilabra: Replace Form ID param when.
                                    calling LibGetApplicationReviewPageRelatedData.
                                    because FPAN number is not yet saved at this moment.
                    05/05/2025 - Alfredo Scilabra: Update ARP - FPAN Status field to 'FPAN Status'.
                    05/15/2025 - Mauro Rapuano: Project Name not a required field.
                    06/03/2025 - Moises Savelli: Add userID field to the form creation.
                    09/04/2025 - Mauro Rapuano: Add flags to indicate if there is no LTA-1 or Renewal submitted form.
                    10/22/2025 - Alfredo Scilabra: Add suppor for copying contact information
                    02/19/2026 - Sebastian Rolando: Add logic to convert Region to Full Name and store that value to the created ARP. Update FPAN Date of Receipt to be calculated Receive Date
    */

    logger.info(`Start of the process LibCreateApplicationReviewPage at ${Date()}`);

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

    function createApplicationReview(applicationType, projectName, region, userID, formId, statusFieldName) {
        const shortDescription = `Post form Application Review Page`;
        const newRecordData = {
            // You can convert these values or this object to arguments of this function
            'Application Type': applicationType,
            'Project Name': projectName,
            Region: region,
            'Related Record ID': formId,
            'FPAN Status': 'Submitted',
            UserID: userID,
            'No LTA Step 1 submitted form': applicationType === 'LTA-1' ? 'False' : 'True',
            'No Renewal submitted form': 'True', // Always true as Renewal is always linked to a FPAN (and updates an existing ARP)
        };

        newRecordData[statusFieldName] = new Date();

        if (applicationType === 'LTA-1') {
            newRecordData['LTA Step 1 Status'] = 'Submitted';
        }

        return vvClient.forms
            .postForms(null, newRecordData, 'Application Review Page')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getApplicationFormName(formId) {
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

        const normalizedID = formId.replace(/\s+/g, ''); // Remove spaces

        for (const { prefix, name } of templateNames) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    function getApplicationType(applicationName, q3Fpan) {
        if (applicationName === 'Forest Practices Application Notification') {
            if (q3Fpan === 'Yes') return 'LTA-2';
            else return 'FPA/N';
        } else if (applicationName === 'Step 1 Long Term FPA') {
            return 'LTA-1';
        } else {
            return 'Aerial';
        }
    }

    function updateForm(
        applicationType,
        applicationGuid,
        fpanNumber,
        receivedDate,
        formTemplateName,
        applicationReviewRelatedData
    ) {
        const shortDescription = `Update form record ${applicationGuid}`;
        let fieldValuesToUpdate = {
            'FPAN Number': fpanNumber,
            'Received Date': receivedDate,
            'FPAN Status': 'Received',
        };

        if (applicationReviewRelatedData) {
            fieldValuesToUpdate = {
                ...fieldValuesToUpdate,
                'Timber Harvest': applicationReviewRelatedData['timberHarvest'],
                Biomass: applicationReviewRelatedData['biomass'],
                'Rock Pit':
                    applicationReviewRelatedData['rockPitExisting'] + applicationReviewRelatedData['rockPitNew'],
                'Road Construction': applicationReviewRelatedData['roadConstruction'],
                'Road Abandonment': applicationReviewRelatedData['roadAbandonment'],
                'Hydraulic Project': applicationReviewRelatedData['hydraulicProject'],
                'Spoil Deposits': applicationReviewRelatedData['spoilDeposits'],
                'Aerial Spray': applicationReviewRelatedData['aerialSpray'],
                'FPAN Decision Expiration Date': applicationReviewRelatedData['fpanExpirationDate'],
                'FPAN Renewal Status': applicationReviewRelatedData['renewalStatus'],
                'FPAN Renewal Date of Receipt': applicationReviewRelatedData['renewalDateOfReceipt'],
                'LTA Step 1 Status': applicationReviewRelatedData['ltaStatus'],
                'LTA Date of Receipt': applicationReviewRelatedData['ltaDateOfReceipt'],
                'FPAN Date of Receipt': receivedDate,
                'FP Forester': applicationReviewRelatedData['fpForesterPosition'],
                'Contact Person First name': applicationReviewRelatedData.firstName,
                'Contact Person Last Name': applicationReviewRelatedData.lastName,
                'Contact Person Email': applicationReviewRelatedData.email,
                'Contact Person Phone': applicationReviewRelatedData.phone,
            };
        }

        if (applicationType === 'LTA-1') {
            fieldValuesToUpdate['LTA Step 1 Status'] = 'Received';
        }

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, applicationGuid)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
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

    function convertRegionToFullName(value) {
        switch (value.toLowerCase()) {
            case 'northeast':
            case 'ne':
                return 'Northeast';
            case 'northwest':
            case 'nw':
                return 'Northwest';
            case 'olympic':
            case 'ol':
                return 'Olympic';
            case 'pacific cascade':
            case 'pc':
                return 'Pacific Cascade';
            case 'south puget sound':
            case 'sp':
                return 'South Puget Sound';
            case 'southeast':
            case 'se':
                return 'Southeast';
            default:
                return '';
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const formId = getFieldValueByName('Form ID');
        const region = getFieldValueByName('Region');
        const projectName = getFieldValueByName('Project Name', true);
        const formType = getFieldValueByName('Form Type');
        const q3Fpan = getFieldValueByName('Long Term Application');
        const updateClientSide = getFieldValueByName('Update Client Side');
        const userID = getFieldValueByName('UserID', true);

        const firstName = getFieldValueByName('First Name', true);
        const lastName = getFieldValueByName('Last Name', true);
        const email = getFieldValueByName('Email', true);
        const phone = getFieldValueByName('Phone', true);

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT

        if (!formId || !region || !formType) {
            throw new Error(errorLog.join('; '));
        }

        const applicationName = getApplicationFormName(formId);
        const applicationType = getApplicationType(applicationName, q3Fpan);

        let statusFieldName = 'FPAN Status Updated At';
        switch (applicationType) {
            case 'Aerial':
                statusFieldName = 'Aerial Chemical Status Updated At';
                break;
            case 'LTA-1':
                statusFieldName = 'LTAStep1 Status Updated At';
                break;
        }

        // Format Region to Full Name if it is necessary
        const regionFullName = convertRegionToFullName(region);

        let applicationReviewData = await createApplicationReview(
            applicationType,
            projectName,
            regionFullName,
            userID,
            formId,
            statusFieldName
        );

        const [application] = await getRecord(applicationName, formId);
        const applicationGuid = application.revisionId;
        await relateRecords(applicationGuid, applicationReviewData['instanceName']);

        const fpanNumberAndDateOfReceiptParams = [
            {
                name: 'Form ID',
                value: formId,
            },
            {
                name: 'Region',
                value: region,
            },
            {
                name: 'Form Type',
                value: formType,
            },
            {
                name: 'Application Review Page ID',
                value: applicationReviewData['instanceName'],
            },
        ];

        const FPAN_NumberAndReceivedDate = await runWebService(
            'GetFPANNumberAndDateOfReceipt',
            fpanNumberAndDateOfReceiptParams
        );

        await updateForm(
            applicationType,
            applicationReviewData['revisionId'],
            FPAN_NumberAndReceivedDate['FPAN_Number'],
            FPAN_NumberAndReceivedDate['DateOfReceipt'],
            'Application Review Page'
        );

        const applicationReviewPageRelatedDataParams = [
            {
                name: 'FPAN Number',
                value: FPAN_NumberAndReceivedDate['FPAN_Number'],
            },
            {
                name: 'Type',
                value: applicationType,
            },
            {
                name: 'Form ID',
                value: formId,
            },
        ];

        const applicationReviewRelatedData = await runWebService(
            'LibGetApplicationReviewPageRelatedData',
            applicationReviewPageRelatedDataParams
        );

        const contactInformation = getContactPerson(application, applicationName);

        applicationReviewData = await updateForm(
            applicationType,
            applicationReviewData['revisionId'],
            FPAN_NumberAndReceivedDate['FPAN_Number'],
            FPAN_NumberAndReceivedDate['DateOfReceipt'],
            'Application Review Page',
            {
                ...applicationReviewRelatedData,
                ...contactInformation,
            }
        );

        if (updateClientSide === 'No') {
            await updateForm(
                applicationType,
                applicationGuid,
                FPAN_NumberAndReceivedDate['FPAN_Number'],
                FPAN_NumberAndReceivedDate['DateOfReceipt'],
                applicationName
            );
        }

        const returnObj = {
            ...FPAN_NumberAndReceivedDate,
            'Application Review ID': applicationReviewData['instanceName'],
            'Application Review GUID': applicationReviewData['revisionId'],
        };

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'Successfully Created Application Review Page';
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
