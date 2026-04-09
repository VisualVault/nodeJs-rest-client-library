/**
 * LibFPANGetRelatedData
 * Category: Form
 * Modified: 2026-03-30T19:57:37.233Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 9a7d8e15-e5f9-ef11-82c4-953deda8420a
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
    Script Name:    LibFPANGetRelatedData
    Customer:       WADNR
    Purpose:        Use Related Record ID from FPAN-related forms to relate contact information to child forms
    Preconditions:
    Parameters:     The following represent variables passed into the function:
                    requestObject:
                        - relatedRecordID: ID of parent FPAN/FPAN-related form
                        - Form ID: ID of child FPAN/FPAN-related form
                        - recordType: type of child FPAN/FPAN-related form (e.g. Forest Practices Aerial Chemical Application)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1° GET THE VALUES OF THE FIELDS
                    2° GET THE APPROVED FPAN FORM DATA
                    3° GET THE CONTACT INFORMATION RELATION AND LEGAL DESCRIPTION RECORDS
                    4° BUILD THE NEW CONTACT INFORMATION RELATIONSHIPS TO THE CHILD FORM
                    5° BUILD THE NEW LEGAL DESCRIPTION RELATIONSHIPS TO THE CHILD FORM
                    6° BUILD THE OUTPUT COLLECTION

    Date of Dev:    03/05/2025
    Last Rev Date:  03/31/2026

    Revision Notes:
                    03/05/2025 - Austin Stone:  First Setup of the script
                    03/12/2025 - Mauro Rapuano: Add hidden field 'Title' while creating 'Contact Information Relation' copies
                    04/23/2025 - Alfredo Scilabra: Update detectFormTemplateFromID function
                    05/23/2025 - Alfredo Scilabra: Refactor lib to prevent duplicate creation
                    05/29/2025 - Alfredo Scilabra: Add validation to set Original Contacts info for NOT
                    09/17/2025 - Matías Andrade: Add NCNU to record types
                    09/25/2025 - Lucas Herrera: added 'FPAN Classification' and 'FP Forester' to the FPANHeaderData
                    02/18/2026 - Zharich Barona: Put Expiration Date on the output to FPAN Renewal.
                    02/25/2026 - Alfredo Scilabra: Rename Multi-pupose prefix
                    03/31/2026 - Alfredo Scilabra: Fix form originator for legal desc records
    */

    logger.info(`Start of the process LibFPANGetRelatedData at ${Date()}`);

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

    const BASE_RECORD_TYPES = [
        'Application Review Page',
        'Forest Practices Application Notification',
        'Forest Practices Aerial Chemical Application',
        'Step 1 Long Term FPA',
    ];
    const CHANGE_RECORD_TYPES = [
        'FPAN Amendment Request',
        'FPAN Notice of Transfer',
        'FPAN Renewal',
        'Notice to Comply',
    ];

    const CONTACT_INFO_RELATION_KEYS = [
        'relation Type',
        'landowner',
        'timber Owner',
        'operator',
        'contact Person',
        'surveyor',
        'other',
        'contact Information ID',
        'status',
        'business ID',
        'title',
    ];

    const LEGAL_DESCRIPTION_KEYS = [
        'section',
        'township',
        'county',
        'range',
        'status',
        'range Direction',
        'tax Parcel Number',
        'unit Number',
        'acres',
        'parent Context',
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

    function popLatestFPANData(FPANData) {
        if (FPANData.length === 0) {
            throw new Error('No records found with the corresponding FPAN ID.');
        }

        // Find the latest item based on createDate
        const latestIndex = FPANData.reduce(
            (latestIdx, item, idx, arr) => (arr[latestIdx]['createDate'] > item['createDate'] ? latestIdx : idx),
            0
        );

        // Remove and return the latest item
        const latestItem = FPANData.splice(latestIndex, 1)[0];

        return {
            instanceName: latestItem['instanceName'],
            recordType: latestItem['recordType'],
            projectName: latestItem['project Name'],
            region: latestItem['region'],
            fpanClassification: latestItem['FPAN Classification'],
            fpForester: latestItem['FP Forester'],
            expirationDate: latestItem['Expiration Date'],
        };
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', 'Step 1 Long Term FPA'],
            ['FPA-AERIAL-CHEMICAL', 'Forest Practices Aerial Chemical Application'],
            ['APPLICATION-REVIEW', 'Application Review Page'],
            ['FPAN-AMENDMENT', 'FPAN Amendment Request'],
            ['FPAN-RENEWAL', 'FPAN Renewal'],
            ['FPAN-T', 'FPAN Notice of Transfer'],
            ['LT-5DN', 'Long-Term Application 5-Day Notice'],
            ['FPAN', 'Forest Practices Application Notification'],
            ['NCNU', 'Notice of Conversion to Non Forestry Use'],
            ['NTC', 'Notice to Comply'],
            ['MPF', 'Multi-purpose'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        throw new Error('Form template name not found.');
    }

    function getRecordGUID(formTemplateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const getParentFormParams = {
            q: `[instanceName] eq '${recordID}'`,
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

    function getRecordsByRelatedRecordID(relatedRecordID, templateName) {
        const shortDescription = `Get form ${relatedRecordID}`;
        const getFormsParams = {
            q: `[Related Record ID] eq '${relatedRecordID}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function getFpanAprovedData(relatedRecordID) {
        const shortDescription = 'Get approved FPAN form data';
        const result = [];

        const getFPANFormParamsBase = {
            q: `[FPAN Number] eq '${relatedRecordID}' AND [Status] ne 'Draft'`,
            fields: 'FPAN Number, Region, Project Name, FPAN Classification, FP Forester, FPAN Decision Expiration Date, CreateDate',
        };
        const getFPANFormParamsChange = {
            q: `[FPAN Number] eq '${relatedRecordID}' AND [Status] eq 'Approved'`,
            fields: 'FPAN Number, Region, Project Name, FPAN Classification, FP Forester, FPAN Decision Expiration Date, CreateDate',
        };

        for (const recordType of [...BASE_RECORD_TYPES, ...CHANGE_RECORD_TYPES]) {
            const getFPANFormParams = BASE_RECORD_TYPES.includes(recordType)
                ? getFPANFormParamsBase
                : getFPANFormParamsChange;

            const getFPANFormRes = await vvClient.forms
                .getForms(getFPANFormParams, recordType)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => res.data);

            getFPANFormRes.forEach((item) => {
                result.push({
                    createDate: item['createDate'],
                    instanceName: item['instanceName'],
                    recordType: recordType,
                    region: item['region'],
                    'project Name': item['project Name'],
                    'FPAN Classification': item['fpaN Classification'],
                    'FP Forester': item['fP Forester'],
                    'Expiration Date': item['fpaN Decision Expiration Date'],
                });
            });
        }
        return result;
    }

    async function getRecordsFromFpan(FPANData) {
        let contactInformationRes = [];
        let legalDescriptionRes = [];
        const FPANHeaderData = {
            Region: '',
            'Project Name': '',
            'FPAN Classification': '',
            'FP Forester': '',
            'Expiration Date': '',
        };

        // Iterate over the retrieved FPAN forms in anti-chronological order to
        // retrieve most up to date information
        while (
            (contactInformationRes.length == 0 ||
                legalDescriptionRes.length == 0 ||
                !FPANHeaderData['Region'] ||
                !FPANHeaderData['Project Name']) &&
            FPANData.length > 0
        ) {
            const { instanceName, projectName, region, fpanClassification, fpForester, expirationDate } =
                popLatestFPANData(FPANData);

            if (!FPANHeaderData['Region']) {
                FPANHeaderData['Region'] = region;
            }
            if (!FPANHeaderData['Project Name']) {
                FPANHeaderData['Project Name'] = projectName;
            }
            if (!FPANHeaderData['Expiration Date']) {
                FPANHeaderData['Expiration Date'] = expirationDate;
            }

            fpanClassification &&
                !FPANHeaderData['FPAN Classification'] &&
                (FPANHeaderData['FPAN Classification'] = fpanClassification);
            fpForester && !FPANHeaderData['FP Forester'] && (FPANHeaderData['FP Forester'] = fpForester);

            if (contactInformationRes.length == 0) {
                contactInformationRes = await getRecordsByRelatedRecordID(instanceName, 'Contact Information Relation');
            }
            if (legalDescriptionRes.length == 0) {
                legalDescriptionRes = await getRecordsByRelatedRecordID(instanceName, 'Legal Description');
            }
        }
        return { contactInformationRes, legalDescriptionRes, FPANHeaderData };
    }

    function getNonDuplicatedRecords(toCreateRecords, existingRecords, generateKeyFunction) {
        const existingKeys = new Set(existingRecords.map(generateKeyFunction));

        // Filter toCreateRecords to only include new (non-duplicate) entries
        return toCreateRecords.filter((record) => {
            const key = generateKeyFunction(record);
            return !existingKeys.has(key);
        });
    }

    function createRecord(newRecordData, formTemplateName) {
        const shortDescription = `Post form ${formTemplateName}`;
        return vvClient.forms
            .postForms(null, newRecordData, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getUserByUserID(userID) {
        const shortDescription = `Get user GUID for user ID: ${userID}`;
        const getUserQuery = {
            q: `[userid] eq '${userID}'`,
            fields: 'id',
        };

        return vvClient.users
            .getUser(getUserQuery)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function updateFormOriginator(newUserId, formId) {
        const shortDescription = `Setting new originator ${newUserId} for ${formId}`;

        return vvClient.forms.updateFormInstanceOriginator(formId, newUserId);
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS
        const relatedRecordID = getFieldValueByName('relatedRecordID');
        const childFormID = getFieldValueByName('Form ID');

        const childTemplateName = detectFormTemplateFromID(childFormID);
        const childGUID = await getRecordGUID(childTemplateName, childFormID);

        const [childRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${childFormID}'`,
                expand: true,
            },
            childTemplateName
        );

        if (!childRecord) {
            throw new Error(`The child record with ID '${childFormID}' was not found.`);
        }

        // 2° GET THE APPROVED FPAN FORM DATA
        const FPANData = await getFpanAprovedData(relatedRecordID);

        // 3° GET THE CONTACT INFORMATION RELATION AND LEGAL DESCRIPTION RECORDS
        const { contactInformationRes, legalDescriptionRes, FPANHeaderData } = await getRecordsFromFpan(FPANData);

        // 4° BUILD THE NEW CONTACT INFORMATION RELATIONSHIPS TO THE CHILD FORM
        // Getting already related Contact Information Relation records to prevent data duplication
        const childContactInformationRelationRecords = await getRecordsByRelatedRecordID(
            childFormID,
            'Contact Information Relation'
        );

        const uniqueContactInformationRes = getNonDuplicatedRecords(
            contactInformationRes,
            childContactInformationRelationRecords,
            (item) => CONTACT_INFO_RELATION_KEYS.map((key) => item[key]).join('|')
        );

        const isChildNoticeOfTransfer = childTemplateName === 'FPAN Notice of Transfer';

        for (const item of uniqueContactInformationRes) {
            const newRecordData = {
                'business ID': item['business ID'],
                'contact Information ID': item['contact Information ID'],
                'contact Person': item['contact Person'],
                landowner: item['landowner'],
                operator: item['operator'],
                other: item['other'],
                'related Record ID': childFormID,
                'relation Type': item['relation Type'],
                status: item['status'],
                surveyor: item['surveyor'],
                'timber Owner': item['timber Owner'],
                title: item['title'],
                'Business Signer': item['business Signer'],
            };

            // If the child form is a Notice of Transfer, keep original IDs
            if (isChildNoticeOfTransfer) {
                newRecordData['Original Contact Checkbox'] = 'True';
                newRecordData['Original Related Contact Form ID'] = item['contact Information ID'];
                newRecordData['Original Contact Information Relation ID'] = item.instanceName;
            }

            const postFormData = await createRecord(newRecordData, 'Contact Information Relation');

            await relateRecords(childGUID, item['contact Information ID']);
            await relateRecords(childGUID, postFormData['instanceName']);
            const contactInformationTemplateName = item['contact Information ID'].includes('Business')
                ? 'Business'
                : 'Contact Information';
            const contactInfoGUID = await getRecordGUID(contactInformationTemplateName, item['contact Information ID']);
            await relateRecords(contactInfoGUID, postFormData['instanceName']);
        }

        // 5° BUILD THE NEW LEGAL DESCRIPTION RELATIONSHIPS TO THE CHILD FORM
        // Getting already related Legal Description records to prevent data duplication
        const childLegalDescriptionRecords = await getRecordsByRelatedRecordID(childFormID, 'Legal Description');

        const uniqueLegalDescriptionRes = getNonDuplicatedRecords(
            legalDescriptionRes,
            childLegalDescriptionRecords,
            (item) => LEGAL_DESCRIPTION_KEYS.map((key) => item[key]).join('|')
        );

        const newLegalDescriptionRecords = await Promise.all(
            uniqueLegalDescriptionRes.map((item) =>
                createRecord(
                    {
                        section: item['section'],
                        township: item['township'],
                        county: item['county'],
                        range: item['range'],
                        status: item['status'],
                        'related Record ID': childFormID,
                        'range Direction': item['range Direction'],
                        'tax Parcel Number': item['tax Parcel Number'],
                        'unit Number': item['unit Number'],
                        acres: item['acres'],
                        'parent Context': item['parent Context'],
                    },
                    'Legal Description'
                )
            )
        );

        //Update legal description originator so the user creating the record is able to open legal desc
        const targetUser = await getUserByUserID(childRecord.modifyBy);
        const targetUserId = targetUser.id;
        for (const newLegalDescription of newLegalDescriptionRecords) {
            await updateFormOriginator(targetUserId, newLegalDescription.revisionId);
        }

        // 6° BUILD THE OUTPUT COLLECTION
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'FPAN data retrieved successfully. New relationships built with child form successfully.';
        outputCollection[2] = FPANHeaderData;
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
