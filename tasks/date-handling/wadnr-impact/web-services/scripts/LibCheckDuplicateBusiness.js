/**
 * LibCheckDuplicateBusiness
 * Category: Workflow
 * Modified: 2025-06-18T12:35:52.187Z by moises.savelli@visualvault.com
 * Script ID: Script Id: e618ec8b-dc97-ef11-82b3-87eb829b9939
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
        Script Name:    LibCheckDuplicateBusiness
        Customer:       WADNR
        Purpose:        The purpose of this web service is to check if a business record already exists in the system.
        Preconditions:
                  
        Parameters:     The following represent variables passed into the function:
                        relatedRecordID: The ID of the related record
                        contactInformationID: The ID of the contact (Business ID or Contact Information ID)
                        relationType: The type of relation (Business or Individual)
                        role: The role of the contact
        Return Object:
                        outputCollection[0]: Status
                        outputCollection[1]: Short description message
                        outputCollection[2]: data
        Date of Dev:    10/31/2024
        Last Rev Date:  06/16/2025
        Revision Notes: Brian Davis : Initial setup
                        Moises Savelli : Added error handling and logging
                        Mauro Rapuano : Added Phone and Email as optional params
  */

    logger.info(`Start of the process LibCheckDuplicateBusiness at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const businessTemplateId = 'Business';

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    function getFieldValueByName(fieldName, isOptional) {
        try {
            let fieldObj = ffCollection.getFormFieldByName(fieldName);
            let fieldValue = fieldObj && (fieldObj.hasOwnProperty('value') ? fieldObj.value : null);

            if (!isOptional && !fieldValue) {
                throw new Error(`${fieldName}`);
            }
            return fieldValue;
        } catch (error) {
            errorLog.push(error.message);
        }
    }

    function parseRes(vvClientRes) {
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {}
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;
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
                        `${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    // Function to check if a value is null, empty, or undefined
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

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // GET THE VALUES OF THE FIELDS
        let businessName = getFieldValueByName('Business Name');
        const country = getFieldValueByName('Country');
        const addressLine1 = getFieldValueByName('Address Line 1');
        const city = getFieldValueByName('City');
        const state = getFieldValueByName('State');
        const zipCode = getFieldValueByName('Zip Code');
        const phone = getFieldValueByName('Phone', true);
        const email = getFieldValueByName('Email', true);

        businessName = businessName.replace(/'/g, "''");

        // Base query for core matching fields
        let query = `[Business Name] eq '${businessName}' AND [Business Country] eq '${country}' AND [Business Address Line 1] eq '${addressLine1}' AND [Business City] eq '${city}' AND [Business Province State] eq '${state}' AND [Business Zip Code] eq '${zipCode}' AND [Business Phone] eq '${phone}' AND [Business Email] eq '${email}'`;

        // Set up parameters for the query
        const getBusinessFormParams = {
            q: query,
            fields: 'businessID, businessName, businessCountry, businessAddressLine1, businessAddressLine2, businessAddressLine3, businessCity, businessState, businessZipCode, businessEmail, businessPhone',
        };

        shortDescription = 'Get Business Record';

        const getBusinessFormRes = await vvClient.forms
            .getForms(getBusinessFormParams, businessTemplateId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        const LibCheckDuplicateBusinessResults = getBusinessFormRes.data[0];

        if (isNullEmptyUndefined(LibCheckDuplicateBusinessResults)) {
            returnObj = {
                results: LibCheckDuplicateBusinessResults,
                duplicateFound: 'False',
            };
        } else {
            returnObj = {
                results: LibCheckDuplicateBusinessResults,
                duplicateFound: 'True',
            };
        }

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibCheckDuplicateBusiness returned successfully.';
        outputCollection[2] = returnObj;
    } catch (error) {
        logger.info(`Error encountered: ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error';

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
