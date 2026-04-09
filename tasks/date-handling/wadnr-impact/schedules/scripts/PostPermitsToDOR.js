/**
 * PostPermitsToDOR
 * Category: Scheduled
 * Modified: 2026-03-10T19:43:54.857Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 9f828435-0556-f011-82de-c164249f95fb
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const { DateTime } = require('luxon');
const axios = require('axios');

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

// ▲ Keep secrets out of source control
const DOR_USERNAME = 'DNRTest';
const DOR_PASSWORD = 'PermitTesting';
const DOR_API_URL = 'https://dor-test-atlas.webservices.wa.gov/WATExternal/Services/DNRUpdate/DNRUpdate/';

/*Script Name:   PostPermitsToDOR
 Customer:       WA DNR: fpOnline
 Purpose:        Builds Department of Revenue (DOR) “permit” JSON payloads from fpOnline FPAN data
                 and posts them to DOR’s API on a 24-hour schedule. Also writes a success/failure
                 JSON log to the VisualVault (VV) document library and sends notification emails
                 + communication logs when failures occur.

                 Data Model (JSON Builders):
                 - Stakeholder: Represents an individual or business party on the permit (name/org, contact info, role).
                 - Location:    Represents legal location data (township, range, rangeDirection, section).
                 - Timber:      Represents harvest details (harvestAcres, harvestEstimatedMbfs).
                 - TaxAccount:  Represents forest tax account numbers and timber owner association.
                 - Permit:      Aggregates FPAN decision metadata + collections of Location/Stakeholder/Timber/TaxAccount.
                 - Permits:     Collection wrapper for multiple Permit objects with add/remove/count/toJSON.

                   Main Process Flow:
                 1° Query for FPANs updated in last 24 hours with Approved/Renewed statuses
                    (Custom Query: DORCheckApplicationReviewPageStatus).
                 2° Query for transfers recorded in last 24 hours
                    (Custom Query: DORNoticeOfTransfer).
                 3° For each Approved/Renewed FPAN:
                    - Create Permit
                    - Map decision metadata (fpId/status/tax credits/modify/effective/expiration)
                    - Load all related permit detail (contacts/business/timber/legal/tax accounts) via DORGetFPANData
                    - Add Permit to Permits collection; track related formIds + fpanNums.
                 4° For each transfer record:
                    - Query Application Review Page details (Custom Query: DORApplicationReviewPage)
                    - Create Permit(s), set decision to “Transferred”, store transfer-to flags
                      (operator/timber owner/landowner transfer indicators)
                    - If needed, derive lastModifyDate from transfer “date Status Changed”
                    - Load all related permit detail (same as above) and add to Permits collection.
                 5° If no permits were found (Permits.count === 0):
                    - Return “No new permits found in last 24 hours.”
                    - Complete scheduled process with success and message.
                 6° If permits exist:
                    - POST the Permits JSON payload to DOR API using Basic Auth (axios)
                      Endpoint: https://dor-test-atlas.webservices.wa.gov/WATExternal/Services/DNRUpdate/DNRUpdate/
                    - If HTTP 200 and payload.Result === “Success”:
                      a) Ensure VV doc library folder exists: /DOR/<MM-dd-yyyy>/
                      b) Write success JSON log document to VV doc library (permits.toJSON()).
                      c) Return success response with formIds + FPAN numbers.
                    - If HTTP 200 and payload.Result === “Failed”:
                      a) Retrieve email template (Custom Query: DORGetPermitFailedEmail)
                      b) Send notification email + communication log (Web Service: LibEmailGenerateAndCreateCommunicationLog)
                      c) Ensure VV doc library folder exists and write failed JSON log.
                      d) Return failure response with error message, formIds, FPAN numbers, and permits payload.
                    - If non-200 response:
                      - Log and return “DOR API failed with status ...”.

                 0° Global Error Handling:
                    - On any unexpected exception:
                      a) Send failure notification email + communication log (template query referenced in catch)
                      b) Return HTTP 500 with error details + collected formIds/FPAN numbers
                      c) Mark scheduled process completion as failed with error message.

 Date of Dev:   06/10/2025
 Last Rev Date: 
 Revision Notes:
 06/10/2025 - Ross Rhone:  First setup of the script and DOR JSON data model classes.
 07/02/2025 - Ross Rhone:  Added scheduled process notifications (email + communication log) and VV doc library logging.
 01/20/2026 - Ross Rhone:  Added the fields Transfer To Landowner, Transfer To Timber Owner, Transfer To Operator, 
              for a notice of transfer to add visibility on where the permit was transferred to for the deparment of revenue.
02/02/2026 -  Ross Rhone: Updating to DOR's API new response
*/

// Class representing a Stakeholder with preset fields
class Stakeholder {
    constructor() {
        // Initialize all fields with default values
        this._orgName = null;
        this._lastName = '';
        this._firstName = '';
        this._email = '';
        this._phoneNumber = '';
        this._addressLine1 = '';
        this._city = '';
        this._state = '';
        this._zipCode = '';
        this._countryName = '';
        this._role = '';
    }

    // Getter and setter for ORG_NAME
    get orgName() {
        return this._orgName;
    }
    set orgName(value) {
        this._orgName = value;
    }

