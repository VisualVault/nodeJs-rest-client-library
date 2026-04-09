/**
 * LoadDataFromTheARPForNTC
 * Category: Workflow
 * Modified: 2026-01-26T16:49:33.817Z by santiago.tortu@visualvault.com
 * Script ID: Script Id: aa79b9f0-65f8-f011-8310-8753254bb957
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
    Script Name:    LoadDataFromTheARPForNTC
    Customer:       WADNR
    Purpose:        Use Related Record ID or FPAN Number from NTC to get ARP form data, create Contact Information Relation records,
                    create Legal Description records, and get Compliance Officer data from Position Management
    Preconditions:
                    - 
    Parameters:     The following represent variables passed into the function:
                    requestObject:
                        - Related Record ID: Related Record ID from NTC (required, or use FPAN Number instead)
                        - FPAN Number: FPAN Number from NTC (optional, can use Related Record ID instead)
                        - Form ID: NTC Form ID (required)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1. Get the values of the fields
                    2. Validate that required parameters are provided
                    3. Get ARP data
                    4. Get Position Management data for Compliance Officer (from FP Forester)
                    5. Get ContactInformationRelation records
                    6. Obtain related ContactInformationRelation records to avoid duplicates
                        6.1 Filter out ContactInformationRelation duplicates
                    7. Create the 'Contact Information' for the NTC form
                        7.1 Get all unique Contact Information/Business GUIDs in parallel
                        7.2 Create all Contact Information Relation records in parallel
                        7.3 Create all relationship operations in parallel
                    8. Create 'Legal Descriptions' for NTC form and relate them
                        8.1 Create Legal Description records and capture results
                        8.2 Create relationships for Legal Description records
                    9. Build the success response array
     
    Date of Dev:    01/23/2026
    Last Rev Date:  01/26/2026
     
    Revision Notes:
                    01/23/2026 - Santiago Tortu: Initial setup for NTC data loading from ARP
                    01/26/2026 - Santiago Tortu: Updated to return Region Code instead of Region Name
    */

    logger.info(`Start of the process LoadDataFromTheARPForNTC at ${Date()}`);

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

    const arpTemplateName = 'Application Review Page';
    const contactInfoRelationTemplateName = 'Contact Information Relation';
    const legalDescriptionTemplateName = 'Legal Description';
    const positionManagementTemplateName = 'Position Management';

    const filterByFpanNumber = 'FPAN Number';
    const filterByFormId = 'Form ID';

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
            ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkData(), make sure to pass the same param as well.
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

    function getNonDuplicatedRecords(toCreateRecords, existingRecords, generateKeyFunction) {
        const existingKeys = new Set(existingRecords.map(generateKeyFunction));

        // Filter to CreateRecords to only include new (non-duplicate) entries
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

    async function getRegionCode(regionName) {
        /*
      Get Region Code from Region Name by querying the Region template
      Parameters:
        regionName: The region name (e.g., "Olympic", "Northeast") or region code
      Returns:
        The region code (e.g., "OL", "NE") or the original value if no match found
    */
        if (!regionName || regionName === 'Select Item') {
            return regionName;
        }

        const trimmedName = regionName.trim();
        const regionTemplateName = 'Region';

        try {
            const shortDescription = `Get Region Code for ${trimmedName}`;
            const getRegionParams = {
                q: `[Region Name] eq '${trimmedName}' AND [Status] eq 'Enabled'`,
                fields: 'region Code, region Name',
            };

            const regionRes = await vvClient.forms
                .getForms(getRegionParams, regionTemplateName)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription));

            // If found by Region Name, return the Region Code
            if (regionRes.data && regionRes.data.length > 0) {
                const regionCode = regionRes.data[0]['region Code'];
                return regionCode || trimmedName;
            }

            // If not found by name, check if it's already a code
            const getRegionByCodeParams = {
                q: `[Region Code] eq '${trimmedName}' AND [Status] eq 'Enabled'`,
                fields: 'region Code',
            };

            const regionByCodeRes = await vvClient.forms
                .getForms(getRegionByCodeParams, regionTemplateName)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription));

            if (regionByCodeRes.data && regionByCodeRes.data.length > 0) {
                // It's already a code, return as is
                return trimmedName;
            }

            // If no match found, return original value
            logger.info(`Region Code not found for: ${trimmedName}, returning original value`);
            return trimmedName;
        } catch (error) {
            // If query fails, log and return original value
            logger.info(`Error getting Region Code for ${trimmedName}: ${error.message || error}`);
            return trimmedName;
        }
    }

    async function getARPData(filterValue, filterBy) {
        const shortDescription = `Get ARPform data by ${filterBy}`;

        const getARPFormParams = {
            q: `[${filterBy}] eq '${filterValue}'`,
            fields: 'FPAN Number, Region, FP Forester, Related Record ID, FPAN Classification',
        };

        const getARPFormRes = await vvClient.forms
            .getForms(getARPFormParams, arpTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);

        // Convert Region Name to Region Code for the dropdown by querying Region template
        const regionName = getARPFormRes['region'];
        const regionCode = await getRegionCode(regionName);

        const arpData = {
            fpanNumber: getARPFormRes['fpaN Number'],
            fpForester: getARPFormRes['fP Forester'],
            recordID: getARPFormRes['instanceName'],
            region: regionCode,
            relatedRecordID: getARPFormRes['related Record ID'],
            fpanClassification: getARPFormRes['fpaN Classification'],
        };

        return arpData;
    }

    async function getPositionManagementData(fpForesterValue) {
        /*
        Get Position Management data for Compliance Officer
        Parameters:
            fpForesterValue: The FP Forester value from ARP (can be instanceName/Top Form ID, DhDocID, or "Position No - Last Name")
        Returns:
            Object with compliance officer data (name, title, positionNumber)
    */
        const trimmedValue = fpForesterValue ? fpForesterValue.trim() : '';

        if (!trimmedValue || trimmedValue === '' || trimmedValue === 'Select Item') {
            return {
                name: '',
                title: '',
                positionNumber: '',
            };
        }

        try {
            // FP Forester may come in format "Position No - Last Name", extract just the Position No/instanceName part
            let searchValue = trimmedValue;

            if (searchValue.includes(' - ')) {
                // Extract the part before " - " (e.g., "12345 - Smith" -> "12345")
                searchValue = searchValue.split(' - ')[0].trim();
            }

            const shortDescription = `Get Position Management data for ${searchValue}`;
            // Try instanceName first (Top Form ID), as FP Forester typically stores the instanceName
            let getPositionManagementParams = {
                q: `[instanceName] eq '${searchValue}'`,
                fields: 'First Name, Last Name, PositionManagementTitle, Position No',
            };

            let positionManagementRes = await vvClient.forms
                .getForms(getPositionManagementParams, positionManagementTemplateName)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription, 404)) // Allow 404 if not found
                .then((res) => checkDataPropertyExists(res, shortDescription, 404))
                .then((res) => {
                    if (res.meta.status === 404 || !res.data || res.data.length === 0) {
                        return null;
                    }
                    return res.data[0];
                });

            // If not found by instanceName, try Position No as fallback
            if (!positionManagementRes) {
                getPositionManagementParams = {
                    q: `[Position No] eq '${searchValue}'`,
                    fields: 'First Name, Last Name, PositionManagementTitle, Position No',
                };

                positionManagementRes = await vvClient.forms
                    .getForms(getPositionManagementParams, positionManagementTemplateName)
                    .then((res) => parseRes(res))
                    .then((res) => checkMetaAndStatus(res, shortDescription, 404))
                    .then((res) => checkDataPropertyExists(res, shortDescription, 404))
                    .then((res) => {
                        if (res.meta.status === 404 || !res.data || res.data.length === 0) {
                            return null;
                        }
                        return res.data[0];
                    });
            }

            // If still not found, try DhDocID as last fallback
            if (!positionManagementRes) {
                getPositionManagementParams = {
                    q: `[DhDocID] eq '${searchValue}'`,
                    fields: 'First Name, Last Name, PositionManagementTitle, Position No',
                };

                positionManagementRes = await vvClient.forms
                    .getForms(getPositionManagementParams, positionManagementTemplateName)
                    .then((res) => parseRes(res))
                    .then((res) => checkMetaAndStatus(res, shortDescription, 404))
                    .then((res) => checkDataPropertyExists(res, shortDescription, 404))
                    .then((res) => {
                        if (res.meta.status === 404 || !res.data || res.data.length === 0) {
                            return null;
                        }
                        return res.data[0];
                    });
            }

            if (!positionManagementRes) {
                return {
                    name: '',
                    title: '',
                    positionNumber: '',
                };
            }

            const firstName = positionManagementRes['first Name'] || '';
            const lastName = positionManagementRes['last Name'] || '';
            const fullName = `${firstName} ${lastName}`.trim();

            const result = {
                name: fullName,
                title: positionManagementRes['positionManagementTitle'] || '',
                positionNumber: positionManagementRes['position No'] || '',
            };

            return result;
        } catch (error) {
            errorLog.push(`Error getting Position Management data: ${error.message || error}`);
            return {
                name: '',
                title: '',
                positionNumber: '',
            };
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. Get the values of the fields
        const fpanNumber = getFieldValueByName('FPAN Number');
        const relatedRecordId = getFieldValueByName('Related Record ID'); //APPLICATION-REVIEW-00000123
        const ntcFormId = getFieldValueByName('Form ID'); //NTC-000123

        // 2. Validate that required parameters are provided
        if (!fpanNumber && !relatedRecordId) {
            throw new Error("Either 'FPAN Number' or 'Related Record ID' must be provided.");
        }

        if (!ntcFormId) {
            throw new Error("'Form ID' must be provided.");
        }

        // 3. Get ARP data
        let arpFormData = {};
        let arpRecordID = '';
        let applicationFormID = '';

        if (relatedRecordId) {
            // Get ARP by 'Related Record ID'
            arpFormData = await getARPData(relatedRecordId, filterByFormId);
            arpRecordID = relatedRecordId;
            applicationFormID = arpFormData.relatedRecordID;
        } else if (fpanNumber) {
            // Get ARP by 'FPAN Number'
            const firstFpanNumber = fpanNumber.split(',')[0].trim();

            arpFormData = await getARPData(firstFpanNumber, filterByFpanNumber);
            arpRecordID = arpFormData.recordID;
            applicationFormID = arpFormData.relatedRecordID;
        }

        // 4. Get Position Management data for Compliance Officer
        let complianceOfficerData = {
            name: '',
            title: '',
            positionNumber: '',
        };

        const fpForesterValue = arpFormData.fpForester ? arpFormData.fpForester.trim() : '';

        // Only attempt lookup if FP Forester exists and is not "Select Item" (default dropdown value)
        if (fpForesterValue && fpForesterValue !== '' && fpForesterValue !== 'Select Item') {
            complianceOfficerData = await getPositionManagementData(fpForesterValue);
        }

        // 5. Get ContactInformationRelation records
        const contactInformationRes = await getRecordsByRelatedRecordID(arpRecordID, contactInfoRelationTemplateName);

        // 6. Obtain related ContactInformationRelation records to avoid duplicates
        const childContactInformationRelationRecords = await getRecordsByRelatedRecordID(
            ntcFormId,
            contactInfoRelationTemplateName
        );

        // 6.1 Filter out ContactInformationRelation duplicates
        const uniqueContactInformationRes = getNonDuplicatedRecords(
            contactInformationRes,
            childContactInformationRelationRecords,
            (item) => CONTACT_INFO_RELATION_KEYS.map((key) => item[key]).join('|')
        );

        // 7. Create the 'Contact Information' for the NTC form
        //    and create new 'Contact Information Relation' records for (Landowners,Timber Owners,Operators)

        // 7.1 Get all unique Contact Information/Business GUIDs in parallel
        const uniqueContactInfoIDs = [
            ...new Set(uniqueContactInformationRes.map((item) => item['contact Information ID'])),
        ];
        const contactInfoGUIDsMap = new Map();

        await Promise.allSettled(
            uniqueContactInfoIDs.map(async (contactInfoID) => {
                const contactInformationTemplateName = contactInfoID.includes('Business')
                    ? 'Business'
                    : 'Contact Information';
                try {
                    const guid = await getRecordGUID(contactInformationTemplateName, contactInfoID);
                    contactInfoGUIDsMap.set(contactInfoID, guid);
                } catch (error) {
                    errorLog.push(`Error getting GUID for ${contactInfoID}: ${error.message || error}`);
                }
            })
        );

        // 7.2 Create all Contact Information Relation records in parallel
        const createRecordPromises = uniqueContactInformationRes.map(async (item) => {
            const newRecordData = {
                'business ID': item['business ID'],
                'contact Information ID': item['contact Information ID'],
                'contact Person': item['contact Person'],
                landowner: item['landowner'],
                operator: item['operator'],
                other: item['other'],
                'related Record ID': ntcFormId,
                'relation Type': item['relation Type'],
                status: item['status'],
                surveyor: item['surveyor'],
                'timber Owner': item['timber Owner'],
                title: item['title'],
                'Business Signer': item['business Signer'],
            };

            try {
                const postFormData = await createRecord(newRecordData, contactInfoRelationTemplateName);
                return { item, postFormData };
            } catch (error) {
                errorLog.push(`Error creating ${contactInfoRelationTemplateName} record: ${error.message || error}`);
                return null;
            }
        });

        const createRecordResults = await Promise.allSettled(createRecordPromises);
        const successfulRecords = createRecordResults
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => result.value);

        // 7.3 Create all relationship operations in parallel
        const childGUID = await getRecordGUID('Notice to Comply', ntcFormId);

        const relationshipPromises = successfulRecords.flatMap(({ item, postFormData }) => {
            const contactInfoGUID = contactInfoGUIDsMap.get(item['contact Information ID']);
            const relationships = [];

            // Relate the NTC form to the Contact Information record
            if (item['contact Information ID']) {
                relationships.push(
                    relateRecords(childGUID, item['contact Information ID']).catch((error) => {
                        errorLog.push(`Error relating NTC to Contact Information: ${error.message || error}`);
                    })
                );
            }

            // Relate the NTC form to the new Contact Information Relation record
            if (postFormData && postFormData['instanceName']) {
                relationships.push(
                    relateRecords(childGUID, postFormData['instanceName']).catch((error) => {
                        errorLog.push(
                            `Error relating NTC to ${contactInfoRelationTemplateName}: ${error.message || error}`
                        );
                    })
                );
            }

            // Relate the Contact Information/Business record to the new Contact Information Relation record
            if (contactInfoGUID && postFormData && postFormData['instanceName']) {
                relationships.push(
                    relateRecords(contactInfoGUID, postFormData['instanceName']).catch((error) => {
                        errorLog.push(
                            `Error relating Contact Information to ${contactInfoRelationTemplateName}: ${
                                error.message || error
                            }`
                        );
                    })
                );
            }

            return relationships;
        });

        await Promise.allSettled(relationshipPromises);

        // 8. Create 'Legal Descriptions' for NTC form and relate them
        const legalDescriptionRecords = await getRecordsByRelatedRecordID(
            applicationFormID,
            legalDescriptionTemplateName
        );

        // 8.1 Create Legal Description records and capture results
        const createLegalDescPromises = legalDescriptionRecords.map(async (item) => {
            try {
                const postFormData = await createRecord(
                    {
                        section: item['section'],
                        township: item['township'],
                        county: item['county'],
                        range: item['range'],
                        status: item['status'],
                        'related Record ID': ntcFormId,
                        'range Direction': item['range Direction'],
                        'tax Parcel Number': item['tax Parcel Number'],
                        'unit Number': item['unit Number'],
                        acres: item['acres'],
                        'parent Context': item['parent Context'],
                    },
                    legalDescriptionTemplateName
                );
                return postFormData;
            } catch (error) {
                errorLog.push(`Error creating ${legalDescriptionTemplateName} record: ${error.message || error}`);
                return null;
            }
        });

        const legalDescResults = await Promise.allSettled(createLegalDescPromises);
        const successfulLegalDescs = legalDescResults
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => result.value);

        // 8.2 Create relationships for Legal Description records
        const legalDescRelationshipPromises = successfulLegalDescs.map(async (postFormData) => {
            if (postFormData && postFormData['instanceName']) {
                try {
                    await relateRecords(childGUID, postFormData['instanceName']);
                } catch (error) {
                    errorLog.push(`Error relating NTC to ${legalDescriptionTemplateName}: ${error.message || error}`);
                }
            }
        });

        await Promise.allSettled(legalDescRelationshipPromises);

        // 9. Build the success response array
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'ARP data retrieved successfully. New relationships built with NTC form successfully.';
        outputCollection[2] = {
            results: {
                region: arpFormData.region,
                fpForester: arpFormData.fpForester,
                fpanNumber: arpFormData.fpanNumber,
                fpanClassification: arpFormData.fpanClassification,
                complianceOfficerName: complianceOfficerData.name,
                complianceOfficerTitle: complianceOfficerData.title,
                complianceOfficerPositionNumber: complianceOfficerData.positionNumber,
            },
        };
    } catch (error) {
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
