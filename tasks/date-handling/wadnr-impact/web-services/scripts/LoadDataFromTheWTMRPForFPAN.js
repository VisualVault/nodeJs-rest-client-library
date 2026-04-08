/**
 * LoadDataFromTheWTMRPForFPAN
 * Category: Workflow
 * Modified: 2026-02-24T13:09:08.997Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: 24a79192-f310-f111-8309-8c4a16159530
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
    Script Name:    LoadDataFromTheWTMRPForFPAN
    Customer:       WADNR
    Purpose:        Use Related Record ID or FPAN Number from WTM RP to get WTMF form data and create Contact Information Relation records
    Preconditions:
                    - 
    Parameters:     The following represent variables passed into the function:
                    requestObject:
                      - Related Record ID: Related Record ID from FPAN (required, or use WTMF Number instead)
                      - WTMF Number: WTMF Number from WTM RP (optional, can use Related Record ID instead)
                      - Form ID: FPAN Form ID (required)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data
    Pseudo code: 
                    1. Get the values of the fields
                    2. Validate that required parameters are provided
                    3. Get WTMF data
                    4. Get ContactInformationRelation records
                    5. Obtain related ContactInformationRelation records to avoid duplicates
                      5.1 Filter out ContactInformationRelation duplicates
                    6. Create the 'Contact Information' for the ICN form
                      6.1 Get all unique Contact Information/Business GUIDs in parallel
                      6.2 Create all Contact Information Relation records in parallel
                      6.3 Create all relationship operations in parallel
                    7. Create 'Legal Descriptions' for ICN form and relate them
                      7.1 Create Legal Description records and capture results
                      7.2 Create relationships for Legal Description records
                    8. Build the success response array
 
    Date of Dev:    02/23/2025
    Last Rev Date:  02/23/2026
 
    Revision Notes:
                    02/23/2025 - Federico Cuelho: First Setup of the script
    */

    logger.info(`Start of the process LoadDataFromTheWTMRPForFPAN at ${Date()}`);

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

    const wtmrpTemplateName = 'WTM Review Page';
    const fpanTemplateName = 'Forest Practices Application Notification';
    const contactInfoRelationTemplateName = 'Contact Information Relation';
    const legalDescriptionTemplateName = 'Legal Description';

    const filterByWtmfNumber = 'WTMF Number';
    const filterByFormId = 'Form ID';

    const CONTACT_INFO_RELATION_KEYS = [
        'relation Type',
        'landowner',
        'contact Information ID',
        'status',
        'business ID',
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

    async function getWTMRPData(filterValue, filterBy) {
        const shortDescription = `Get WTMRPform data by ${filterBy}`;

        const getWTMRPFormParams = {
            q: `[${filterBy}] eq '${filterValue}'`,
            fields: 'WTMF No, Region, FP Forester, Related Record ID',
        };

        const getWTMRPFormRes = await vvClient.forms
            .getForms(getWTMRPFormParams, wtmrpTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);

        // Convert Region Name to Region Code for the dropdown by querying Region template
        const regionName = getWTMRPFormRes['region'];
        const regionCode = await getRegionCode(regionName);

        return {
            wtmfNumber: getWTMRPFormRes['wtmF No'],
            recordID: getWTMRPFormRes['instanceName'],
            region: regionCode,
            relatedRecordID: getWTMRPFormRes['related Record ID'],
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. Get the values of the fields
        const wtmfNumber = getFieldValueByName('WTMF Number');
        const relatedRecordId = getFieldValueByName('Related Record ID'); //WTMRP-00000123
        const fpanFormId = getFieldValueByName('Form ID'); //FPAN-000123

        // 2. Validate that required parameters are provided
        if (!wtmfNumber && !relatedRecordId) {
            throw new Error("Either 'WTMF Number' or 'Related Record ID' must be provided.");
        }

        if (!fpanFormId) {
            throw new Error("'Form ID' must be provided.");
        }

        // 3. Get WTMRP data
        let wtmrpFormData = {};
        let wtmrpRecordID = '';
        let wtmfFormID = '';

        if (relatedRecordId) {
            // Get WTMRP by 'Related Record ID'
            wtmrpFormData = await getWTMRPData(relatedRecordId, filterByFormId);
            wtmrpRecordID = relatedRecordId;
            wtmfFormID = wtmrpFormData.relatedRecordID;
        } else if (wtmfNumber) {
            // Get WTMRP by 'WTMF Number'
            const firstWtmfNumber = wtmfNumber.split(',')[0].trim();

            wtmrpFormData = await getWTMRPData(firstWtmfNumber, filterByWtmfNumber);
            wtmrpRecordID = wtmrpFormData.recordID;
            wtmfFormID = wtmrpFormData.relatedRecordID;
        }

        // 4. Get ContactInformationRelation records
        const contactInformationRes = await getRecordsByRelatedRecordID(wtmfFormID, contactInfoRelationTemplateName);

        // 5. Obtain related ContactInformationRelation records to avoid duplicates
        const childContactInformationRelationRecords = await getRecordsByRelatedRecordID(
            fpanFormId,
            contactInfoRelationTemplateName
        );

        // 5.1 Filter out ContactInformationRelation duplicates
        const uniqueContactInformationRes = getNonDuplicatedRecords(
            contactInformationRes,
            childContactInformationRelationRecords,
            (item) => CONTACT_INFO_RELATION_KEYS.map((key) => item[key]).join('|')
        );

        // 6. Create the 'Contact Information' for the FPAN form
        //    and create new 'Contact Information Relation' records for (Landowners)

        // 6.1 Get all unique Contact Information/Business GUIDs in parallel
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
                    logger.info(`Error getting GUID for ${contactInfoID}: ${error}`);
                    errorLog.push(`Error getting GUID for ${contactInfoID}: ${error.message || error}`);
                }
            })
        );

        // 6.2 Create all Contact Information Relation records in parallel
        const createRecordPromises = uniqueContactInformationRes.map(async (item) => {
            const newRecordData = {
                'business ID': item['business ID'],
                'contact Information ID': item['contact Information ID'],
                'contact Person': item['contact Person'],
                landowner: item['landowner'],
                other: item['other'],
                'related Record ID': fpanFormId,
                'relation Type': item['relation Type'],
                status: item['status'],
                title: item['title'],
            };

            try {
                const postFormData = await createRecord(newRecordData, contactInfoRelationTemplateName);
                return { item, postFormData };
            } catch (error) {
                logger.info(`Error creating ${contactInfoRelationTemplateName} record: ${error}`);
                errorLog.push(`Error creating ${contactInfoRelationTemplateName} record: ${error.message || error}`);
                return null;
            }
        });

        const createRecordResults = await Promise.allSettled(createRecordPromises);
        const successfulRecords = createRecordResults
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => result.value);

        // 6.3 Create all relationship operations in parallel
        const childGUID = await getRecordGUID(fpanTemplateName, fpanFormId);

        const relationshipPromises = successfulRecords.flatMap(({ item, postFormData }) => {
            const contactInfoGUID = contactInfoGUIDsMap.get(item['contact Information ID']);
            const relationships = [];

            // Relate the FPAN form to the Contact Information record
            if (item['contact Information ID']) {
                relationships.push(
                    relateRecords(childGUID, item['contact Information ID']).catch((error) => {
                        logger.info(
                            `Error relating FPAN to Contact Information ${item['contact Information ID']}: ${error}`
                        );
                        errorLog.push(`Error relating FPAN to Contact Information: ${error.message || error}`);
                    })
                );
            }

            // Relate the FPAN form to the new Contact Information Relation record
            if (postFormData && postFormData['instanceName']) {
                relationships.push(
                    relateRecords(childGUID, postFormData['instanceName']).catch((error) => {
                        logger.info(
                            `Error relating FPAN to ${contactInfoRelationTemplateName} ${postFormData['instanceName']}: ${error}`
                        );
                        errorLog.push(
                            `Error relating FPAN to ${contactInfoRelationTemplateName}: ${error.message || error}`
                        );
                    })
                );
            }

            // Relate the Contact Information/Business record to the new Contact Information Relation record
            if (contactInfoGUID && postFormData && postFormData['instanceName']) {
                relationships.push(
                    relateRecords(contactInfoGUID, postFormData['instanceName']).catch((error) => {
                        logger.info(
                            `Error relating Contact Information to ${contactInfoRelationTemplateName}: ${error}`
                        );
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

        // 7. Create 'Legal Descriptions' for FPAN form and relate them
        const legalDescriptionRecords = await getRecordsByRelatedRecordID(wtmfFormID, legalDescriptionTemplateName);

        // 7.1 Create Legal Description records and capture results
        const createLegalDescPromises = legalDescriptionRecords.map(async (item) => {
            try {
                const postFormData = await createRecord(
                    {
                        section: item['section'],
                        township: item['township'],
                        county: item['county'],
                        range: item['range'],
                        status: item['status'],
                        'related Record ID': fpanFormId,
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
                logger.info(`Error creating ${legalDescriptionTemplateName} record: ${error}`);
                errorLog.push(`Error creating ${legalDescriptionTemplateName} record: ${error.message || error}`);
                return null;
            }
        });

        const legalDescResults = await Promise.allSettled(createLegalDescPromises);
        const successfulLegalDescs = legalDescResults
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => result.value);

        // 7.2 Create relationships for Legal Description records
        const legalDescRelationshipPromises = successfulLegalDescs.map(async (postFormData) => {
            if (postFormData && postFormData['instanceName']) {
                try {
                    await relateRecords(childGUID, postFormData['instanceName']);
                } catch (error) {
                    logger.info(
                        `Error relating FPAN to ${legalDescriptionTemplateName} ${postFormData['instanceName']}: ${error}`
                    );
                    errorLog.push(`Error relating FPAN to ${legalDescriptionTemplateName}: ${error.message || error}`);
                }
            }
        });

        await Promise.allSettled(legalDescRelationshipPromises);

        // 8. Build the success response array
        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = 'WTMRP data retrieved successfully.';
        outputCollection[2] = {
            results: {
                region: wtmrpFormData.region,
                wtmfNumber: wtmrpFormData.wtmfNumber,
            },
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
