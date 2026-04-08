/**
 * LibRenewalGenerateFeeSummary
 * Category: Workflow
 * Modified: 2026-03-06T13:30:25.12Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 9274c410-c121-f011-82cd-cce61d1869ed
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
    Script Name:    LibRenewalGenerateFeeSummary
    Customer:       WADNR
    Purpose:        The purpose of this library is to generate and automatically assess fees for the Renewal.
    Preconditions:  None
    Parameters:
                    Renewal Form ID (String, Required)
                    User ID (String, Required)
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
    Pseudo code:
                    1 Get the values of the fields
                    2 Check if the required parameters are present
                    3 Get the Renewal Form and its fields
                    4 Get the Fee Lookup Records list.
                    5 Get fees associated with the application and total amount of the fees.
                    6 Identify all the possible combinations of fees based on questions answered and Get the highest calculated fee.
                    7 Compare the highest fee to the already assessed fees. Calculate the fees that need to
                      be assessed by Highest Fee minus total of assessed fees.
                    8 Assess the fee using the library LibFeeCreateFee.
                    9 Build response object and end process.
    Date of Dev:    04/24/2025
    Last Rev Date:  03/05/2026
    Revision Notes:
                    04/24/2025 - Alfredo Scilabra:  First Setup of the script
                    05/26/2025 - Mauro Rapuano:     Fix on Contiguous fee's name to retrieve correct amount
                    06/03/2025 - Fernando Chamorro: Adding UserID param to fix Dashboard filter
                    03/05/2026 - Mauro Rapuano:     Added logic to forgive unpaid fees when the calculated fee amount is 0 or when the 'No Payment Required' parameter is set to true.
    */

    logger.info(`Start of the process LibRenewalGenerateFeeSummary  at ${Date()}`);

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

    const NON_CONTIGUOS_FEE_LOOKUP_NAME = 'FPAN Renewal - Non-contiguous activities for Small Forest Landowner';

    const CONTIGUOS_FEE_LOOKUP_NAME = 'FPAN Renewal - Contiguous activities for Small Forest Landowner';

    const ACTIVITIES_FEE_LOOKUP_NAME = 'FPAN Renewal - Activities for Large Forest Landowner';

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

    function getRenewalFormRecord(renewalFormID) {
        return getFormsRecords(
            {
                q: `[instanceName] eq '${renewalFormID}'`,
                expand: true,
            },
            'FPAN Renewal'
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

    function getRelatedFees(renewalFormID) {
        return getFormsRecords(
            {
                q: `[Related Record ID] eq '${renewalFormID}' AND ([Status] eq 'Unpaid' OR [Status] eq 'Paid')`,
                expand: true,
            },
            'Fee'
        );
    }

    function getCalculatedFee(renewalFormRecord, nonContiguousFee, contiguousFee, activitiesFee) {
        // Question 3
        const isSmallForestLandowner = renewalFormRecord['small Forest Landowner'] === 'Yes';
        // Question 4
        const proposedHarvestContiguousOwnership = renewalFormRecord['proposed Harvest'] === 'Yes';
        if (isSmallForestLandowner) {
            return proposedHarvestContiguousOwnership ? contiguousFee : nonContiguousFee;
        }
        return activitiesFee;
    }

    function createFee(renewalFormRecord, feeLookup, feeAmount, userID) {
        const formRelatedFields = {
            'Individual ID': renewalFormRecord['individual ID'],
            'Related Record ID': renewalFormRecord.instanceName,
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
        const renewalFormID = getFieldValueByName('Renewal Form ID');
        const userID = getFieldValueByName('User ID');
        const noPaymentRequiredParam = getFieldValueByName('No Payment Required', true);
        const noPaymentRequired = noPaymentRequiredParam.toLowerCase() === 'true';

        // 2 Check if the required parameters are present and complete list of holidays
        if (!renewalFormID || !userID) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        // 3 Get the Renewal Form and its fields
        const [renewalFormRecord] = await getRenewalFormRecord(renewalFormID);

        if (isNullEmptyUndefined(renewalFormRecord)) {
            throw new Error('Renewal Form record not found');
        }

        // 4 Get the Fee Lookup Records list.
        const [[nonContiguousFeeLookupRecord], [contiguousFeeLookupRecord], [activitiesFeeLookupRecord]] =
            await Promise.all(
                [NON_CONTIGUOS_FEE_LOOKUP_NAME, CONTIGUOS_FEE_LOOKUP_NAME, ACTIVITIES_FEE_LOOKUP_NAME].map((feeName) =>
                    getFeeLookupRecord(feeName)
                )
            );

        const lookupRecordsValid = areFeeLookupRecordsValid(
            nonContiguousFeeLookupRecord,
            contiguousFeeLookupRecord,
            activitiesFeeLookupRecord
        );

        if (!lookupRecordsValid) throw new Error('Fee Lookup record missing');

        // 5 Get fees associated with the application and total amount of the fees.
        const relatedFees = await getRelatedFees(renewalFormID);

        // 6 Identify all the possible combinations of fees based on questions answered.
        const calculatedFee = getCalculatedFee(
            renewalFormRecord,
            nonContiguousFeeLookupRecord,
            contiguousFeeLookupRecord,
            activitiesFeeLookupRecord
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
                await createFee(renewalFormRecord, calculatedFee, differenceBetweenFees.value, userID);
                feeAmout = differenceBetweenFees.value;
            } else {
                const currentUnpaidFee = relatedFees.filter((fee) => fee['Status'] != 'Paid');

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
