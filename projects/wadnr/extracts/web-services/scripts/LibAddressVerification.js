/**
 * LibAddressVerification
 * Category: Workflow
 * Modified: 2024-09-25T20:40:02.863Z by moises.savelli@visualvault.com
 * Script ID: Script Id: 17743253-2e66-ef11-82ad-bed4217b1dee
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
//LibAddressVerification
const { error } = require('winston');
const fetch = require('cross-fetch');
let logger = require('../log');

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
    /*Script Name:   LibAddressVerification
    Customer:      PAELS
    Purpose:       The purpose of this process is to verify the address entered in the form. 
    Parameters:    addressObject (Object, Required) - The Address object passed into the function from the client side webservice call.      
    Return Array:   
                     [0] Status: 'Success', 'Error'
    Pseudo code:   
                    Step 1: Check to ensure zip code is properly formatted as well as present
                    Step 2: Perform a GET on the api.zip-codes.com to get city information.
                    Step 3: Call the verifyAddress asynch function to determine if the address provided in teh addressObject is deliverable.
                    Step 4: If the address from the addressObject is not deliverable call the verifyAddress async function again to get suggestions.
                    Step 5: If no suggestions returned for the verifyAddress api call return "undeliverable" in the verifyAddressResult to be returned to the client.
                    Step 6: If suggestions are returned assign the getSuggestions object to the verifyAddress result to be returned to the client.
                    Step 7: If the address is deliverable assign the addressVerification object to the verifyAddressResult to be returned to the client.
                    Step 9: Configure outputcollection to return "Success" to client side.
                    Step 10: Log errors captured if any.
                    Step 11: Return to client.
    Last Rev Date: 04/24/2023
    Revision Notes:
    04/24/2023 - Brian Davis: Script created
    */

    logger.info('Start of the process LibAddressVerification at ' + Date());

    /********************
    Config Variables
  *********************/
    let missingFieldGuidance = 'Please provide a value for the missing field(s).';

    /****************
    Script Variables
    *****************/
    let outputCollection = [];
    let errorLog = [];

    /********************
    Helper Functions
  *********************/
    // Check if field object has a value property and that value is truthy before returning value.
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
    // Checks if the parameter is null, empty, select item, or undefined, and returns a boolean value.
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
    try {
        /*************************
      Config Variables
    **************************/
        // This is the API key provided by api.zip-codes.com for city lookup.
        let zipCodeAPIKey = 'REDACTED_ZIP_CODE_API_KEY';
        // This is the API key provided by Lob.com for address verification.
        let lobAPIKey = 'REDACTED_LOB_API_KEY';
        /*************************
      Form Record Variables
    **************************/
        let addressObject = getFieldValueByName('addressObject');
        let zipCode = addressObject.zipCode;
        let country = addressObject.country;
        let deliverableSuggestionsOnly = addressObject.deliverableSuggestionsOnly;
        let verifyAddressResult = {};

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /*****************************
          BEGIN ASYNC CODE
    ******************************/
        // Async function to verify the address using the Lob API. Returns an object containing the verification status and suggested address,
        // if applicable, for a given address object. If the initial address is identified as undeliverable,
        // the function will return suggestions for US addresses if any are available.
        async function verifyAddress() {
            //ADDRESS VALIDATION
            let addressResponseObject = {};
            let url, form;
            const auth = `Basic ${Buffer.from(`${lobAPIKey}:`).toString('base64')}`;
            const currentCountry = addressObject.country;
            switch (currentCountry) {
                case 'CA':
                    url = 'https://api.lob.com/v1/intl_verifications';
                    form = {
                        primary_line: addressObject.street1,
                        secondary_line: addressObject.street2,
                        city: addressObject.city,
                        state: addressObject.state,
                        postal_code: addressObject.zipCode.substring(0, 5),
                        country: addressObject.country,
                    };
                    break;
                case 'US':
                    if (addressObject.suggestions === 'True') {
                        //Note: This API Call retrieves suggested addresses. It does not return zip_code_plus_4
                        //If suggestions are available, only deliverable address suggestions are presented, otherwise all potential suggestions are provided, some of which may not be deliverable.
                        if (deliverableSuggestionsOnly === 'True') {
                            //This allows only suggestions for addresses that can be delivered to. Typical use case would be for MailingAddress field sets.
                            url = 'https://api.lob.com/v1/us_autocompletions?valid_addresses=true';
                        } else {
                            //This allows Physical Non-Deliverable Addresses to select from a larger pool of suggestions, some of which may or may not be deliverable. Typical case would be for PhysicalAddress field sets.
                            url = 'https://api.lob.com/v1/us_autocompletions';
                        }
                        form = {
                            address_prefix: addressObject.street1,
                            city: addressObject.city,
                            state: addressObject.state,
                            zip_code: addressObject.zipCode.substring(0, 5),
                        };
                    } else {
                        //Note: This API call determines if an address is 'deliverable'. It does return zip_code_plus_4 if available.
                        url = 'https://api.lob.com/v1/us_verifications';
                        form = {
                            primary_line: addressObject.street1,
                            secondary_line: addressObject.street2,
                            city: addressObject.city,
                            state: addressObject.state,
                            zip_code: addressObject.zipCode.substring(0, 5),
                        };
                    }
                    break;
                default:
                    throw new Error('Invalid country: must be either US or Canada.');
            }
            const verifyAddress = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: auth,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(form),
            });

            if (verifyAddress.status === 200) {
                addressResponseObject = await verifyAddress.json();
                return addressResponseObject;
            } else {
                return 'undeliverable';
            }
            return addressResponseObject;
        }
        // Step 1: Check to ensure zip code is properly formatted as well as present
        switch (country) {
            case 'US':
                if (zipCode.length > 5) {
                    zipCode = zipCode.split('-')[0];
                    isNum = /^\d+$/.test(zipCode);
                    if (!isNum) {
                        throw new Error('Invalid zip code format');
                    }
                } else if (zipCode.length < 5) {
                    throw new Error('Zip code is too short');
                }
                break;
            case 'CA':
                if (zipCode.length === 7) {
                    // XNX NXN or XNX-NXN
                    zipCode = zipCode.replace('-', ' ');
                } else if (zipCode.length === 6) {
                    // XNXNXN
                    zipCode = zipCode.substring(0, 3) + ' ' + zipCode.substring(3, 6);
                } else {
                    throw new Error('Invalid postal code format');
                }
                zipCode = encodeURIComponent(zipCode); // replace ' ' with '%20'
                break;
            default:
                throw new Error('Invalid country');
                break;
        }
        // Step 2: Perform a GET on the api.zip-codes.com to get city information.
        const fetchCityInformation = await fetch(
            `https://api.zip-codes.com/ZipCodesAPI.svc/1.0/GetZipCodeDetails/${zipCode}?key=${zipCodeAPIKey}`,
            { method: 'GET' }
        );

        if (fetchCityInformation.status === 200) {
            const cityInformationResponseObject = await fetchCityInformation.json();
            if (!isNullEmptyUndefined(cityInformationResponseObject.Error)) {
                throw new Error(cityInformationResponseObject.Error);
            }
            // handle the response body
            addressObject.city = cityInformationResponseObject.item.City;
            addressObject.state = cityInformationResponseObject.item.State;
            addressObject.county = cityInformationResponseObject.item.County;
            // Determine if there is enough information available to perform an address verification
            if (
                !isNullEmptyUndefined(addressObject.street1) &&
                !isNullEmptyUndefined(addressObject.city) &&
                !isNullEmptyUndefined(addressObject.zipCode)
            ) {
                // Step 3: Call the verifyAddress asynch function to determine if the address provided in teh addressObject is deliverable.
                let addressVerification = await verifyAddress();
                // Step 4: If the address from the addressObject is not deliverable call the verifyAddress async function again to get suggestions.
                if (addressVerification.deliverability === 'undeliverable') {
                    addressObject.suggestions = 'True';
                    let getSuggestions = await verifyAddress();
                    // Step 5: If no suggestions returned for the verifyAddress api call return "No Suggestions" in the verifyAddressResult to be returned to the client.
                    if (getSuggestions.length === 0) {
                        verifyAddressResult = 'undeliverable';
                    }
                    //Step 6: If suggestions are returned assign the getSuggestions object to the verifyAddress result to be returned to the client.
                    verifyAddressResult = getSuggestions;
                } else {
                    //Step 7: If the address is deliverable assign the addressVerification object to the verifyAddressResult to be returned to the client.
                    verifyAddressResult = addressVerification;
                    //Step 8: Assign addressObject values to values retrieved from the verifyAddress api call.
                    addressObject.street1 = verifyAddressResult.primary_line;
                    addressObject.street2 = isNullEmptyUndefined(verifyAddressResult.secondary_line)
                        ? addressObject.street2
                        : verifyAddressResult.secondary_line;
                    //Note: ZipCode + 4 is not returned by LOB for every address. We are setting the zipCode for the addressObject only if a zip + 4 was received from the API.
                    addressObject.zipCode = isNullEmptyUndefined(verifyAddressResult.components.zip_code_plus_4)
                        ? addressObject.zipCode
                        : `${verifyAddressResult.components.zip_code}-${verifyAddressResult.components.zip_code_plus_4}`;
                    //Set County. County returns from the API as COUNTYNAME-COUNTYNAME
                    if (isNullEmptyUndefined(verifyAddressResult.components.county)) {
                        addressObject.county = addressObject.county;
                    } else {
                        const countyParts = verifyAddressResult.components.county.split('-');
                        if (countyParts.length === 2 && countyParts[0] === countyParts[1]) {
                            addressObject.county = countyParts[0].toUpperCase();
                        } else {
                            addressObject.county = verifyAddressResult.components.county.toUpperCase();
                        }
                    }
                }
            }
        } else {
            throw new Error(`Error encountered when getting city information for zipcode: ${addressObject.zipCode}`);
        }
        //Step 9: Configure outputcollection to return "Success" to client side.
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibAddressVerification has returned successfully';
        outputCollection[2] = addressObject; //Return the mutated addressObject to the client for setting fieldValues.
        outputCollection[3] = verifyAddressResult; //Return the verifyAddressResult object to the client for handling suggestion messaging to end-user.
    } catch (error) {
        //Step 10: Log errors captured if any.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = errorLog;
    } finally {
        //Step 11: Return to client.
        response.json(200, outputCollection);
    }
};
