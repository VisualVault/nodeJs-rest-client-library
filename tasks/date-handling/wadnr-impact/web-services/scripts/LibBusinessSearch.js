/**
 * LibBusinessSearch
 * Category: Workflow
 * Modified: 2025-12-17T13:45:24.893Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: 402ace82-2e96-ef11-82b3-87eb829b9939
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
    Script Name:    BusinessSearch
    Customer:       WADNR
    Purpose:        The purpose of this web service is to return the results of the business search custom query

    Preconditions:
                    - Business records must be available in the system

    Parameters:     The following represent variables passed into the function:
                    Business Name, Business ID Number, Business Country, Business Zip Code, 
                    Business Address Line 1, Business Address Line 2, Business Address Line 3, 
                    Business City, Business Province State, Business County, Business Phone, Business Email
                    
    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: data

    Date of Dev:    10/29/2024
    Last Rev Date:  12/16/2025

    Revision Notes: 
                    10/29/2024 - Brian Davis: Initial setup
                    12/16/2025 - Federico Cuelho: Updated city parameter handling and normalization
    */

    logger.info(`Start of the process BusinessSearch at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const queryName = 'zWebSvc Business Search';
    // Comprehensive normalization map for address fields
    const addressNormalizationMap = {
        alley: 'ALY',
        annex: 'ANX',
        arcade: 'ARC',
        avenue: 'AVE',
        bayou: 'BYU',
        beach: 'BCH',
        bend: 'BND',
        bluff: 'BLF',
        bottom: 'BTM',
        boulevard: 'BLVD',
        branch: 'BR',
        bridge: 'BRG',
        brook: 'BRK',
        burg: 'BG',
        bypass: 'BYP',
        camp: 'CP',
        canyon: 'CYN',
        cape: 'CPE',
        causeway: 'CSWY',
        center: 'CTR',
        circle: 'CIR',
        cliff: 'CLF',
        club: 'CLB',
        common: 'CMN',
        corner: 'COR',
        corners: 'CORS',
        course: 'CRSE',
        court: 'CT',
        courts: 'CTS',
        cove: 'CV',
        creek: 'CRK',
        crescent: 'CRES',
        crossing: 'XING',
        dale: 'DL',
        dam: 'DM',
        divide: 'DV',
        drive: 'DR',
        estates: 'EST',
        expressway: 'EXPY',
        extension: 'EXT',
        fall: 'FALL',
        ferry: 'FRY',
        field: 'FLD',
        flat: 'FLT',
        ford: 'FRD',
        forest: 'FRST',
        forge: 'FRG',
        fork: 'FRK',
        fort: 'FT',
        freeway: 'FWY',
        garden: 'GDN',
        gateway: 'GTWY',
        glade: 'GLD',
        glen: 'GLN',
        green: 'GRN',
        grove: 'GRV',
        harbor: 'HBR',
        haven: 'HVN',
        heights: 'HTS',
        highway: 'HWY',
        hill: 'HL',
        hollow: 'HOLW',
        inlet: 'INLT',
        island: 'IS',
        junction: 'JCT',
        key: 'KY',
        knoll: 'KNL',
        lake: 'LK',
        landing: 'LNDG',
        lane: 'LN',
        light: 'LGT',
        loaf: 'LF',
        lock: 'LCK',
        lodge: 'LDG',
        loop: 'LOOP',
        mall: 'MALL',
        manor: 'MNR',
        meadow: 'MDW',
        mews: 'MEWS',
        mill: 'ML',
        mission: 'MSN',
        mount: 'MT',
        mountain: 'MTN',
        neck: 'NCK',
        orchard: 'ORCH',
        oval: 'OVAL',
        park: 'PARK',
        parkway: 'PKWY',
        pass: 'PASS',
        path: 'PATH',
        pike: 'PIKE',
        pine: 'PNE',
        place: 'PL',
        plain: 'PLN',
        plaza: 'PLZ',
        point: 'PT',
        port: 'PRT',
        prairie: 'PR',
        radial: 'RADL',
        ranch: 'RNCH',
        rapid: 'RPD',
        ridge: 'RDG',
        river: 'RIV',
        road: 'RD',
        route: 'RTE',
        row: 'ROW',
        run: 'RUN',
        shoal: 'SHL',
        shore: 'SHR',
        spring: 'SPG',
        spur: 'SPUR',
        square: 'SQ',
        station: 'STA',
        street: 'ST',
        summit: 'SMT',
        terrace: 'TER',
        throughway: 'TRWY',
        trace: 'TRCE',
        track: 'TRAK',
        trail: 'TRL',
        tunnel: 'TUNL',
        turnpike: 'TPKE',
        valley: 'VLY',
        view: 'VW',
        village: 'VLG',
        vista: 'VIS',
        walk: 'WALK',
        way: 'WAY',
        well: 'WL',
        wood: 'WD',
        woods: 'WDS',
        // Directional Prefixes and Suffixes
        north: 'N',
        south: 'S',
        east: 'E',
        west: 'W',
        northeast: 'NE',
        northwest: 'NW',
        southeast: 'SE',
        southwest: 'SW',
        // Unit Designators
        apartment: 'APT',
        suite: 'STE',
        building: 'BLDG',
        floor: 'FL',
        unit: 'UNIT',
        room: 'RM',
        // Multi-word PO Box Variations
        'post office box': 'PO BOX',
        'p.o. box': 'PO BOX',
        pobox: 'PO BOX',
        'po box': 'PO BOX',

        // Single-word entries that won't affect already-normalized multi-word patterns
        box: 'BOX',
        'p.o.': 'PO',
        po: 'PO',
    };

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

    // Refined function to normalize address fields
    function normalizeAddressField(fieldValue) {
        if (!fieldValue) return fieldValue;

        // Split the input, normalize each word, and ensure uppercase
        return fieldValue
            .split(' ')
            .map((word) => addressNormalizationMap[word.toLowerCase()] || word.toUpperCase()) // Normalize known words; convert others to uppercase
            .join(' ');
    }

    function normalizeAddressField(fieldValue) {
        if (!fieldValue) return fieldValue;

        // Convert to lowercase for case-insensitive matching
        let normalizedAddress = fieldValue.toLowerCase();

        // Multi-word pre-check (replace multi-word phrases first)
        Object.keys(addressNormalizationMap).forEach((key) => {
            if (key.includes(' ')) {
                const regex = new RegExp(`\\b${key}\\b`, 'gi'); // word boundary to match the whole phrase
                normalizedAddress = normalizedAddress.replace(regex, addressNormalizationMap[key]);
            }
        });

        // Single-word replacement (replace remaining words individually)
        normalizedAddress = normalizedAddress
            .split(' ')
            .map((word) => addressNormalizationMap[word] || word.toUpperCase())
            .join(' ');

        return normalizedAddress;
    }

    // Function to normalize phone number
    function normalizedPhone(phone) {
        // Use isNullEmptyUndefined to check for null, undefined, or empty values
        if (isNullEmptyUndefined(phone)) {
            return '';
        }

        // Trim any leading or trailing whitespace and remove all non-numeric characters
        const digits = phone.trim().replace(/\D/g, '');

        // Check if the string has exactly 10 digits
        if (digits.length !== 10) {
            return '';
        }

        // Format the 10-digit number to the desired format
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // GET THE VALUES OF THE FIELDS
        const BusinessIDNumber = getFieldValueByName('Business ID Number', true);
        const BusinessName = getFieldValueByName('Business Name', true);
        const BusinessCountry = getFieldValueByName('Business Country', true);
        const BusinessZipCode = getFieldValueByName('Business Zip Code', true);
        const BusinessAddressLine1 = getFieldValueByName('Business Address Line 1', true);
        const BusinessAddressLine2 = getFieldValueByName('Business Address Line 2', true);
        const BusinessAddressLine3 = getFieldValueByName('Business Address Line 3', true);
        const BusinessCity = getFieldValueByName('Business City', true);
        const BusinessProvinceState = getFieldValueByName('Business Province State', true);
        const BusinessCounty = getFieldValueByName('Business County', true);
        const BusinessPhone = getFieldValueByName('Business Phone', true);
        const BusinessEmail = getFieldValueByName('Business Email', true);

        // Define parameters for custom query with trimming and normalization

        const addressLine1 = normalizeAddressField(BusinessAddressLine1);
        const addressLine2 = normalizeAddressField(BusinessAddressLine2);
        const addressLine3 = normalizeAddressField(BusinessAddressLine3);
        const city = isNullEmptyUndefined(BusinessCity) ? '' : BusinessCity.trim(); // Ensure the city value is passed without unnecessary normalization
        const phone = normalizedPhone(BusinessPhone);

        const customQueryData = {
            params: JSON.stringify([
                {
                    parameterName: 'BusinessIDNumberParam',
                    value: isNullEmptyUndefined(BusinessIDNumber) ? '' : BusinessIDNumber.trim(),
                },
                {
                    parameterName: 'BusinessNameParam',
                    value: isNullEmptyUndefined(BusinessName) ? '' : BusinessName.trim(),
                },
                {
                    parameterName: 'CountryParam',
                    value: isNullEmptyUndefined(BusinessCountry) ? '' : BusinessCountry.trim(),
                },
                {
                    parameterName: 'ZipCodeParam',
                    value: isNullEmptyUndefined(BusinessZipCode) ? '' : BusinessZipCode.trim(),
                },
                {
                    parameterName: 'AddressLine1Param',
                    value: isNullEmptyUndefined(BusinessAddressLine1) ? '' : addressLine1.trim(),
                },
                {
                    parameterName: 'AddressLine2Param',
                    value: isNullEmptyUndefined(BusinessAddressLine2) ? '' : addressLine2.trim(),
                },
                {
                    parameterName: 'AddressLine3Param',
                    value: isNullEmptyUndefined(BusinessAddressLine3) ? '' : addressLine3.trim(),
                },
                { parameterName: 'CityParam', value: isNullEmptyUndefined(BusinessCity) ? '' : city.trim() },
                {
                    parameterName: 'ProvinceStateParam',
                    value: isNullEmptyUndefined(BusinessProvinceState) ? '' : BusinessProvinceState.trim(),
                },
                {
                    parameterName: 'CountyParam',
                    value: isNullEmptyUndefined(BusinessCounty) ? '' : BusinessCounty.trim(),
                },
                { parameterName: 'PhoneParam', value: phone },
                { parameterName: 'EmailParam', value: isNullEmptyUndefined(BusinessEmail) ? '' : BusinessEmail.trim() },
            ]),
        };

        // Query execution and parsing
        shortDescription = 'Custom Query for Business Search';
        const businessSearchResults = await vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);

        returnObj = { results: businessSearchResults };

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success';
        outputCollection[1] = 'Business search returned successfully.';
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
