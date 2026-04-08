/**
 * LibFPANGenerateFeeSummary
 * Category: Workflow
 * Modified: 2026-03-05T19:50:11.09Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 8cec88a6-da21-f011-82cd-cce61d1869ed
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const currency = require('currency.js');

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
    Script Name:    LibFPANGenerateFeeSummary
    Customer:       WADNR
    Purpose:        The purpose of this library is to generate and automatically assess fees for the FPAN.
    Preconditions:  None
    Parameters:
                    FPAN Form ID (String, Required)
                    User ID (String, Required)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1 Get the values of the fields
                    2 Check if the required parameters are present
                    3 Get the FPAN Form and its fields
                    4 Get the Fee Lookup Records list.
                    5 Get fees associated with the application and total amount of the fees.
                    6 Identify all the possible combinations of fees based on questions answered and Get the highest calculated fee.
                    7 Compare the highest fee to the already assessed fees. Calculate the fees that need to
                      be assessed by Highest Fee minus total of assessed fees.
                    8 Assess the fee using the library LibFeeCreateFee.
                    9 Build response object and end process.
    Date of Dev:    04/25/2025
    Last Rev Date:  03/05/2026
    Revision Notes:
                    04/25/2025 - Alfredo Scilabra:  First Setup of the script
                    06/03/2025 - Mauro Rapuano:     Fix for In UGA Fee conditions
                    06/03/2025 - Fernando Chamorro: Adding UserID param to fix Dashboard filter
                    06/05/2025 - Mauro Rapuano:     New scenarios applied to generate fees
                    12/19/2025 - Lucas Herrera:     Fix issue where unpaid fees were not being updated correctly based on paid ones.
                    03/05/2026 - Mauro Rapuano:     Added logic to forgive unpaid fees when the calculated fee amount is 0 or when the 'No Payment Required' parameter is set to true.
    */

    logger.info(`Start of the process LibFPANGenerateFeeSummary  at ${Date()}`);

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

    const FPAN_APPLICATION_NON_CONTIGUOUS_SMALL_FOREST_LOOKUP_NAME =
        'FPAN Application - Non-contiguous activities for Small Forest Landowner';

    const FPAN_APPLICATION_CONTIGUOUS_SMALL_FOREST_LOOKUP_NAME =
        'FPAN Application - Contiguous activities for Small Forest Landowner';

    const FPAN_APPLICATION_LARGE_FOREST_LANDOWNER_LOOKUP_NAME =
        'FPAN Application - Activities for Large Forest Landowner';

    const FPAN_APPLICATION_ACTIVITIES_UGA_LOOKUP_NAME = 'FPAN Application - Activities in Urban Growth Area';

    const FPAN_APPLICATION_CONTIGUOUS_UGA_10YR_LOOKUP_NAME =
        'FPAN Application - Contiguous Activities in Urban Growth with a 10-Year Plan';

    const FPAN_APPLICATION_NON_CONTIGUOUS_UGA_10YR_LOOKUP_NAME =
        'FPAN Application - Non-contiguous Activities in Urban Growth with a 10-Year Plan';

    const FPAN_APPLICATION_CONVERSION_NON_FORESTRY_USE_LOOKUP_NAME =
        'FPAN Application - Conversion to Non-Forestry Use';

    const FPAN_APPLICATION_CONTIGUOUS_COH_LOOKUP_NAME =
        'FPAN Application - Contiguous Activities for Conversion Option Harvest Plan';

    const FPAN_APPLICATION_NON_CONTIGUOUS_COH_LOOKUP_NAME =
        'FPAN Application - Non-contiguous Activities for Conversion Option Harvest Plan';

    const FPAN_APPLICATION_COH_LARGE_LOOKUP_NAME =
        'FPAN Application - Conversion Option Harvest Plan for Large Forest Landowner';

    const TEN_YEAR_FOREST_PLAN_STATEMENT_DOC_TYPE =
        '10-year Forest Management Plan and Statement of Intent to Keep in Forestry';

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
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode) {
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

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    function getFormsRecords(getFormsParams, templateName) {
        shortDescription = `Get ${templateName} form record`;

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
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

    function uncapitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    function getFPANFormRecord(fpanFormID) {
        return getFormsRecords(
            {
                q: `[instanceName] eq '${fpanFormID}'`,
                expand: true,
            },
            'Forest Practices Application Notification'
        );
    }

    function getFeeLookupRecord(feeName) {
        return getFormsRecords(
            {
                q: `[Fee Name] eq '${feeName}'`,
                expand: true,
            },
            'Fee Lookup'
        );
    }

    function getRelatedFees(fpanFormID) {
        return getFormsRecords(
            {
                q: `[Related Record ID] eq '${fpanFormID}' AND ([Status] eq 'Unpaid' OR [Status] eq 'Paid')`,
                expand: true,
            },
            'Fee'
        );
    }

    function getRelatedDocs(formRevisionID, params = {}) {
        const shortDescription = `Get related docs for record ${formRevisionID}`;
        params.indexFields = 'include';
        return vvClient.forms
            .getFormRelatedDocs(formRevisionID, params)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function calculateHigherFee(applicableFees) {
        return applicableFees.reduce((max, current) =>
            currency(current['fee Amount']).value > currency(max['fee Amount']).value ? current : max
        );
    }

    function getCalculatedFee(
        fpanFormRecord,
        relatedDocs,
        nonContiguousSmallForestFee,
        contiguousSmallForestFee,
        largeForestLandownerFee,
        activitiesUgaFee,
        contiguousUga10YrFee,
        nonContiguousUga10YrFee,
        conversionNonForestryUseFee,
        contiguousCohFee,
        nonContiguousCohFee,
        cohLargeLookupRecord
    ) {
        const noFeeFoundObj = { 'fee Amount': 0 };
        const applicableFees = [];
        let inUGAFeeAssessed = false;

        // Question 3
        const isLongTermApplication = fpanFormRecord['long Term Application'] === 'Yes';

        //If Q3 = Yes -> No fees assessed
        if (isLongTermApplication) return noFeeFoundObj;

        // Question 5
        const isLandConversionThreeYearsOfHarvest = fpanFormRecord['land Conversion Three Years Of Harvest'] === 'Yes';

        // Question 6
        const isSmallForestLandowner = fpanFormRecord['small Forest Landowner'] === 'Yes';
        const isOneOrMoreParcels = fpanFormRecord['small Forest One Or More Parcels'] === 'Yes';

        // Question 20
        const isHarvestingOrSalvagingTimber = fpanFormRecord['harvesting Salvaging Timber'] === 'Yes';
        //Based on logic for all applicable fees Q20 must be yes so if eq NO then no fees
        //if (!isHarvestingOrSalvagingTimber) return noFeeFoundObj;

        // Question 11c
        const isWithinUrbanGrowthArea = fpanFormRecord['growth Area'] === 'Yes';
        const owns20ContiguousAcresWithinUGA = fpanFormRecord['own 20 Contiguous Acres Within UGA'] === 'Yes';

        // Question 11d
        const isConversionOptionHarvestPlanPrepared = fpanFormRecord['cohp'] === 'Yes';

        const is10YrForestManagementPlanAttached = relatedDocs.some(
            (doc) => doc['document type'] === TEN_YEAR_FOREST_PLAN_STATEMENT_DOC_TYPE
        );

        /* In UGA with 10-year statement $100/$150 */
        //Q6 = Yes AND One or More Parcels = True AND Q11c = Yes AND More than 20 acres = True AND Q20 = Yes AND 10-year doc UPLOADED
        if (
            isSmallForestLandowner &&
            isWithinUrbanGrowthArea &&
            owns20ContiguousAcresWithinUGA &&
            isHarvestingOrSalvagingTimber &&
            is10YrForestManagementPlanAttached
        ) {
            applicableFees.push(isOneOrMoreParcels ? contiguousUga10YrFee : nonContiguousUga10YrFee);
            inUGAFeeAssessed = true;
        }

        /* In UGA without 10-year statement $1500 */
        //Q6 = Yes AND One or More Parcels = True/False AND Q11c = Yes AND Q20 = Yes AND 10-year doc NOT UPLOADED
        if (
            isSmallForestLandowner &&
            isWithinUrbanGrowthArea &&
            isHarvestingOrSalvagingTimber &&
            !is10YrForestManagementPlanAttached
        ) {
            applicableFees.push(activitiesUgaFee);
            inUGAFeeAssessed = true;
        }

        /* Conversion to Non-Forestry Use $1500 */
        //Q5 = Yes AND Q11d = No AND Q20 = Yes
        if (
            isLandConversionThreeYearsOfHarvest &&
            !isConversionOptionHarvestPlanPrepared &&
            isHarvestingOrSalvagingTimber
        ) {
            applicableFees.push(conversionNonForestryUseFee);
        }

        /* Conversion Option Harvest Plan More than 1 Parcel $100 */
        //Q5 = Yes AND Q6 = Yes AND One or more parcels = Yes AND Q11d = Yes AND Q20 = Yes
        if (
            isLandConversionThreeYearsOfHarvest &&
            isSmallForestLandowner &&
            isConversionOptionHarvestPlanPrepared &&
            isHarvestingOrSalvagingTimber
        ) {
            applicableFees.push(isOneOrMoreParcels ? contiguousCohFee : nonContiguousCohFee);
        }

        /* Conversion Option Harvest Plan Q6 = NO $150 */
        //Q5 = Yes AND Q6 = No AND Q11d = Yes AND Q20 = Yes
        if (
            isLandConversionThreeYearsOfHarvest &&
            !isSmallForestLandowner &&
            isConversionOptionHarvestPlanPrepared &&
            isHarvestingOrSalvagingTimber
        ) {
            applicableFees.push(cohLargeLookupRecord);
        }

        /* In UGA $1500 (REPLACED BY 2 NEXT SCENARIOS) */
        //Q11c = Yes and Q20 = Yes AND NOT ALREADY ASSESSED AN 'IN UGA W/WITHOUT 10-YR...'
        if (!inUGAFeeAssessed && isHarvestingOrSalvagingTimber && isWithinUrbanGrowthArea) {
            applicableFees.push(activitiesUgaFee);
        }

        /* Contiguous Small Forest / Non-Contiguous Small Forest $100/$150 */
        //If Q6 = Yes AND Q20 = Yes AND One or More Parcels = True
        //If Q6 = Yes AND Q20 = Yes AND One or More Parcels = False
        if (isSmallForestLandowner && isHarvestingOrSalvagingTimber) {
            applicableFees.push(isOneOrMoreParcels ? contiguousSmallForestFee : nonContiguousSmallForestFee);
        }

        /* Large Forest Landowner $150 */
        //If Q6 = No AND Q11c = No AND Q20 = Yes
        if (!isSmallForestLandowner && !isWithinUrbanGrowthArea && isHarvestingOrSalvagingTimber) {
            applicableFees.push(largeForestLandownerFee);
        }

        return applicableFees.length > 0 ? calculateHigherFee(applicableFees) : noFeeFoundObj;
    }

    function createFee(fpanFormRecord, feeLookup, feeAmount, userID) {
        const formRelatedFields = {
            'Individual ID': fpanFormRecord['individual ID'],
            'Related Record ID': fpanFormRecord.instanceName,
            'Allow Installments': 'No',
            'Fee Amount': feeAmount,
            'User ID': userID,
        };
        const feeRequiredFieldsInLookup = [
            'Process Type',
            'Fee Name',
            'Fee Type',
            'Fee Description',
            'Fund',
            'Cost Center',
            'GL Account',
            'Refundable',
            'Fee Amount Can Change',
            'Accept Checks',
        ];
        const webServiceParams = [
            ...Object.entries(formRelatedFields).map(([name, value]) => ({ name, value })),
            ...feeRequiredFieldsInLookup.map((field) => ({
                name: field,
                value: feeLookup[uncapitalizeFirstLetter(field)],
            })),
        ];
        return callExternalWs('LibFeeCreateFee', webServiceParams);
    }

    function areFeeLookupRecordsValid(...recordsArrays) {
        const allRecords = recordsArrays.flat();
        return !allRecords.some((record) => isNullEmptyUndefined([record]));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1
        const fpanFormID = getFieldValueByName('FPAN Form ID');
        const userID = getFieldValueByName('User ID');
        const noPaymentRequiredParam = getFieldValueByName('No Payment Required', true);
        const noPaymentRequired = noPaymentRequiredParam.toLowerCase() === 'true';

        // 2 Check if the required parameters are present and complete list of holidays
        if (!fpanFormID || !userID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3 Get the Renewal Form and its fields
        const [fpanFormRecord] = await getFPANFormRecord(fpanFormID);

        if (isNullEmptyUndefined(fpanFormRecord)) {
            throw new Error('Forest Practices Application Notification record not found');
        }

        // 4 Get the Fee Lookup Records list.
        const [
            [nonContiguousSmallForestLookupRecord],
            [contiguousSmallForestLookupRecord],
            [largeForestLandownerLookupRecord],
            [activitiesUgaLookupRecord],
            [contiguousUga10YrLookupRecord],
            [nonContiguousUga10YrLookupRecord],
            [conversionNonForestryUseLookupRecord],
            [contiguousCohLookupRecord],
            [nonContiguousCohLookupRecord],
            [cohLargeLookupRecord],
        ] = await Promise.all(
            [
                FPAN_APPLICATION_NON_CONTIGUOUS_SMALL_FOREST_LOOKUP_NAME,
                FPAN_APPLICATION_CONTIGUOUS_SMALL_FOREST_LOOKUP_NAME,
                FPAN_APPLICATION_LARGE_FOREST_LANDOWNER_LOOKUP_NAME,
                FPAN_APPLICATION_ACTIVITIES_UGA_LOOKUP_NAME,
                FPAN_APPLICATION_CONTIGUOUS_UGA_10YR_LOOKUP_NAME,
                FPAN_APPLICATION_NON_CONTIGUOUS_UGA_10YR_LOOKUP_NAME,
                FPAN_APPLICATION_CONVERSION_NON_FORESTRY_USE_LOOKUP_NAME,
                FPAN_APPLICATION_CONTIGUOUS_COH_LOOKUP_NAME,
                FPAN_APPLICATION_NON_CONTIGUOUS_COH_LOOKUP_NAME,
                FPAN_APPLICATION_COH_LARGE_LOOKUP_NAME,
            ].map(getFeeLookupRecord)
        );

        const lookupRecordsValid = areFeeLookupRecordsValid(
            nonContiguousSmallForestLookupRecord,
            contiguousSmallForestLookupRecord,
            largeForestLandownerLookupRecord,
            activitiesUgaLookupRecord,
            contiguousUga10YrLookupRecord,
            nonContiguousUga10YrLookupRecord,
            conversionNonForestryUseLookupRecord,
            contiguousCohLookupRecord,
            nonContiguousCohLookupRecord,
            cohLargeLookupRecord
        );

        if (!lookupRecordsValid) throw new Error('Fee Lookup record missing');

        // 5 Get fees associated with the application and total amount of the fees.
        const relatedFees = await getRelatedFees(fpanFormID);
        const fpanRelatedDocs = await getRelatedDocs(fpanFormRecord.revisionId);

        // 6 Identify all the possible combinations of fees based on questions answered.
        const calculatedFee = getCalculatedFee(
            fpanFormRecord,
            fpanRelatedDocs,
            nonContiguousSmallForestLookupRecord,
            contiguousSmallForestLookupRecord,
            largeForestLandownerLookupRecord,
            activitiesUgaLookupRecord,
            contiguousUga10YrLookupRecord,
            nonContiguousUga10YrLookupRecord,
            conversionNonForestryUseLookupRecord,
            contiguousCohLookupRecord,
            nonContiguousCohLookupRecord,
            cohLargeLookupRecord
        );

        const relatedPaidFees = relatedFees.filter((fee) => fee['status'] == 'Paid');

        let feeAmout = 0;
        if (calculatedFee['fee Amount'] !== 0 && !noPaymentRequired) {
            // 7 Compare the highest fee to the already assessed fees. Calculate the fees that need to be assessed by Highest Fee minus total of assessed fees.
            const totalAssessedFeeAmount = relatedPaidFees.reduce(
                (total, fee) => currency(total).add(fee['fee Amount']),
                currency(0)
            );

            const differenceBetweenFees = currency(calculatedFee['fee Amount']).subtract(totalAssessedFeeAmount);

            // 8 Assess the fee using the library LibFeeCreateFee.
            if (relatedPaidFees.length == relatedFees.length) {
                await createFee(fpanFormRecord, calculatedFee, differenceBetweenFees.value, userID);
                feeAmout = differenceBetweenFees.value;
            } else {
                const currentUnpaidFee = relatedFees.filter((fee) => fee['status'] != 'Paid');

                const adjustedCalculatedFeeAmount = currency(calculatedFee['fee Amount']).subtract(
                    totalAssessedFeeAmount
                ).value;
                calculatedFee['fee Amount'] = adjustedCalculatedFeeAmount;

                if (currentUnpaidFee[0]['fee Amount'] != calculatedFee['fee Amount']) {
                    const webServiceParams = [
                        {
                            name: 'Fee',
                            value: currentUnpaidFee[0],
                        },
                        {
                            name: 'New Amount',
                            value: calculatedFee['fee Amount'],
                        },
                    ];

                    await callExternalWs('LibFeeUpdateFeeAndPaymentItem', webServiceParams);
                    feeAmout = calculatedFee['fee Amount'];
                }
            }
        }

        // 9 Remove all unpaid fees if new amount = 0 or notPaymentRequired = True
        const currentUnpaidFee = relatedFees.filter((fee) => fee['status'] === 'Unpaid');
        if ((calculatedFee['fee Amount'] === 0 || noPaymentRequired) && currentUnpaidFee.length > 0) {
            const webServiceParams = [
                {
                    name: 'Action',
                    value: 'Forgive',
                },
                {
                    name: 'Individual ID',
                    value: currentUnpaidFee[0]['individual ID'],
                },
                {
                    name: 'Form ID',
                    value: currentUnpaidFee[0]['instanceName'],
                },
                {
                    name: 'Fee Description',
                    value: currentUnpaidFee[0]['fee Description'],
                },
                {
                    name: 'Fund',
                    value: currentUnpaidFee[0]['fund'],
                },
                {
                    name: 'Cost Center',
                    value: currentUnpaidFee[0]['cost Center'],
                },
                {
                    name: 'GL Account',
                    value: currentUnpaidFee[0]['gL Account'],
                },
            ];

            await callExternalWs('FeeWaiveForgiveFee', webServiceParams);
        }

        const message = feeAmout === 0 ? 'No fees to asses' : 'Amount Calculated';

        outputCollection[0] = 'Success'; // Don´t change this
        outputCollection[1] = message;
        outputCollection[2] = feeAmout;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
