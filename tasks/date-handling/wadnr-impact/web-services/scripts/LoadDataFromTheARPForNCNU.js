/**
 * LoadDataFromTheARPForNCNU
 * Category: Workflow
 * Modified: 2026-03-10T19:20:31.887Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 2d3e8aa6-620d-f111-831a-efabe56a60c1
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
    Script Name:    LoadDataFromTheARPForNCNU
    Customer:       WADNR
    Purpose:        Creates NCNU-specific Contact Information Relation records and Legal Description records based on ARP/FPAN data,
                    and builds relationships so DataGrids can remove (disable) records owned by the NCNU form.

    Preconditions:  None
    Parameters:
                    - Form ID: String (NCNU form ID)
                    - Related Record ID: String (ARP form ID) [optional if FPAN Number provided]
                    - FPAN Number: String (FPAN Number) [optional if Related Record ID provided]
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data (optional)
    Pseudo code:
                    1. Get and validate parameters
                    2. Get ARP record by Related Record ID or FPAN Number
                    3. Resolve the FPAN form ID from FPAN Number
                    4. Get Contact Information Relation records from FPAN and de-duplicate against NCNU existing
                    5. Create Contact Information Relation records for NCNU and build relationships
                    6. Get Legal Description records from Application record and de-duplicate against NCNU existing
                    7. Create Legal Description records for NCNU and build relationships
                    8. Return success response

    Date of Dev:    02/19/2026
    Last Rev Date:  02/20/2026

    Revision Notes:
                    02/19/2026 - Matias Andrade: Initial setup.
                    02/20/2026 - Matias Andrade: Source Contact Information Relation records from FPAN (not ARP), filter Disabled, and improve de-duplication.
  */

    logger.info(`Start of the process LoadDataFromTheARPForNCNU at ${Date()}`);

    let outputCollection = [];
    let errorLog = [];

    const arpTemplateName = 'Application Review Page';
    const fpanTemplateName = 'Forest Practices Application Notification';
    const contactInfoRelationTemplateName = 'Contact Information Relation';
    const legalDescriptionTemplateName = 'Legal Description';
    const positionManagementTemplateName = 'Position Management';
    const regionTemplateName = 'Region';

    const filterByFpanNumber = 'FPAN Number';
    const filterByFormId = 'Form ID';

    const ncnuTemplateName = 'Notice of Conversion to Non Forestry Use';

    const CONTACT_INFO_RELATION_KEYS = [
        'relation Type',
        'landowner',
        'timber Owner',
        'operator',
        'contact Person',
        'surveyor',
        'other',
        'contact Information ID',
        'business ID',
        'title',
        'business Signer',
    ];

    function getFieldValueByName(fieldName, isOptional = false) {
        let fieldValue = '';
        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldMissing = !isOptional && !field;
            if (requiredFieldMissing) throw new Error(`The field '${fieldName}' was not found.`);
            if (field) {
                fieldValue = 'value' in field ? field.value : fieldValue;
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
                const requiredHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;
                const ddSelectItem = fieldValue === 'Select Item';
                if (requiredHasNoValue || ddSelectItem) {
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
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') vvClientRes = jsObject;
        } catch (e) {}
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(`${shortDescription} error. No meta object found in response.`);
        }
        const status = vvClientRes.meta.status;
        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason =
                vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                    ? vvClientRes.meta.errors[0].reason
                    : 'unspecified';
            throw new Error(`${shortDescription} error. Status: ${status}. Reason: ${errorReason}`);
        }
        return vvClientRes;
    }

    function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode && !vvClientRes.data) {
            throw new Error(`${shortDescription} data property was not present. Status: ${status}.`);
        }
        return vvClientRes;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;
            if (isEmptyArray || isEmptyObject) {
                throw new Error(`${shortDescription} returned no data. Status: ${status}.`);
            }
            if (dataIsArray && vvClientRes.data[0] == 'Error') {
                throw new Error(`${shortDescription} returned an error. Status Description: ${vvClientRes.data[1]}.`);
            }
        }
        return vvClientRes;
    }

    function getRecordGUID(formTemplateName, recordID) {
        const shortDescription = `GetForm ${recordID}`;
        const params = { q: `[instanceName] eq '${recordID}'`, fields: 'revisionId' };
        return vvClient.forms
            .getForms(params, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0].revisionId);
    }

    function relateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `Relate forms ${parentRecordGUID} -> ${childRecordID}`;
        const ignoreStatusCode = '404';
        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    function getRecordsByRelatedRecordID(relatedRecordID, templateName) {
        const shortDescription = `Get forms for ${relatedRecordID}`;
        const params = { q: `[Related Record ID] eq '${relatedRecordID}'`, expand: true };
        return vvClient.forms
            .getForms(params, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getNonDuplicatedRecords(toCreateRecords, existingRecords, generateKeyFunction) {
        const existingKeys = new Set(existingRecords.map(generateKeyFunction));
        return toCreateRecords.filter((record) => !existingKeys.has(generateKeyFunction(record)));
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

    async function getARPData(filterValue, filterBy) {
        const shortDescription = `Get ARP form data by ${filterBy}`;
        const params = {
            q: `[${filterBy}] eq '${filterValue}'`,
            fields: 'FPAN Number, Region, Related Record ID, FPAN Classification, FP Forester',
        };

        const res = await vvClient.forms
            .getForms(params, arpTemplateName)
            .then((r) => parseRes(r))
            .then((r) => checkMetaAndStatus(r, shortDescription))
            .then((r) => checkDataPropertyExists(r, shortDescription))
            .then((r) => checkDataIsNotEmpty(r, shortDescription))
            .then((r) => r.data[0]);

        return {
            fpanNumber: res['fpaN Number'],
            recordID: res['instanceName'],
            relatedRecordID: res['related Record ID'],
            region: res['region'],
            fpanClassification: res['fpaN Classification'],
            fpForester: res['fP Forester'],
        };
    }

    async function getPositionManagementData(fpForesterValue) {
        /*
      Get Position Management data for Compliance Officer
      Parameters:
        fpForesterValue: The FP Forester value from ARP (can be instanceName/Top Form ID, DhDocID, or "Position No - Last Name")
      Returns:
        Object with compliance officer data (name, title)
    */
        const trimmedValue = fpForesterValue ? fpForesterValue.trim() : '';

        if (!trimmedValue || trimmedValue === '' || trimmedValue === 'Select Item') {
            return { name: '', title: '' };
        }

        try {
            let searchValue = trimmedValue;

            if (searchValue.includes(' - ')) {
                searchValue = searchValue.split(' - ')[0].trim();
            }

            const shortDescription = `Get Position Management data for ${searchValue}`;

            // Try instanceName first (Top Form ID)
            let params = {
                q: `[instanceName] eq '${searchValue}'`,
                fields: 'First Name, Last Name, PositionManagementTitle, Position No',
            };

            let res = await vvClient.forms
                .getForms(params, positionManagementTemplateName)
                .then((r) => parseRes(r))
                .then((r) => checkMetaAndStatus(r, shortDescription, 404))
                .then((r) => checkDataPropertyExists(r, shortDescription, 404))
                .then((r) => (!r.data || r.data.length === 0 ? null : r.data[0]));

            // Fallback: try Position No (exact match)
            if (!res) {
                params.q = `[Position No] eq '${searchValue}'`;
                res = await vvClient.forms
                    .getForms(params, positionManagementTemplateName)
                    .then((r) => parseRes(r))
                    .then((r) => checkMetaAndStatus(r, shortDescription, 404))
                    .then((r) => checkDataPropertyExists(r, shortDescription, 404))
                    .then((r) => (!r.data || r.data.length === 0 ? null : r.data[0]));
            }

            // Fallback: try Position No with LIKE (for partial matches)
            if (!res) {
                params.q = `[Position No] LIKE '%${searchValue}%'`;
                res = await vvClient.forms
                    .getForms(params, positionManagementTemplateName)
                    .then((r) => parseRes(r))
                    .then((r) => checkMetaAndStatus(r, shortDescription, 404))
                    .then((r) => checkDataPropertyExists(r, shortDescription, 404))
                    .then((r) => (!r.data || r.data.length === 0 ? null : r.data[0]));
            }

            // Fallback: try DhDocID as last resort
            if (!res) {
                params.q = `[DhDocID] eq '${searchValue}'`;
                res = await vvClient.forms
                    .getForms(params, positionManagementTemplateName)
                    .then((r) => parseRes(r))
                    .then((r) => checkMetaAndStatus(r, shortDescription, 404))
                    .then((r) => checkDataPropertyExists(r, shortDescription, 404))
                    .then((r) => (!r.data || r.data.length === 0 ? null : r.data[0]));
            }

            if (!res) {
                return { name: '', title: '' };
            }

            const firstName = res['first Name'] || '';
            const lastName = res['last Name'] || '';

            return {
                name: `${firstName} ${lastName}`.trim(),
                title: res['positionManagementTitle'] || '',
            };
        } catch (error) {
            errorLog.push(`Error getting Position Management data: ${error.message || error}`);
            return { name: '', title: '' };
        }
    }

    async function getFPANFormIdByFPANNumber(fpanNumberValue) {
        const normalized = (fpanNumberValue || '').trim();
        if (!normalized || normalized === 'Select Item') {
            throw new Error('FPAN Number is missing when attempting to resolve FPAN form.');
        }

        const shortDescription = `Get FPAN form by FPAN Number ${normalized}`;
        const params = { q: `[FPAN Number] eq '${normalized}'`, fields: 'instanceName' };

        const res = await vvClient.forms
            .getForms(params, fpanTemplateName)
            .then((r) => parseRes(r))
            .then((r) => checkMetaAndStatus(r, shortDescription))
            .then((r) => checkDataPropertyExists(r, shortDescription))
            .then((r) => checkDataIsNotEmpty(r, shortDescription));

        return res.data[0].instanceName;
    }

    async function getRegionCodeByName(regionName) {
        const shortDescription = `Get Region Code for ${regionName}`;
        const params = { q: `[Region Name] eq '${regionName}'`, fields: 'Region Code' };

        let regionCode;
        try {
            const [regionRecord] = await vvClient.forms
                .getForms(params, regionTemplateName)
                .then((r) => parseRes(r))
                .then((r) => checkMetaAndStatus(r, shortDescription))
                .then((r) => checkDataPropertyExists(r, shortDescription))
                .then((r) => checkDataIsNotEmpty(r, shortDescription))
                .then((r) => r.data);

            regionCode = regionRecord['region Code'];
        } catch (error) {
            // unable to find region code
            regionCode = null;
        }

        return regionCode;
    }

    try {
        const fpanNumber = getFieldValueByName('FPAN Number', true);
        const relatedRecordId = getFieldValueByName('Related Record ID', true);
        const ncnuFormId = getFieldValueByName('Form ID');

        if (!fpanNumber && !relatedRecordId) {
            throw new Error("Either 'FPAN Number' or 'Related Record ID' must be provided.");
        }

        if (!ncnuFormId) {
            throw new Error("'Form ID' must be provided.");
        }

        let arpFormData = {};
        let applicationFormID = '';

        if (relatedRecordId) {
            arpFormData = await getARPData(relatedRecordId, filterByFormId);
            applicationFormID = arpFormData.relatedRecordID;
        } else {
            const firstFpanNumber = fpanNumber.split(',')[0].trim();
            arpFormData = await getARPData(firstFpanNumber, filterByFpanNumber);
            applicationFormID = arpFormData.relatedRecordID;
        }

        const fpanFormId = await getFPANFormIdByFPANNumber(arpFormData.fpanNumber);

        // Get Compliance Officer data from Position Management based on FP Forester
        let complianceOfficerData = { name: '', title: '' };
        const fpForesterValue = arpFormData.fpForester ? arpFormData.fpForester.trim() : '';

        if (fpForesterValue && fpForesterValue !== '' && fpForesterValue !== 'Select Item') {
            complianceOfficerData = await getPositionManagementData(fpForesterValue);
        }

        const arpRegionCode = await getRegionCodeByName(arpFormData.region);

        const contactInformationResRaw = await getRecordsByRelatedRecordID(fpanFormId, contactInfoRelationTemplateName);
        const contactInformationRes = contactInformationResRaw.filter(
            (r) => (r.status || '').toLowerCase() !== 'disabled'
        );

        const existingNcnuRelationsRaw = await getRecordsByRelatedRecordID(ncnuFormId, contactInfoRelationTemplateName);
        const existingNcnuRelations = existingNcnuRelationsRaw.filter(
            (r) => (r.status || '').toLowerCase() !== 'disabled'
        );

        const uniqueContactInformationRes = getNonDuplicatedRecords(
            contactInformationRes,
            existingNcnuRelations,
            (item) => CONTACT_INFO_RELATION_KEYS.map((key) => item[key] || '').join('|')
        );

        const uniqueContactInfoIDs = [
            ...new Set(uniqueContactInformationRes.map((item) => item['contact Information ID']).filter((v) => !!v)),
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

        const createRelationPromises = uniqueContactInformationRes.map(async (item) => {
            const newRecordData = {
                'business ID': item['business ID'],
                'contact Information ID': item['contact Information ID'],
                'contact Person': item['contact Person'],
                landowner: item['landowner'],
                operator: item['operator'],
                other: item['other'],
                'related Record ID': ncnuFormId,
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

        const relationResults = await Promise.allSettled(createRelationPromises);
        const successfulRelations = relationResults
            .filter((r) => r.status === 'fulfilled' && r.value !== null)
            .map((r) => r.value);

        const ncnuGUID = await getRecordGUID(ncnuTemplateName, ncnuFormId);

        const relationshipPromises = successfulRelations.flatMap(({ item, postFormData }) => {
            const contactInfoGUID = contactInfoGUIDsMap.get(item['contact Information ID']);
            const rels = [];

            if (item['contact Information ID']) {
                rels.push(
                    relateRecords(ncnuGUID, item['contact Information ID']).catch((e) =>
                        errorLog.push(`Error relating NCNU to Contact Information: ${e.message || e}`)
                    )
                );
            }

            if (postFormData && postFormData['instanceName']) {
                rels.push(
                    relateRecords(ncnuGUID, postFormData['instanceName']).catch((e) =>
                        errorLog.push(`Error relating NCNU to Contact Information Relation: ${e.message || e}`)
                    )
                );
            }

            if (contactInfoGUID && postFormData && postFormData['instanceName']) {
                rels.push(
                    relateRecords(contactInfoGUID, postFormData['instanceName']).catch((e) =>
                        errorLog.push(
                            `Error relating Contact Information to Contact Information Relation: ${e.message || e}`
                        )
                    )
                );
            }

            return rels;
        });

        await Promise.allSettled(relationshipPromises);

        const legalDescriptionRecords = await getRecordsByRelatedRecordID(
            applicationFormID,
            legalDescriptionTemplateName
        );
        const existingNcnuLegal = await getRecordsByRelatedRecordID(ncnuFormId, legalDescriptionTemplateName);

        const uniqueLegal = getNonDuplicatedRecords(legalDescriptionRecords, existingNcnuLegal, (item) =>
            [
                'section',
                'township',
                'county',
                'range',
                'range Direction',
                'tax Parcel Number',
                'unit Number',
                'acres',
                'parent Context',
                'status',
            ]
                .map((k) => item[k] || '')
                .join('|')
        );

        const createLegalPromises = uniqueLegal.map(async (item) => {
            try {
                const postFormData = await createRecord(
                    {
                        section: item['section'],
                        township: item['township'],
                        county: item['county'],
                        range: item['range'],
                        status: item['status'],
                        'related Record ID': ncnuFormId,
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

        const legalResults = await Promise.allSettled(createLegalPromises);
        const successfulLegal = legalResults
            .filter((r) => r.status === 'fulfilled' && r.value !== null)
            .map((r) => r.value);

        const legalRelPromises = successfulLegal.map(async (postFormData) => {
            if (postFormData && postFormData['instanceName']) {
                try {
                    await relateRecords(ncnuGUID, postFormData['instanceName']);
                } catch (error) {
                    errorLog.push(`Error relating NCNU to Legal Description: ${error.message || error}`);
                }
            }
        });

        await Promise.allSettled(legalRelPromises);

        outputCollection[0] = 'Success';
        outputCollection[1] = 'NCNU relations and Legal Descriptions created successfully. (2)';
        outputCollection[2] = {
            results: {
                fpanNumber: arpFormData.fpanNumber,
                region: arpFormData.region,
                regionCode: arpRegionCode,
                fpanClassification: arpFormData.fpanClassification,
                complianceOfficerName: complianceOfficerData.name,
                complianceOfficerTitle: complianceOfficerData.title,
                fpForester: arpFormData.fpForester,
            },
        };
    } catch (error) {
        outputCollection[0] = 'Error';
        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
            outputCollection[2] = error.stack ? error.stack : String(error);
        }
    } finally {
        response.json(200, outputCollection);
    }
};
