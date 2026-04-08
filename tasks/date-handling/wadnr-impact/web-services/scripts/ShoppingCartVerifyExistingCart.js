/**
 * ShoppingCartVerifyExistingCart
 * Category: Workflow
 * Modified: 2026-02-25T13:45:41.297Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: de6eaa3f-93d2-ef11-82bd-d3a492f2461d
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
    /*Script Name:  ShoppingCartVerifyExistingCart
    Customer:     WADNR
    Purpose:      The purpose of this process is to redirect to an existing Shopping Cart
    Parameters:   Individual ID (String, Required) - The ID of the Individual to retrieve payer data for
                  Form ID (String, Required) - The ID of the current Shopping Cart form

    Return Array:
          [0] Status: 'Success', 'Error'
          [1] Message
          [2] returnObj (Object) with the following properties:
                type (String) - The action to take (e.g. GoToExistingCart, CreateNewCart)
                individual (Object) - VV form data for the individual record. Only returned if type='CreateNewCart'
                shoppingCartGUID (String) - The GUID of an existing shopping cart. Only returned if type='GoToExistingCart'
                shoppingCartFormID (String) - The ID of an existing shopping cart. Only returned if type='GoToExistingCart'


    Psuedo code:
          1. If no individual ID was supplied, retrieve individual data based on user ID
          2. Verify if an existing cart exists using LibShoppingCartVerifyExistence
          3. Check if an existing cart was found
          3a. If the existing cart matches the ID of the current cart, return that we are on the existing cart
          3b. If the existing cart does not match the ID of the current cart, return the identifiers of the existing cart so that redirection can occur
          3c. If no existing cart was found, retrieve individual data so that a new cart can be created on the clientside
          4. Send the array back to the client

    Date of Dev: 01/13/2025
    Revision Notes:
    01/13/2025 - John Sevilla: Script migrated.
    01/29/2025 - John Sevilla: Updated for new params
    02/11/2026 - Alfredo Scilabra: Added a validation to remove payment items from unsigned apps
    02/25/2026 - Alfredo Scilabra: Rename Multi-pupose prefix
    */

    logger.info('Start of the process ShoppingCartVerifyExistingCart at ' + Date());

    /****************
   Config Variables
  *****************/
    const missingFieldGuidance =
        'Please provide a value for the missing field and try again, or contact a system administrator if this problem continues.';
    const shoppingCartVerifyExistenceWebsvcName = 'LibShoppingCartVerifyExistence';
    const getIndividualDataByIDQueryName = 'zWebSvc Get Individual Data by ID';

    /****************
   Script Variables
  *****************/
    let outputCollection = [];
    let errorLog = [];
    let returnObj = {};
    returnObj.type = 'UnableToVerify';
    let individualData;

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
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
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

    /**
     * @param {string} queryName
     * @param {object} sqlParams An object used like a map for sql params (e.g. For @ProviderID in query,
     * sqlParams = { 'ProviderID': 'PROVIDER-00000N' })
     *
     * @returns {object[]} VV query result data objects. May be empty.
     */
    function getCustomQueryDataBySQLParams(queryName, sqlParams) {
        const shortDescription = `Custom Query using SQL Parameters for '${queryName}'`;

        const customQueryData = {};
        if (sqlParams) {
            const sqlParamArr = [];
            for (const parameterName in sqlParams) {
                sqlParamArr.push({
                    parameterName,
                    value: sqlParams[parameterName],
                });
            }
            customQueryData.params = JSON.stringify(sqlParamArr);
        }

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * Note: Similar query/data used for LibShoppingCartCreate
     * @param {object} identifiers - The user ID or individual ID to locate the Individual Record
     * @returns {object?} - Individual data object
     */
    async function getIndividualDataByID({ userID, individualID }) {
        const [individualDataRaw] = await getCustomQueryDataBySQLParams(getIndividualDataByIDQueryName, {
            IndividualID: individualID || '',
            UserID: userID || '',
        });

        let individualData = null;
        if (individualDataRaw) {
            // return only relevant data
            const fieldNamesToReturn = [
                'first Name',
                'last Name',
                'country',
                'zip Code',
                'address Line 1',
                'address Line 2',
                'address Line 3',
                'city',
                'state',
                'state Code',
                'dhDocID',
                'dhid',
            ];

            individualData = fieldNamesToReturn.reduce((individualData, fieldName) => {
                individualData[fieldName] = individualDataRaw[fieldName];
                return individualData;
            }, {});
        }

        return individualData;
    }

    function detectFormTemplateFromID(recordID) {
        //NOTE: Check for longer prefixes first!
        const templateMap = new Map([
            ['STEP-1-LONG-TERM-FPA', 'Step 1 Long Term FPA'],
            ['FPA-AERIAL-CHEMICAL', 'Forest Practices Aerial Chemical Application'],
            ['APPLICATION-REVIEW', 'Application Review Page'],
            ['FPAN-AMENDMENT', 'FPAN Amendment Request'],
            ['FPAN-RENEWAL', 'FPAN Renewal'],
            ['FPAN-T', 'FPAN Notice of Transfer'],
            ['LT-5DN', 'Long-Term Application 5-Day Notice'],
            ['FPAN', 'Forest Practices Application Notification'],
            ['NCNU', 'Notice of Conversion to Non Forestry Use'],
            ['NTC', 'Notice to Comply'],
            ['MPF', 'Multi-purpose'],
        ]);

        const normalizedID = recordID.replace(/\s+/g, '');

        for (const [prefix, name] of templateMap) {
            if (normalizedID.startsWith(prefix.replace(/\s+/g, ''))) {
                return name;
            }
        }

        return null;
    }

    function getFormRecords(getFormsParams, templateName) {
        const shortDescription = `Get form ${templateName}`;
        const overrideGetFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(overrideGetFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateForm(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function unrelateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `Unrelating forms: ${parentRecordGUID} and form ${childRecordID}`;

        return vvClient.forms
            .unrelateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function getAllRelatedRecords(recordGUID) {
        const shortDescription = `Records related to the record ${recordGUID}`;

        return vvClient.forms
            .getFormRelatedForms(recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getPaymentItems(forms) {
        return forms.filter((f) => f.instanceName?.startsWith('PAYMENT-ITEM'));
    }

    function getFees(forms) {
        return forms.filter((f) => f.instanceName?.startsWith('FEE'));
    }

    try {
        /*********************
     Form Record Variables
    **********************/
        const userID = getFieldValueByName('User ID');
        let individualID = getFieldValueByName('Individual ID', true);
        const shoppingCartID = getFieldValueByName('Form ID');

        // Specific fields are detailed in the errorLog sent in the response to the client.
        if (errorLog.length > 0) {
            throw new Error(`${missingFieldGuidance}`);
        }

        /****************
     BEGIN ASYNC CODE
    *****************/
        //  Step 1. If no individual ID was supplied, retrieve individual data based on user ID
        if (!individualID) {
            individualData = await getIndividualDataByID({ userID });
            individualID = individualData?.dhDocID;
        }

        if (individualID) {
            // Step 2. Verify if an existing cart exists using LibShoppingCartVerifyExistence
            const shoppingCartVerifyExistenceWebSvcParams = [
                {
                    name: 'Individual ID',
                    value: individualID,
                },
                // NOTE: isPayByCheck and isCCTPPaidByCustomer flags are not currently used for shopping carts in fpOnline
            ];

            const shoppingCartVerifyExistenceData = await callExternalWs(
                shoppingCartVerifyExistenceWebsvcName,
                shoppingCartVerifyExistenceWebSvcParams
            );
            const [status, statusMsg, verifyData] = shoppingCartVerifyExistenceData;

            // Destruct verified response object to get the returned data
            const { shoppingCartGUID: existingCartGUID, shoppingCartFormID: existingCartID } = verifyData;

            // Step 3. Check if an existing cart was found
            if (existingCartID) {
                // Check paypent items and verify they are all for signed apps
                const relatedRecords = await getAllRelatedRecords(existingCartGUID);
                const paymentItems = getPaymentItems(relatedRecords);

                for (const paymentItem of paymentItems) {
                    const paymentItemRelatedRecords = await getAllRelatedRecords(paymentItem.revisionId);
                    const fees = getFees(paymentItemRelatedRecords);

                    for (const fee of fees) {
                        const [feeRecord] = await getFormRecords(
                            {
                                q: `[instanceName] eq '${fee.instanceName}'`,
                                expand: 'true',
                            },
                            'Fee'
                        );

                        if (!feeRecord) continue;

                        const relatedRecordId = feeRecord['related Record ID'];
                        const templateName = detectFormTemplateFromID(relatedRecordId);

                        if (!templateName) continue;

                        const [appRecord] = await getFormRecords(
                            {
                                q: `[instanceName] eq '${relatedRecordId}'`,
                                expand: 'true',
                            },
                            templateName
                        );

                        const isSigned = appRecord?.['signatures Completed'] === 'True';
                        if (isSigned) continue;

                        // Remove payment item from Cart
                        await unrelateRecords(existingCartGUID, paymentItem.instanceName);
                        await updateForm('Payment Item', paymentItem.revisionId, {
                            'Related Record ID': '',
                        });
                    }
                }

                if (shoppingCartID === existingCartID) {
                    // Step 3a. If the existing cart matches the ID of the current cart, return that we are on the existing cart
                    returnObj.type = 'OnExistingCart';
                } else {
                    // Step 3b. If the existing cart does not match the ID of the current cart, return the identifiers of the existing cart so that redirection can occur
                    returnObj.type = 'GoToExistingCart';
                    returnObj.shoppingCartGUID = existingCartGUID;
                    returnObj.shoppingCartFormID = existingCartID;
                }
            } else {
                // Step 3c. If no existing cart was found, retrieve individual data so that a new cart can be created on the clientside
                if (!individualData) {
                    individualData = await getIndividualDataByID({ userID, individualID });
                }

                if (individualData) {
                    returnObj.individual = individualData;
                    returnObj.type = 'CreateNewCart';
                } // else cannot create new cart without individual data
            }
        }

        // Step 4. Send the array back to the client
        outputCollection[0] = 'Success';
        outputCollection[1] = 'ShoppingCartVerifyExistingCart returned successfully';
        outputCollection[2] = returnObj;
    } catch (error) {
        // Log errors captured.
        logger.info(JSON.stringify(`${error} ${errorLog}`));
        outputCollection[0] = 'Error';
        outputCollection[1] = `${error.message} ${errorLog.join(' ')} `;
        outputCollection[2] = null;
        outputCollection[3] = errorLog;
    } finally {
        response.json(200, outputCollection);
    }
};
