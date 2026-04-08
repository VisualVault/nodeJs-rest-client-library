/**
 * LibFeeCreateFee
 * Category: Workflow
 * Modified: 2026-03-06T15:12:12.057Z by mauro.rapuano@visualvault.com
 * Script ID: Script Id: 0aed7069-bae4-ef11-82c1-fe2ae3bd930b
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

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
    /*Script Name: LibFeeCreateFee
  Customer:      WA DNR
  Purpose:       The purpose of this library is to create a Fee record and associated child records in a structured way.
  Parameters:    Individual ID (String, Required) - The record ID of record representing the Individual
                 Related Record ID (String, Required) - The record ID of the record to associate the Fee with. Typically an application or entity (Individual, Organization) form ID.
                 Related Record GUID (String) - The GUID/DHID/RevisionID of the record to associate the Fee with. If supplied, saves API calls to look up the GUID.
                 Process Type (String, Required) - Required Fee field
                 Fee Name (String, Required) - Required Fee field
                 Fee Type (String, Required) - Required Fee field
                 Fee Description (String, Required) - Required Fee field
                 Fee Amount (String, Required) - Required Fee field
                 Fund (String, Required) Required Fee field
                 Cost Center (String, Required) - Required Fee field
                 GL Account (String, Required) - Required Fee field
                 Allow Installments (String, Required) - Required Fee field. The following fields are required if this field = 'Yes':
                    Minimum Payment (String, Required*) - Required Fee field.
                    Frequency (String, Required*) - Required Fee field.
                    Start Date (String, Required*) - Required Fee field. Expects date in ISO 8601 format.
                    Next Due Date (String, Required*) - Required Fee field. Expects date in ISO 8601 format.
                 Refundable (String, Required) - Required Fee field.
                 Fee Amount Can Change (String, Required) - Required Fee field.
                 Accept Checks (String, Required) - The "Can only accept checks?" field of the Fee form.
                 OTHERFIELDSTOUPDATE (Object) - Other non-specified fields to update on the Fee form. Can be used to override default field values. An example on how to pass this in via a runWebService is provided below.
                    EX: {name:'OTHERFIELDSTOUPDATE', value:{"Waive Forgive Reason": "Lorem ipsum dolor sit..."}}
                    This object will need to be changed according to the field names.
                 FINALIZEDFLAG (Boolean) - Identifies if the Transaction representing the Fee should be 'Finalized' or 'Pending'. Ignored if Fee Amount Can Change = 'Yes'
  Return Array:   
                  [0] Status: 'Success', 'Error', 'Error Duplicate'
                  [1] Message
                  [2] returnObject: An object with the following possible properties:
                    createdFee (Object): Data for the created Fee record. Contains: formID, revisionID
                    createdTransactionForFee (Object): Data for the created Transaction record that increases the Fee's balance. Contains: formID, revisionID
                    existingShoppingCart (Object): Data for the created/found Shopping Cart record. Contains: formID, revisionID
                    createdPaymentItem (Object): Data for the created Payment record. Contains: formID, revisionID
                    createdTransactionForPaymentItem (Object): Data for the created Transaction record that decreases the Fee's balance. Contains: formID, revisionID
                    errorLog (String[]): List of errors logged during process.
                    feeDuplicates (Object[]): List of Fee records that matched duplicate check criteria. Each contains: formID, revisionID
  Pseudo code:   
                  1. Verify all required fields to build the Fee and children records (Transaction, Payment Item, etc.) are present
                  2. Verify there are no duplicates for the Fee form based on Fee Name and Related Record ID
                    a. Perform query based on duplicate check criteria
                    b. If duplicates were found, throw an error and stop processing of the webservice. Return duplicates data to the client.
                  3. Create the Fee record and relate to Related Record ID
                  4. Create a Transaction record that increases the balance for the Fee
                  5. Create or find an existing Shopping Cart record for this individual using the create shopping cart library
                  6. Create a Payment Item record and Transaction record that decreases the balance for the Fee using the create payment item library

  Date of Dev:    01/22/2025
  Revision Notes:
  01/22/2025 - John Sevilla: Script migrated
  02/06/2025 - John Sevilla: Updated for new params
  06/04/2025 - Fernando Chamorro: Adding User ID field
  03/06/2026 - Mauro Rapuano: Updated Verify Fee Has No Duplicates step to search by Status = Paid or Unpaid
  */

    logger.info('Start of the process LibFeeCreateFee at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    const missingFieldGuidance = 'Please provide a value for the missing field(s).';

    // Form Template Names
    const FeeTemplateID = 'Fee';

    // Web Service Names
    const DuplicateCheckWebsvcName = 'LibFormDuplicateCheck';
    const CreateTransactionWebsvcName = 'LibTransactionCreateTransaction';
    const CreateShoppingCartWebsvcName = 'LibShoppingCartCreate';
    const CreatePaymentItemWebsvcName = 'LibPaymentItemCreate';

    const FormTemplatePrefixListQueryName = 'zWebSvc Form Template Prefix List';

    // Required Field Names for Fee
    const FeeRequiredFields = [
        'Individual ID',
        'Related Record ID',
        'Process Type',
        'Fee Name',
        'Fee Type',
        'Fee Description',
        'Fee Amount',
        'Fund',
        'Cost Center',
        'GL Account',
        'Allow Installments',
        'Refundable',
        'Fee Amount Can Change',
        'Accept Checks',
        'User ID',
    ];

    const InstallmentFeeRequiredFields = ['Minimum Payment', 'Frequency', 'Start Date', 'Next Due Date'];

    const WADNR_TIMEZONE = 'America/Los_Angeles';
    const dateOnlyISOStringFormat = 'YYYY-MM-DD';

    /* -------------------------------------------------------------------------- */
    /*                          Script 'Global' Variables                         */
    /* -------------------------------------------------------------------------- */
    let outputCollection = [];
    let errorStatus = 'Error';
    let errorLog = [];
    let returnObject = {};

    let FeeCreateObject = null;
    let FeeDuplicates = null;
    let CreatedFee = null;
    let CreatedTransactionForFee = null;
    let FeeTransactionIsFinalized = null;
    let ExistingShoppingCart = null;
    let CreatedPaymentItem = null;
    let CreatedTransactionForPaymentItem = null;

    const currDateStr = dayjs().tz(WADNR_TIMEZONE).startOf('day').format(dateOnlyISOStringFormat);

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

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                let fieldValue = 'value' in field ? field.value : null;
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;
                const ddSelectItem = fieldValue == 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }

                return fieldValue;
            }
        } catch (error) {
            errorLog.push(error.message);
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

    function callExternalWs(webServiceName, webServiceParams, shortDescription = `Run Web Service: ${webServiceName}`) {
        return vvClient.scripts
            .runWebService(webServiceName, webServiceParams)
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getFormRecords(getFormsParams, templateName, shortDescription = `Get form ${templateName}`) {
        getFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function createFormRecord(newRecordData, templateName, shortDescription = `Post form ${templateName}`) {
        return vvClient.forms
            .postForms(null, newRecordData, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    async function relateFormsByGUIDandFormID(
        formAGUID,
        formBFormID,
        shortDescription = `Relating forms: ${formAGUID} and form ${formBFormID}`
    ) {
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        const relateFormByDocIDRes = await vvClient.forms
            .relateFormByDocId(formAGUID, formBFormID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));

        return relateFormByDocIDRes;
    }

    function getCustomQueryData(queryName, customQueryParams, shortDescription = `Custom Query for '${queryName}'`) {
        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * @param {Object} obj
     * @returns {Boolean}
     */
    function isObject(obj) {
        return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
    }

    /**
     * Gets the prefix of the form (e.g. 'EDUCATION-HISTORY' in 'EDUCATION-HISTORY-00000125')
     * @param {String} formID - VV Form DhDocID
     * @returns {String} The prefix WITHOUT a trailing dash
     */
    function getFormPrefix(formID) {
        const prefixReg = /^([A-Za-z0-9-]+)-\d+$/;
        let formPrefix = '';
        try {
            formPrefix = prefixReg.exec(formID)[1];
        } catch (error) {
            throw new Error(`Unable to parse form prefix for: "${formID}". ${error.message}`);
        }

        return formPrefix;
    }

    /**
     * Gets the template name of the form (e.g. 'EDUCATION-HISTORY-00000125' -> 'Education History')
     * @param {string} formID
     * @returns {string}
     */
    async function getTemplateNameFromID(formID) {
        let formPrefix = getFormPrefix(formID);
        formPrefix += '-'; // add trailing dash since query returns prefixes in this format

        const [formTemplate] = await getCustomQueryData(FormTemplatePrefixListQueryName, {
            limit: 1,
            q: `[prefix] eq '${formPrefix}'`,
        });

        if (!formTemplate?.templateName) {
            throw new Error(`Unable to find form template name for prefix "${formPrefix}"`);
        }

        return formTemplate.templateName;
    }

    // Builds fee create object from params and does required field checking
    async function buildFeeCreateObject() {
        const feeCreateObject = {};

        // determine required fields
        let finalRequiredFields = FeeRequiredFields;
        let allowInstallments = getFieldValueByName('Allow Installments', true); // true prevents duplicate errorLog entries
        if (allowInstallments === 'Yes') {
            finalRequiredFields = finalRequiredFields.concat(InstallmentFeeRequiredFields);
        }

        // collect required fields into create object (also adds missing fields to errorLog)
        finalRequiredFields.forEach((reqFieldName) => {
            feeCreateObject[reqFieldName] = getFieldValueByName(reqFieldName);
        });

        // specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        // collect optional fields
        const relatedRecordGUID = getFieldValueByName('Related Record GUID', true);
        if (relatedRecordGUID) {
            feeCreateObject['Related Record GUID'] = relatedRecordGUID;
        } else {
            feeCreateObject['Related Record GUID'] = await getFormGUIDFromID(feeCreateObject['Related Record ID']);
        }

        // collect "other" form fields to update
        let otherFieldsToUpdate = getFieldValueByName('OTHERFIELDSTOUPDATE', true);
        if (isObject(otherFieldsToUpdate)) {
            for (const fieldName in otherFieldsToUpdate) {
                if (otherFieldsToUpdate.hasOwnProperty(fieldName)) {
                    feeCreateObject[fieldName] = otherFieldsToUpdate[fieldName];
                }
            }
        }

        // Determine if the related Transaction should be finalized or not if the optional parameter was provided
        FeeTransactionIsFinalized = getFieldValueByName('FINALIZEDFLAG', true);
        // NOTE: `??` is used in this context so that only `null` or `undefined` short circuit to `true`
        FeeTransactionIsFinalized = FeeTransactionIsFinalized ?? true;
        // Overwrite the flag as `false` if the fee amount can change since it must be able to be updated
        if (feeCreateObject['Fee Amount Can Change'] == 'Yes') {
            FeeTransactionIsFinalized = false;
        }

        // update fields with defaults if not set
        if (feeCreateObject.hasOwnProperty('Amount Reduced') === false) {
            feeCreateObject['Amount Reduced'] = '0';
        }
        if (feeCreateObject.hasOwnProperty('Final Amount Due') === false) {
            feeCreateObject['Final Amount Due'] = feeCreateObject['Fee Amount'];
        }
        if (feeCreateObject.hasOwnProperty('Current Balance') === false) {
            feeCreateObject['Current Balance'] = feeCreateObject['Fee Amount'];
        }
        if (feeCreateObject.hasOwnProperty('Form Saved') === false) {
            feeCreateObject['Form Saved'] = 'True';
        }
        if (feeCreateObject.hasOwnProperty('Status') === false) {
            feeCreateObject['Status'] = 'Unpaid';
        }

        return feeCreateObject;
    }

    async function getFormGUIDFromID(formID) {
        const formTemplateName = await getTemplateNameFromID(formID);
        const [formRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${formID}'`,
            },
            formTemplateName
        );

        if (!formRecord) {
            throw new Error(`Unable to find ${formTemplateName} form instance with ID: ${formID}`);
        }

        return formRecord.revisionId;
    }

    async function verifyFeeHasNoDuplicates() {
        // Step 2a. Perform query based on duplicate check criteria
        const duplicateCheckQueryString =
            `[Fee Name] eq '${FeeCreateObject['Fee Name']}' AND ` +
            `[Related Record ID] eq '${FeeCreateObject['Related Record ID']}' AND` +
            `([Status] eq 'Paid' OR [Status] eq 'Unpaid')`; // filter out previously 'Voided' duplicates since they can be recreated with same criteria

        const webSvcParams = [
            {
                name: 'templateID',
                value: FeeTemplateID,
            },
            {
                name: 'query',
                value: duplicateCheckQueryString,
            },
            {
                name: 'formID',
                value: 'zzzIGNORE', // no existing form ids to compare
            },
        ];

        const duplicateCheckData = await callExternalWs(DuplicateCheckWebsvcName, webSvcParams);

        // Step 2b. If duplicates were found, throw an error and stop processing of the webservice. Return duplicates data to the client.
        const duplicateCheckStatus = duplicateCheckData[0];
        const duplicateCheckReturnObj = duplicateCheckData[2];

        if (duplicateCheckStatus === 'Error') {
            throw new Error(
                `The call to ${DuplicateCheckWebsvcName} returned with an error. ${duplicateCheckData.statusMessage}.`
            );
        } else if (duplicateCheckStatus === 'Duplicate Found') {
            errorStatus = 'Error Duplicate';
            FeeDuplicates = duplicateCheckReturnObj.duplicates;
            throw new Error('This record is a duplicate.');
        } else if (duplicateCheckStatus !== 'No Duplicate Found' && duplicateCheckStatus !== 'Current Record Match') {
            throw new Error(`The call to ${DuplicateCheckWebsvcName} returned with an unhandled error.`);
        }
    }

    // Creates a Fee record and relates it to the 'Related Record ID' specified in the fee create object
    async function createAndRelateFeeRecord() {
        // create fee record
        const createdFeeRecord = await createFormRecord(FeeCreateObject, FeeTemplateID);

        // set globals
        CreatedFee = {
            formID: createdFeeRecord.instanceName,
            revisionID: createdFeeRecord.revisionId,
        };

        // relate fee to related record id
        const relateFormsRes = await relateFormsByGUIDandFormID(
            CreatedFee.revisionID,
            FeeCreateObject['Related Record ID']
        );
    }

    // Creates a Transaction record that increases the balance for this fee.
    async function createTransactionRecordForFee() {
        const createTransactionParams = [
            { name: 'Transaction Category', value: 'Fee Assessed' },
            { name: 'Balance Change', value: 'Increase' },
            {
                name: 'Transaction Description',
                value: `Fee assessed for "${FeeCreateObject['Fee Name']}"`,
            },
            {
                name: 'Transaction Amount',
                value: FeeCreateObject['Final Amount Due'],
            },
            { name: 'Transaction Date', value: currDateStr },
            { name: 'Transaction ID', value: '' }, // Note: This is NOT a Transaction record ID
            { name: 'Fund', value: FeeCreateObject['Fund'] },
            { name: 'Cost Center', value: FeeCreateObject['Cost Center'] },
            { name: 'GL Account', value: FeeCreateObject['GL Account'] },
            { name: 'Related Record ID', value: CreatedFee.formID },
            { name: 'Fee ID', value: CreatedFee.formID },
            { name: 'Individual ID', value: FeeCreateObject['Individual ID'] },
            { name: 'License ID', value: '' },
            { name: 'Status', value: FeeTransactionIsFinalized ? 'Finalized' : 'Pending' },
            { name: 'User ID', value: FeeCreateObject['User ID'] },
        ];

        const createTransactionData = await callExternalWs(CreateTransactionWebsvcName, createTransactionParams);

        if (Array.isArray(createTransactionData[1]) === false || createTransactionData[1].length < 2) {
            throw new Error(`Unexpected data returned from ${CreateTransactionWebsvcName}.`);
        }

        // populate transaction IDs in object
        const [formID, revisionID] = createTransactionData[1];

        // set globals
        CreatedTransactionForFee = {
            formID,
            revisionID,
        };
    }

    // Creates or finds an existing Shopping Cart record for this individual using the create shopping cart library
    async function getExistingShoppingCart() {
        let createShoppingCartParams = [
            {
                name: 'Individual ID',
                value: FeeCreateObject['Individual ID'],
            },
            // isPayByCheck, isCCTPPaidByCustomer, Bypass Verification ommitted for now
        ];

        const createShoppingCartData = await callExternalWs(CreateShoppingCartWebsvcName, createShoppingCartParams);

        if (
            isObject(createShoppingCartData[2]) === false ||
            createShoppingCartData[2].hasOwnProperty('shoppingCartFormID') === false ||
            createShoppingCartData[2].hasOwnProperty('shoppingCartGUID') === false
        ) {
            throw new Error(`Unexpected data returned from ${CreateShoppingCartWebsvcName}.`);
        }
        const { shoppingCartFormID, shoppingCartGUID } = createShoppingCartData[2];

        // set globals
        ExistingShoppingCart = {
            formID: shoppingCartFormID,
            revisionID: shoppingCartGUID,
        };
    }

    // Creates a "payment-type" Payment Item record and Transaction record that decreases the balance for the Fee using the create payment item library
    async function createPaymentItemRecord() {
        // Payment item amounts change depending on installment setting
        let itemBalanceDue, transactionAmount, installmentPaymentItem;
        if (FeeCreateObject['Allow Installments'] === 'Yes') {
            installmentPaymentItem = 'True';
            itemBalanceDue = FeeCreateObject['Minimum Payment'];
            transactionAmount = FeeCreateObject['Minimum Payment'];
        } else {
            installmentPaymentItem = 'False';
            itemBalanceDue = FeeCreateObject['Final Amount Due'];
            transactionAmount = FeeCreateObject['Final Amount Due'];
        }

        const paymentItemParamObject = {
            'Individual ID': FeeCreateObject['Individual ID'],
            'Fee ID': CreatedFee.formID,
            'Related Record ID': ExistingShoppingCart.formID,
            'Transaction Type': 'Payment',
            'Payment Method': FeeCreateObject['Accept Checks'] === 'Yes' ? 'Check' : 'Credit Card',
            'Item Balance Due': itemBalanceDue,
            'Installment Payment Item': installmentPaymentItem,
            'Transaction Amount': transactionAmount,
            Fund: FeeCreateObject['Fund'],
            'Cost Center': FeeCreateObject['Cost Center'],
            'GL Account': FeeCreateObject['GL Account'],
            'Date of Transaction': currDateStr,
            Refundable: FeeCreateObject['Refundable'],
            'Can Only Accept Checks': FeeCreateObject['Accept Checks'],

            // fields for transaction record created for payment item
            'Transaction Record Description': `Payment for "${FeeCreateObject['Fee Name']}"`,
            'Transaction Record Balance Change': 'Decrease',
            'Transaction Record Status': 'Pending',
        };

        const createPaymentItemParams = [{ name: 'PaymentItemParamObjects', value: [paymentItemParamObject] }];

        const createPaymentItemData = await callExternalWs(CreatePaymentItemWebsvcName, createPaymentItemParams);

        if (isObject(createPaymentItemData[2]) === false) {
            throw new Error(`Unexpected data returned from ${CreatePaymentItemWebsvcName}.`);
        }

        const { paymentItemReturnObjects } = createPaymentItemData[2];
        if (Array.isArray(paymentItemReturnObjects) == false || paymentItemReturnObjects.length < 1) {
            throw new Error(`${CreatePaymentItemWebsvcName} returned no Payment Item creation data.`);
        }

        // first return object should represent records created for this fee; set globals
        CreatedPaymentItem = paymentItemReturnObjects[0].createdPaymentItem;
        CreatedTransactionForPaymentItem = paymentItemReturnObjects[0].createdTransaction;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Step 1. Verify all required fields to build the Fee and children records (Transaction, Payment Item, etc.) are present
        FeeCreateObject = await buildFeeCreateObject();

        // Step 2. Verify there are no duplicates for the Fee form based on Fee Name and Related Record ID
        await verifyFeeHasNoDuplicates();

        // Step 3. Create the Fee record and relate to Related Record ID
        await createAndRelateFeeRecord();
        returnObject.createdFee = CreatedFee;

        // Step 4. Create a Transaction record that increases the balance for the Fee
        await createTransactionRecordForFee();
        returnObject.createdTransactionForFee = CreatedTransactionForFee;

        // Step 5. Create or find an existing Shopping Cart record for this individual using the create shopping cart library
        await getExistingShoppingCart();
        returnObject.existingShoppingCart = ExistingShoppingCart;

        // Step 6. Create a Payment Item record and Transaction record that decreases the balance for the Fee using the create payment item library
        await createPaymentItemRecord();
        returnObject.createdPaymentItem = CreatedPaymentItem;
        returnObject.createdTransactionForPaymentItem = CreatedTransactionForPaymentItem;

        // Send to client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'LibFeeCreateFee has returned successfully';
        outputCollection[2] = returnObject;
    } catch (error) {
        // add items to returnObject
        returnObject.errorLog = errorLog;
        returnObject.feeDuplicates = FeeDuplicates;

        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = errorStatus;
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = returnObject;
    } finally {
        response.json(200, outputCollection);
    }
};