    // Getter and setter for LAST_NAME
    get lastName() {
        return this._lastName;
    }
    set lastName(value) {
        this._lastName = value;
    }

    // Getter and setter for FIRST_NAME
    get firstName() {
        return this._firstName;
    }
    set firstName(value) {
        this._firstName = value;
    }

    // Getter and setter for EMAIL
    get email() {
        return this._email;
    }
    set email(value) {
        this._email = value;
    }

    // Getter and setter for PHONE_NUMBER
    get phoneNumber() {
        return this._phoneNumber;
    }
    set phoneNumber(value) {
        this._phoneNumber = value;
    }

    // Getter and setter for ADDRESS_LINE1
    get addressLine1() {
        return this._addressLine1;
    }
    set addressLine1(value) {
        this._addressLine1 = value;
    }

    // Getter and setter for CITY
    get city() {
        return this._city;
    }
    set city(value) {
        this._city = value;
    }

    // Getter and setter for STATE
    get state() {
        return this._state;
    }
    set state(value) {
        this._state = value;
    }

    // Getter and setter for ZIP_CODE
    get zipCode() {
        return this._zipCode;
    }
    set zipCode(value) {
        this._zipCode = value;
    }

    // Getter and setter for COUNTRY_NAME
    get countryName() {
        return this._countryName;
    }
    set countryName(value) {
        this._countryName = value;
    }

    // Getter and setter for COUNTRY_NAME
    get role() {
        return this._role;
    }
    set role(value) {
        this._role = value;
    }

    toJSON() {
        return {
            orgName: this._orgName,
            lastName: this._lastName,
            firstName: this._firstName,
            email: this._email,
            phoneNumber: this._phoneNumber,
            taxAccountNumber: this._taxAccountNumber,
            addressLine1: this._addressLine1,
            city: this._city,
            state: this._state,
            zipCode: this._zipCode,
            countryName: this._countryName,
            role: this._role,
        };
    }
}

// Class representing a Location which holds a Stakeholder
class Location {
    constructor() {
        this._township = null;
        this._range = null;
        this._rangeDirection = '';
        this._section = null;
    }

    // Getter and setter for TOWNSHIP_NUMBER
    get township() {
        return this._township;
    }
    set township(value) {
        this._township = value;
    }

    // Getter and setter for RANGE_NUMBER
    get range() {
        return this._range;
    }
    set range(value) {
        this._range = value;
    }

    // Getter and setter for RANGE_DIRECTION
    get rangeDirection() {
        return this._rangeDirection;
    }
    set rangeDirection(value) {
        this._rangeDirection = value;
    }

    // Getter and setter for SECTION_NUMBER
    get section() {
        return this._section;
    }
    set section(value) {
        this._section = value;
    }

    // Custom toJSON method
    toJSON() {
        return {
            township: this._township,
            range: this._range,
            rangeDirection: this._rangeDirection,
            section: this._section,
        };
    }
}

// Collection class that stores many Permit instances
class Permits {
    constructor() {
        /** @type {Permit[]} */
        this._items = [];
    }

    /** Returns an array of all Permit objects (read-only). */
    get all() {
        // return a shallow copy so callers can’t mutate the private array directly
        return [...this._items];
    }

    /**
     * Add a Permit to the collection.
     * @param {Permit} permit
     */
    add(permit) {
        if (permit instanceof Permit) {
            this._items.push(permit);
        } else {
            throw new Error('Expected an instance of Permit');
        }
    }

    /**
     * Remove a Permit instance (by reference). Returns true if removed.
     * @param {Permit} permit
     */
    remove(permit) {
        const idx = this._items.indexOf(permit);
        if (idx !== -1) {
            this._items.splice(idx, 1);
            return true;
        }
        return false;
    }

    /** Number of permits in the collection. */
    get count() {
        return this._items.length;
    }

    /** Simple iterator so you can `for … of` over Permits. */
    [Symbol.iterator]() {
        return this._items[Symbol.iterator]();
    }

    /** Serialises the entire collection to plain JSON. */
    toJSON() {
        return this._items; // each Permit’s own toJSON gets called
    }
}

// Class representing a Permit with permit activity and a list of locations
class Permit {
    constructor() {
        this._fpId = '';
        this._fpDecision = '';
        this._EARRTaxCredits = '';
        this._lastModifyDate = '';
        this._effectiveDate = '';
        this._expirationDate = '';
        this._locations = []; // Array of Location objects
        this._timber = []; // Array of Timber objects
        this._stakeholders = [];
        this._taxAccounts = [];
        this._operatorTransferred = '';
        this._timberOwnerTransferred = '';
        this._landOwnerTransferred = '';
    }

    // Getter and setter for fpDecision
    get fpId() {
        return this._fpId;
    }
    set fpId(value) {
        this._fpId = value;
    }

    // Getter and setter for fpDecision
    get fpDecision() {
        return this._fpDecision;
    }
    set fpDecision(value) {
        this._fpDecision = value;
    }

    // Getter and setter for EARRTaxCredits
    get EARRTaxCredits() {
        return this._EARRTaxCredits;
    }
    set EARRTaxCredits(value) {
        this._EARRTaxCredits = value;
    }

    // Getter and setter for lastModifyDate
    get lastModifyDate() {
        return this._lastModifyDate;
    }
    set lastModifyDate(value) {
        this._lastModifyDate = value;
    }

