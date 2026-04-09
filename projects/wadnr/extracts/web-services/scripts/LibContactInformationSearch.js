/**
 * LibContactInformationSearch
 * Category: Workflow
 * Modified: 2025-12-17T13:44:58.457Z by federico.cuelho@visualvault.com
 * Script ID: Script Id: ff781944-bca6-ef11-82b5-feed5eacda0e
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
    Script Name:    ContactInformationSearch
    Customer:       WADNR
    Purpose:        The purpose of this web service is to return the results of the contact information search custom query.
    
    Preconditions:
                    - Contact Information records must be available in the system.

    Parameters:     First Name, Last Name, Country, Zip Code, 
                    Address Line 1, Address Line 2, Address Line 3, 
                    City, State, County, Phone, Email

    Return Object:
                    outputCollection[0]: Status
                    outputCollection[1]: Short description message
                    outputCollection[2]: Data

    Date of Dev:    10/29/2024
    Last Rev Date:  12/16/2025

    Revision Notes: 
                    10/29/2024 - Brian Davis: Initial setup
                    12/16/2025 - Federico Cuelho: Updated city parameter handling and normalization
    */

    logger.info(`Start of the process ContactInformationSearch at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    let outputCollection = [];
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const queryName = 'zWebSvc Contact Information Search';
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
        north: 'N',
        south: 'S',
        east: 'E',
        west: 'W',
        northeast: 'NE',
        northwest: 'NW',
        southeast: 'SE',
        southwest: 'SW',
        apartment: 'APT',
        suite: 'STE',
        building: 'BLDG',
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

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase();
        switch (dataType) {
            case 'string':
                if (param.trim().toLowerCase() === 'select item' || param.trim() === '') {
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

    function normalizeAddressField(fieldValue) {
        if (!fieldValue) return fieldValue;

        return fieldValue
            .split(' ')
            .map((word) => addressNormalizationMap[word.toLowerCase()] || word.toUpperCase())
            .join(' ');
    }

    function normalizedPhone(phone) {
        if (isNullEmptyUndefined(phone)) {
            return '';
        }

        const digits = phone.trim().replace(/\D/g, '');

        if (digits.length !== 10) {
            return '';
        }

        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        const FirstName = getFieldValueByName('First Name', true);
        const LastName = getFieldValueByName('Last Name', true);
        const Country = getFieldValueByName('Country', true);
        const ZipCode = getFieldValueByName('Zip Code', true);
        const AddressLine1 = normalizeAddressField(getFieldValueByName('Address Line 1', true));
        const AddressLine2 = normalizeAddressField(getFieldValueByName('Address Line 2', true));
        const AddressLine3 = normalizeAddressField(getFieldValueByName('Address Line 3', true));
        const City = isNullEmptyUndefined(getFieldValueByName('City', true))
            ? ''
            : getFieldValueByName('City', true).trim(); // Ensure the city value is passed without unnecessary normalization
        const State = getFieldValueByName('State', true);
        const County = getFieldValueByName('County', true);
        const Phone = normalizedPhone(getFieldValueByName('Phone', true));
        const Email = getFieldValueByName('Email', true);

        const customQueryData = {
            params: JSON.stringify([
                { parameterName: 'FirstNameParam', value: isNullEmptyUndefined(FirstName) ? '' : FirstName.trim() },
                { parameterName: 'LastNameParam', value: isNullEmptyUndefined(LastName) ? '' : LastName.trim() },
                { parameterName: 'CountryParam', value: isNullEmptyUndefined(Country) ? '' : Country.trim() },
                { parameterName: 'ZipCodeParam', value: isNullEmptyUndefined(ZipCode) ? '' : ZipCode.trim() },
                {
                    parameterName: 'AddressLine1Param',
                    value: isNullEmptyUndefined(AddressLine1) ? '' : AddressLine1.trim(),
                },
                {
                    parameterName: 'AddressLine2Param',
                    value: isNullEmptyUndefined(AddressLine2) ? '' : AddressLine2.trim(),
                },
                {
                    parameterName: 'AddressLine3Param',
                    value: isNullEmptyUndefined(AddressLine3) ? '' : AddressLine3.trim(),
                },
                { parameterName: 'CityParam', value: isNullEmptyUndefined(City) ? '' : City.trim() },
                { parameterName: 'StateParam', value: isNullEmptyUndefined(State) ? '' : State.trim() },
                { parameterName: 'CountyParam', value: isNullEmptyUndefined(County) ? '' : County.trim() },
                { parameterName: 'PhoneParam', value: Phone },
                { parameterName: 'EmailParam', value: isNullEmptyUndefined(Email) ? '' : Email.trim() },
            ]),
            expand: true, // Ensure all fields are retrieved from the form
        };

        const contactSearchResults = await vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, 'Custom Query for Contact Information Search'))
            .then((res) => checkDataPropertyExists(res, 'Custom Query for Contact Information Search'))
            .then((res) => res.data);

        outputCollection[0] = 'Success';
        outputCollection[1] = 'Contact information search returned successfully.';
        outputCollection[2] = { results: contactSearchResults };
    } catch (error) {
        logger.info(`Error encountered: ${error}`);
        outputCollection[0] = 'Error';
        outputCollection[1] = error.message || 'Unhandled error occurred.';
    } finally {
        response.json(200, outputCollection);
    }
};