    // Getter and setter for effectiveDate
    get effectiveDate() {
        return this._effectiveDate;
    }
    set effectiveDate(value) {
        this._effectiveDate = value;
    }

    // Getter and setter for expirationDate
    get expirationDate() {
        return this._expirationDate;
    }
    set expirationDate(value) {
        this._expirationDate = value;
    }

    // Getter and setter for locations
    get locations() {
        return this._locations;
    }
    set locations(value) {
        this._locations = value;
    }

    // Getter and setter for timber
    get timber() {
        return this._timber;
    }
    set timber(value) {
        this._timber = value;
    }

    get stakeholders() {
        return this._stakeholders;
    }
    // Setter for the stakeholders array. Expects an array.
    set stakeholders(value) {
        if (Array.isArray(value)) {
            this._stakeholders = value;
        } else {
            throw new Error('stakeholders must be an array');
        }
    }

    get operatorTransferred() {
        return this._operatorTransferred;
    }

    set operatorTransferred(value) {
        this._operatorTransferred = value;
    }

    get timberOwnerTransferred() {
        return this._timberOwnerTransferred;
    }

    set timberOwnerTransferred(value) {
        this._timberOwnerTransferred = value;
    }

    get landOwnerTransferred() {
        return this._landOwnerTransferred;
    }

    set landOwnerTransferred(value) {
        this._landOwnerTransferred = value;
    }

    // Convenience method to add a Location
    addLocation(location) {
        if (location instanceof Location) {
            this._locations.push(location);
        } else {
            throw new Error('Parameter must be an instance of Location');
        }
    }

    // Method to add a single Stakeholder to the Permit.
    addStakeholder(stakeholder) {
        // You can enforce type-checking if you have a Stakeholder class.
        if (stakeholder instanceof Stakeholder) {
            this._stakeholders.push(stakeholder);
        } else {
            throw new Error('Expected an instance of Stakeholder');
        }
    }

    // Method to add a single Timber to the Permit.
    addTimber(timber) {
        // You can enforce type-checking if you have a Stakeholder class.
        if (timber instanceof Timber) {
            this._timber.push(timber);
        } else {
            throw new Error('Expected an instance of Timber');
        }
    }

    // Method to add a single Stakeholder to the Permit.
    addTaxAccount(taxAccount) {
        // You can enforce type-checking if you have a Stakeholder class.
        if (taxAccount instanceof TaxAccount) {
            this._taxAccounts.push(taxAccount);
        } else {
            throw new Error('Expected an instance of TaxAccount');
        }
    }

    // Custom toJSON method that calls toJSON on nested objects
    toJSON() {
        return {
            fpId: this._fpId,
            fpDecision: this._fpDecision,
            EARRTaxCredits: this._EARRTaxCredits,
            lastModifyDate: this._lastModifyDate,
            effectiveDate: this._effectiveDate,
            expirationDate: this._expirationDate,
            locations: this._locations, // Each location's toJSON will be used
            timber: this._timber, // Each timber's toJSON will be used
            stakeholders: this._stakeholders, // Each stakeholder's toJSON will be used
            taxAccounts: this._taxAccounts,
            timberOwnerTransferred: this._timberOwnerTransferred,
            landOwnerTransferred: this._landOwnerTransferred,
            operatorTransferred: this._operatorTransferred,
        };
    }
}

// Class representing Timber
class Timber {
    constructor() {
        this._harvestAcres = null;
        this._harvestEstimatedMbfs = null;
    }

    // Getter and setter for permit_activity
    get harvestAcres() {
        return this._harvestAcres;
    }
    set harvestAcres(value) {
        this._harvestAcres = value;
    }

    // Getter and setter for locations
    get harvestEstimatedMbfs() {
        return this._harvestEstimatedMbfs;
    }
    set harvestEstimatedMbfs(value) {
        this._harvestEstimatedMbfs = value;
    }

    // Custom toJSON method
    toJSON() {
        return {
            harvestAcres: this._harvestAcres,
            harvestEstimatedMbfs: this._harvestEstimatedMbfs,
        };
    }
}

// Class representing Forest Tax Numbers
class TaxAccount {
    constructor() {
        this._timberOwner = null;
        this._taxAccountNumber = null;
    }

    // Getter and setter for permit_activity
    get timberOwner() {
        return this._timberOwner;
    }
    set timberOwner(value) {
        this._timberOwner = value;
    }

    // Getter and setter for locations
    get taxAccountNumber() {
        return this._taxAccountNumber;
    }
    set taxAccountNumber(value) {
        this._taxAccountNumber = value;
    }

    // Custom toJSON method
    toJSON() {
        return {
            timberOwner: this._timberOwner,
            taxAccountNumber: this._taxAccountNumber,
        };
    }
}

module.exports.main = async function (vvClient, response, token) {
    /*Script Name:   PostPermitsToDOR
     Customer:       WA FNR: fpOnline
     Purpose:        Extracts the data from the FPAN that has an approved / renewed status 
                     or an FPAN that has a notice transfer with a recorded date in the last 24 hours.
                     Transform that data in the Department Of Revenue's (DOR) JSON format
                     Scheduled service that runs every 24 hrs to POST data to DOR's API.
                     
                     1° Runs two sql queries to get the Approved/Renewed FPANs (DORCheckApplicationReviewPageStatus) and
                        Transfers recorded (DORNoticeOfTransfer) in the last 24 hrs
                     2° Extract / Transform the Approved/Renewed records
                     3° Extract / Transform the Transferred records
                     4° Load the newly created Permit's JSON to the Department Of Revenue (DOR)'s API (https://dor-test-atlas.webservices.wa.gov/WATExternal/Services/DNRUpdate/DNRUpdate/)
                     4a° If No Permits found in the last 24 hours don't send data to DOR.
                     5° Send notification email and communication log when DOR api fails (email template "Scheduled Service - Post Permits to DOR")
                     6° Send log of Permits as a JSON to VV's doc lib (Success or fail) Ex. "0001_failed_00:58:55:814Z" or "0001_success_00:58:55:814Z"
                     located in /DOR/MM-dd-yyyy/ of the doc library.
  
                     0° Error handling will also send a notification email and a communction log (email template "Scheduled Service - Post Permits to DOR")
  
     Date of Dev:   06/10/2025
     Last Rev Date: 
     Revision Notes:
     06/10/2025 - Ross Rhone:  First Setup of the script
     07/02/2025 - Ross Rhone: Setup the scheduled script with the notification email and communication log
     */
    logger.info(`Start of the process PostPermitsToDOR at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Global Variables                           */
    /* -------------------------------------------------------------------------- */

    // Identifies the process in VV servers
    const scheduledProcessGUID = token;

    const formIds = new Set();
    const fpanNums = new Set();
    const formToFpanMap = new Map();

    const emptyJsonFormId = {
        params: JSON.stringify([
            {
                parameterName: 'formId',
                value: '',
            },
        ]),
    };

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

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
        Checks that the data property of a vvCliente API response object is not empty
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
                console.log('vvClientRest : ' + vvClientRes);
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

    function determineRoles(row) {
        const roles = [];
        // row.landowner = "True"? Then roles.push("landowner")
        if (row.landowner === 'True') roles.push('landowner');
        if (row['timber Owner'] === 'True') roles.push('timberowner');
        if (row.operator === 'True') roles.push('operator');
        return roles;
    }

    function getStakeHolderRole(row) {
        // Create an empty hash map.
        const hashMap = new Map();

        // 1) Determine roles
        const roles = determineRoles(row);
        if (roles.length === 0) {
            return hashMap;
        }

        // 2) We might read a "relation type" from the row or default to "Unknown"
        const relationType = row['relation Type'] || 'Unknown';
        // (only if your query returns "relation Type" field)

        // 3) For each role, push data into the hash map
        roles.forEach((role) => {
            const key = `${role}_${relationType}`;
            if (!hashMap.has(key)) {
                hashMap.set(key, []);
            }
            // push entire row into the array
            hashMap.get(key).push(row);
        });
        return hashMap;
    }

    function setLastModifyDateUnix(lastModifyDate, permit) {
        if (lastModifyDate) {
            const zone = 'America/Los_Angeles';

            const lastModifyDateUnix = DateTime.fromFormat(lastModifyDate, 'MM/dd/yyyy HH:mm:ss', { zone }).toSeconds();

            permit._lastModifyDate = lastModifyDateUnix;
        }
    }

    async function setApplicationReviewPageData(permit, fpanPermit) {
        const fpanNumber = fpanPermit['fpaN Number'];
        const fpDecision = fpanPermit['fpaN Status'];
        let EARRTaxCredits;

        if (fpanPermit['earR Tax Eligibility'] === 'True' || fpanPermit['earR Tax Eligibility'] === 'Yes') {
            EARRTaxCredits = 'Y';
        } else if (fpanPermit['earR Tax Eligibility'] === 'False' || fpanPermit['earR Tax Eligibility'] === 'No') {
            EARRTaxCredits = 'N';
        }

        const lastModifyDate = fpanPermit['fpaN Status Updated At'];
        const expirationDate = fpanPermit['fpaN Decision Expiration Date'];
        const effectiveDate = fpanPermit['fpaN Decision Effective Date'];

        setLastModifyDateUnix(lastModifyDate, permit);

        if (expirationDate) {
            const expirationDateUnix = DateTime.fromISO(expirationDate).toSeconds();
            permit._expirationDate = expirationDateUnix;
        }

        if (effectiveDate) {
            const effectiveDateUnix = DateTime.fromISO(effectiveDate).toSeconds();
            permit._effectiveDate = effectiveDateUnix;
        }

        permit._fpId = fpanNumber;
        permit._fpDecision = fpDecision;
        permit._EARRTaxCredits = EARRTaxCredits;

        return permit;
    }

    //This function is used to set the data for an FPAN
    // with a status of "Approved" or "Renewed"
    async function setFPANPermitData(fpanPermit) {
        const permit = new Permit();

        await setApplicationReviewPageData(permit, fpanPermit);

        const formId = fpanPermit['related Record ID'];
        const fpanNum = fpanPermit['fpaN Number'];

        await setAllPermitData(permit, formId);

        return { permit, formId, fpanNum };
    }

    async function setAllPermitData(permit, formId) {
        const jsonFormId = {
            params: JSON.stringify([
                {
                    parameterName: 'formId',
                    value: formId,
                },
            ]),
        };

        const SQLfpanData = await testCustomQuery(jsonFormId, 'DORGetFPANData');

        // Build sets of distinct records
        const distinctContactInfoRel = new Map();
        const distinctContactInfor = new Map();
        const distinctTimber = new Map();
        const distinctLegal = new Map();
        const distinctBusiness = new Map();
        const distinctForestTaxMap = new Map();

        for (const row of SQLfpanData) {
            if (row['contact Information Relation ID']) {
                distinctContactInfoRel.set(row['contact Information Relation ID'], row);
            }
            if (row['contact Information ID']) {
                distinctContactInfor.set(row['contact Information ID'], row);
            }
            if (row['timber ID']) {
                distinctTimber.set(row['timber ID'], row);
            }
            if (row['form ID']) {
                distinctLegal.set(row['form ID'], row);
            }
            if (row['business ID']) {
                distinctBusiness.set(row['business ID'], row);
            }
            if (row['forest Tax Number']) {
                if (!distinctForestTaxMap.has(row['forest Tax Number'])) {
                    distinctForestTaxMap.set(row['forest Tax Number'], row);
                }
            }
        }

        // Convert the distinct records into arrays
        const cirRecords = [...distinctContactInfoRel.values()];
        const ciRecords = [...distinctContactInfor.values()];
        const timRecords = [...distinctTimber.values()];
        const legRecords = [...distinctLegal.values()];
        const biRecords = [...distinctBusiness.values()];
        const distinctForestTaxRecords = [...distinctForestTaxMap.values()];

        // Merge both arrays into one
        const stakeholderRecords = [...ciRecords, ...biRecords];

        for (const forestTaxForm of distinctForestTaxRecords) {
            const taxAccountNumbers = new TaxAccount();

            //Forest Tax Record Form
            taxAccountNumbers.taxAccountNumber = forestTaxForm['forest Tax Number'];
            taxAccountNumbers.timberOwner = forestTaxForm['tax Timber Owner'];

            permit.addTaxAccount(taxAccountNumbers);
        }

        for (const row of stakeholderRecords) {
            const roles = getStakeHolderRole(row);

            // loop over each key to create Stakeholders
            for (const [key, rowGroup] of roles.entries()) {
                for (const row of rowGroup) {
                    const stakeholder = new Stakeholder();
                    // Individual Records
                    if (key.includes('Individual')) {
                        stakeholder.firstName = row['first Name'];
                        stakeholder.lastName = row['last Name'];
                        stakeholder.zipCode = row['zip Code'];
                        stakeholder.addressLine1 = row['address Line 1'];
                        stakeholder.city = row['city'];
                        stakeholder.state = row['state'];
                        stakeholder.countryName = row['country'];
                        stakeholder.phoneNumber = row['phone'];
                        stakeholder.email = row['email'];
                        stakeholder.role = key;
                        // Business Signer Records
                    } else if (
                        row['relation Type'] === 'Business' &&
                        row['contact Information ID']?.startsWith('CONTACT')
                    ) {
                        stakeholder.firstName = row['first Name'];
                        stakeholder.lastName = row['last Name'];
                        stakeholder.zipCode = row['zip Code'];
                        stakeholder.addressLine1 = row['address Line 1'];
                        stakeholder.city = row['city'];
                        stakeholder.state = row['state'];
                        stakeholder.countryName = row['country'];
                        stakeholder.phoneNumber = row['phone'];
                        stakeholder.email = row['email'];
                        stakeholder.role = key;
                        // Business Records
                    } else if (key.includes('Business')) {
                        stakeholder.orgName = row['business Name'];
                        stakeholder.addressLine1 = row['business Address Line 1'];
                        stakeholder.addressLine2 = row['business Address Line 2'];
                        stakeholder.addressLine3 = row['business Address Line 3'];
                        stakeholder.city = row['business City'];
                        stakeholder.state = row['business Province State'];
                        stakeholder.countryName = row['business County'];
                        stakeholder.email = row['business Email'];
                        stakeholder.phoneNumber = row['business Phone'];
                        stakeholder.zipCode = row['business Zip Code'];
                        stakeholder.role = key;
                    } else {
                        logger.info(
                            'PostPermitsToDOR: Error : Incorrect relation type set',
                            key,
                            row['contact Information Relation ID']
                        );
                        continue;
                    }
                    // Add them to the permit
                    permit.addStakeholder(stakeholder);
                }
            }
        }

        for (const timberForm of timRecords) {
            const timber = new Timber();

            //Timber Record Form
            timber.harvestAcres = timberForm['acres harvested'];
            timber.harvestEstimatedMbfs = timberForm['biomass Volume Harvested'];

            permit.addTimber(timber);
        }

        for (const legalForm of legRecords) {
            //write logic in here to check if the legal form has a township, range, section before creating the location and adding it to the permit, if not skip it and log it since those are required fields for the DOR JSON
            if (!legalForm['township'] || !legalForm['range'] || !legalForm['section']) {
                logger.info(
                    'PostPermitsToDOR: Skipping location record because required fields are missing',
                    legalForm
                );
                continue;
            }

            //Create locations with its stakeholder data
            const location = new Location();

            location.township = parseInt(legalForm['township'], 10);
            location.range = parseInt(legalForm['range'], 10);
            location.rangeDirection = legalForm['range Direction'];
            location.section = parseInt(legalForm['section'], 10);

            permit.addLocation(location);
        }

        return permit;
    }

    function testCustomQuery(formId, queryName) {
        const shortDescription = 'Custom Query using filter parameter for backward compatibility';

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, formId)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function sendNotificationEmail(relatedRecordIDs, emailTemplate, tokens) {
        const emailRequestArr = [
            { name: 'Email Name', value: 'Schedule Service - Post Permits to DOR' },
            { name: 'Tokens', value: tokens },
            { name: 'Email Address', value: emailTemplate['send To'] },
            { name: 'Email AddressCC', value: emailTemplate['send CC'] },
            { name: 'SendDateTime', value: new Date().toISOString() },
            { name: 'RELATETORECORD', value: relatedRecordIDs },
            {
                name: 'OTHERFIELDSTOUPDATE',
                value: {},
            },
        ];
        const [LibEmailGenerateAndCreateCommunicationLogStatus, , comLogResult] = await callExternalWs(
            'LibEmailGenerateAndCreateCommunicationLog',
            emailRequestArr
        );

        if (LibEmailGenerateAndCreateCommunicationLogStatus !== 'Success') {
            throw new Error('Error sending notifications.');
        }

        return comLogResult;
    }

    async function createFolder(folderPath, description) {
        const shortDescription = `Post folder '${folderPath}'`;
        const folderData = {
            description,
        };

        return vvClient.library
            .postFolderByPath(null, folderData, folderPath)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data.id);
    }

    async function getFolderId(folderPath) {
        const shortDescription = `Get folder ${folderPath}`;
        // Status code 403 must be ignored (not throwing error) because it means that the folder doesn't exist
        const ignoreStatusCode = 403;
        const getFolderParams = {
            folderPath,
        };

        return vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataIsNotEmpty(res, shortDescription, ignoreStatusCode))
            .then((res) => (res.data ? res.data.id : null));
    }

    async function postDoc(docName, folderId) {
        const shortDescription = `DOR FPAN Permit(s) '${docName}'`;
        const docParams = {
            documentState: 1,
            name: `${docName}`,
            description: `DOR FPAN Permit(s) ${docName}`,
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${docName}.json`,
            indexFields: '{}',
            folderId: folderId,
        };

        return vvClient.documents
            .postDoc(docParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function postFile(docData, fileBuffer) {
        const shortDescription = `Post file for '${docData.name}'`;
        const fileParams = {
            documentId: `${docData.id}`,
            name: `${docData.name}`,
            revision: '1',
            changeReason: 'DOR permit POSTED',
            checkInDocumentState: 'Released',
            fileName: `${docData.fileName}`,
            indexFields: '{}',
        };

        return vvClient.files
            .postFile(fileParams, fileBuffer)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function createDocName(fpanNumsArr, currentDate, isSuccess) {
        const fpanNumsStr = fpanNumsArr
            .map((num) => num.match(/\d{4}$/)?.[0]) // match last 4 digits
            .filter(Boolean) // remove nulls in case of failed match
            .join('_')
            .slice(0, 20);

        const currentDateTime = currentDate.toISOString().split('T')[1]; // "23:19:29.093Z"
        let docName = '';
        // Create document in the VV Document Library
        if (isSuccess) {
            docName = fpanNumsStr + '_success_' + currentDateTime;
        } else {
            docName = fpanNumsStr + '_failed_' + currentDateTime;
        }
        return docName;
    }

    async function putPermitsInVVDocLib(docName, folderId, permits) {
        const docData = await postDoc(docName, folderId);

        const jsonString = JSON.stringify(permits.toJSON(), null, 2); // optional `null, 2` for pretty-print
        const fileBuffer = Buffer.from(jsonString, 'utf-8');

        // Post file into the document
        const fileData = await postFile(docData, fileBuffer);
        console.log(fileData);
    }

    /**
     * uses vvClient to detect the current environment
     * @param {object} vvClient
     * @returns "dev" | "qa" | "sandbox" | "production"
     */
    function detectEnvironment(vvClient) {
        // Define known environments and their identifying URL segments.  Add or modify as needed.
        const environments = {
            'vv5dev.visualvault.com': '_dev',
            'vv5qa.visualvault.com': '_dev',
            'sandbox.visualvault-gov.com': '_sbox',
            'na5.visualvault.com': '_prod',
        };
        const envUrl = vvClient.getBaseUrl();

        // Find environment by checking if envUrl contains any of the environment keys
        for (const [envKey, envType] of Object.entries(environments)) {
            if (envUrl.includes(envKey)) {
                return envType;
            }
        }

        return 'unknown';
    }

    const currentEnv = detectEnvironment(vvClient);

    async function postWithRetry({ url, data, headers, timeout = 200_000, maxRetries = 3, baseDelayMs = 20_000 }) {
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                return await axios.post(url, data, {
                    headers,
                    timeout,
                });
            } catch (err) {
                attempt++;

                const isTimeout = err.code === 'ECONNABORTED';
                const status = err.response?.status;
                const isRetryableStatus = status >= 500 && status < 600;
                const isNetworkError = !err.response;

                if (attempt > maxRetries || (!isTimeout && !isRetryableStatus && !isNetworkError)) {
                    // Not retryable OR out of retries
                    throw err;
                }

                const delay = baseDelayMs * Math.pow(2, attempt - 1);

                console.warn(`DOR POST failed (attempt ${attempt}/${maxRetries})`, {
                    reason: isTimeout ? 'timeout' : isRetryableStatus ? `HTTP ${status}` : 'network error',
                    retryInMs: delay,
                });

                await new Promise((res) => setTimeout(res, delay));
            }
        }
    }

    function getFormIdsByFpans(formToFpanArr, fpanNums = []) {
        return fpanNums.map((fpan) => formToFpanArr.find((item) => item.fpanNum === fpan)?.formId).filter(Boolean); // remove undefined
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° Check if there are any approved/renewed/recorded FPAN permits in the last 24 hrs

        const updatedFPANPermits = await testCustomQuery(emptyJsonFormId, 'DORCheckApplicationReviewPageStatus');

        const newRecordedTransfers = await testCustomQuery(emptyJsonFormId, 'DORNoticeOfTransfer');

        // 2° Extract and Transform for approved/renewed FPAN permits
        const mappedApproved = await Promise.all(updatedFPANPermits.map(setFPANPermitData));

        const permits = new Permits();

        mappedApproved.forEach(({ permit, formId, fpanNum }) => {
            permits.add(permit);
            formIds.add(formId);
            fpanNums.add(fpanNum);
            formToFpanMap.set(formId, fpanNum);
        });

        // 3° Extract and Transform for recorded FPAN permits
        for (const newRecordedTransfer of newRecordedTransfers) {
            const transferRelatedRecordFormId = newRecordedTransfer['related Record Id'];
            const transferFormId = newRecordedTransfer['top Form ID'];
            const fpanNum = newRecordedTransfer['fpaN Number'];
            const transferToLandowner = newRecordedTransfer['transfer To Landowner'];
            const transferToTimberOwner = newRecordedTransfer['transfer To Timber Owner'];
            const transferToOperator = newRecordedTransfer['transfer To Operator'];

            formIds.add(transferRelatedRecordFormId);
            formIds.add(transferFormId);
            fpanNums.add(fpanNum);

            const jsonFormId = {
                params: JSON.stringify([
                    {
                        parameterName: 'fpanNum',
                        value: fpanNum,
                    },
                ]),
            };

            const newRecordedPermits = await testCustomQuery(jsonFormId, 'DORApplicationReviewPage');

            for (const newRecordedPermit of newRecordedPermits) {
                const permit = new Permit();

                await setApplicationReviewPageData(permit, newRecordedPermit);
                permit._fpDecision = 'Transferred';
                permit._operatorTransferred = transferToOperator;
                permit._landOwnerTransferred = transferToLandowner;
                permit._timberOwnerTransferred = transferToTimberOwner;

                if (!permit.lastModifyDate) {
                    const lastModifyDate = newRecordedTransfer['date Status Changed'];
                    setLastModifyDateUnix(lastModifyDate, permit);
                }

                await setAllPermitData(permit, transferRelatedRecordFormId);

                permits.add(permit);
            }
        }

        // helper to convert Sets ? arrays exactly once
        const formIdsArr = [...formIds];
        const fpanNumsArr = [...fpanNums];
        const formToFpanArr = [...formToFpanMap.entries()].map(([formId, fpanNum]) => ({ formId, fpanNum }));

        let status;
        let statusMessage;

        // 4° POST JSON to DOR's API
        if (permits.count !== 0) {
            // ? Encode "user:pass" ? base64, per RFC 7617
            const basicAuth = Buffer.from(`${DOR_USERNAME}:${DOR_PASSWORD}`).toString('base64');

            const res = await postWithRetry({
                url: DOR_API_URL,
                data: permits,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Basic ${basicAuth}`,
                },
                timeout: 100_000, //100 seconds
                maxRetries: 3,
            });

            if (res.status === 200) {
                const payload = res.data;

                if (payload) {
                    //Post folder by path...
                    const currentDate = new Date();
                    const formattedDate = currentDate.toLocaleDateString('en-US', {
                        timeZone: 'America/Los_Angeles',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    });

                    // replace slashes for folder path
                    const sanitizedDate = formattedDate.replace(/\//g, '-');

                    const folderPath = `/DOR/${sanitizedDate}`;
                    const descriptionTest = 'TestDescription';

                    if (payload?.SucessfulPermits && payload.SucessfulPermits.length > 0) {
                        const successfulPermitsResp = payload.SucessfulPermits;
                        status = 'Success';
                        statusMessage = 'Posted permit(s) to the Department Of Revenue';

                        //6° Send log of Permits as a JSON to VV's doc lib (Success or fail)
                        //first check if that folder already exists. If it does then skip the part of creating it.
                        let folderId = '';
                        folderId = await getFolderId(folderPath);

                        if (folderId === null) {
                            folderId = await createFolder(folderPath, descriptionTest);
                        }

                        const validPermitNumbers = successfulPermitsResp
                            .filter((item) => item?.Valid === true)
                            .map((item) => item.Permits);

                        if (validPermitNumbers.length > 0) {
                            const validDocName = createDocName(validPermitNumbers, currentDate, true);
                            await putPermitsInVVDocLib(validDocName, folderId, permits);
                        }

                        const invalidPermitNumbers = successfulPermitsResp
                            .filter((item) => item?.Valid === false)
                            .map((item) => item.Permits);

                        if (invalidPermitNumbers.length > 0) {
                            const invalidDocName = createDocName(invalidPermitNumbers, currentDate, false);
                            await putPermitsInVVDocLib(invalidDocName, folderId, permits);

                            const invalidMessages = successfulPermitsResp
                                .filter((item) => item?.Valid === false && item?.Message)
                                .map((item) => ({
                                    permit: item.Permits,
                                    message: item.Message,
                                }));

                            if (invalidMessages.length > 0) {
                                const emailTemplate = await testCustomQuery(emptyJsonFormId, 'DORGetPermitFailedEmail');
                                const errorMessageInvalid = JSON.stringify(invalidMessages);

                                const tokens = [
                                    { name: 'relatedRecordIDs', value: formIdsArr },
                                    { name: 'fpanNumbers', value: invalidPermitNumbers },
                                    { name: 'status', value: status },
                                    { name: 'message', value: errorMessageInvalid },
                                    { name: 'environment', value: currentEnv },
                                ];

                                const formIds = getFormIdsByFpans(formToFpanArr, invalidPermitNumbers);
                                await sendNotificationEmail(formIds, emailTemplate[0], tokens);
                            }
                        }
                    }
                    //5° Send notification email and communication log when DOR api fails
                    if (payload?.FailedPermits && payload.FailedPermits.length > 0) {
                        const failedPermitsResp = payload.FailedPermits;

                        status = 'Failed';
                        const errorMessage = JSON.stringify(failedPermitsResp);
                        statusMessage =
                            'Failed to post permit(s) to the Department Of Revenue. Error : ' + errorMessage;

                        const emailTemplate = await testCustomQuery(emptyJsonFormId, 'DORGetPermitFailedEmail');

                        const tokens = [
                            { name: 'relatedRecordIDs', value: formIdsArr },
                            { name: 'fpanNumbers', value: fpanNumsArr },
                            { name: 'status', value: status },
                            { name: 'message', value: errorMessage },
                            { name: 'environment', value: currentEnv },
                        ];

                        const permitNumbers = failedPermitsResp.map((item) => item.Permits);
                        await sendNotificationEmail(permitNumbers, emailTemplate[0], tokens);

                        //6° Send log of Permits as a JSON to VV's doc lib (Success or fail)
                        //first check if that folder already exists. If it does then skip the part of creating it.
                        let folderId = '';
                        folderId = await getFolderId(folderPath);

                        if (folderId === null) {
                            folderId = await createFolder(folderPath, descriptionTest);
                        }

                        const docName = createDocName(fpanNumsArr, currentDate, false);
                        await putPermitsInVVDocLib(docName, folderId, permits);

                        logger.error('PostPermitsToDOR: Posting Permit to DOR Failed! Status : ', status);
                        logger.error('PostPermitsToDOR: Scheduled Service: PostPermitsToDOR');
                        logger.error('PostPermitsToDOR: Error Message: ', statusMessage);
                    }
                    response.json(200, statusMessage);
                }
            } else {
                ((statusMessage = 'DOR API failed with status : '), res.status);
                logger.error('PostPermitsToDOR: DOR API failed with status : ', res.status);
                response.json(200, statusMessage);
            }
        } else {
            // 4a° No Permits found in the last 24 hours
            statusMessage = 'No new permits found in last 24 hours.';
            response.json(200, statusMessage);
        }

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, statusMessage);
    } catch (error) {
        // 0° Error handling will also send a notification email and a communction log (email template "Scheduled Service - Post Permits to DOR")
        logger.info(`PostPermitsToDOR: Error encountered ${error}`);

        // helper to convert Sets ? arrays exactly once
        const formIdsArr = [...formIds];
        const fpanNumsArr = [...fpanNums];

        // BUILD THE ERROR RESPONSE ARRAY

        outputCollection[0] = 'Error'; // Don´t change this

        const emailTemplate = await testCustomQuery(emptyJsonFormId, 'DORGetPermitFailedEmail');

        const tokens = [
            { name: 'relatedRecordIDs', value: formIdsArr },
            { name: 'fpanNumbers', value: fpanNumsArr },
            { name: 'status', value: 'Failed before a status was given.' },
            { name: 'message', value: error + ' failed to create permit(s)' },
            { name: 'environment', value: currentEnv },
        ];

        await sendNotificationEmail(formIdsArr, emailTemplate[0], tokens);

        logger.error('PostPermitsToDOR: Posting Permit to DOR Failed!');
        logger.error('PostPermitsToDOR: Scheduled Service: PostPermitsToDOR');

        if (errorLog.length > 0) {
            responseMessage = `Some errors occurred. Error/s: ${errorLog.join('; ')}`;
            response.json(200, responseMessage);
        } else {
            if (error && error.message) {
                logger.error('PostPermitsToDOR: Error Message: ', error.message);
                responseMessage = error.message;
                response.json(200, responseMessage);
            } else {
                logger.error('PostPermitsToDOR: Error Message: ', error);
                responseMessage = `Unhandled error occurred: ${error}`;
                response.json(200, responseMessage);
            }
        }

        // You will see the responseMessage in the scheduled process log ONLY if the process runs automatically.
        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
