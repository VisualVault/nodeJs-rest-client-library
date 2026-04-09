/**
 * OrbipayEBillProcessPayment
 * Category: Workflow
 * Modified: 2025-10-24T03:37:59.03Z by ross.rhone@visualvault.com
 * Script ID: Script Id: b484d899-55de-ef11-82c3-a94025797804
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const orbipayCheckoutApI = require('checkout-node-sdk-v5');
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
    /*Script Name:	OrbipayEBillProcessPayment
  Customer:     WADNR
  Purpose:      Allows a user to pay their application/permit fees in their shopping cart through Orbipay's EBPP API

  Parameters:   
          token: (String, Required) - Public token created by Orbipay's checkout form that is used for the Payment Token API
          digiSign: (String, Required) - Digital Signature created by Orbipay's checkout form that is used for the Payment Token API
          customerReference: (String, Required) - Unique customer reference sent by VV. This customer reference is shared with EBPP.
          customerAccountReference: (String, Required) - Unique customer account reference sent by VV. It could be an order reference number or a loan account number or a policy number. ***(TBD)***

  Return Array:   
        outputCollection[0]: Status
        outputCollection[1]: Short description message
        outputCollection[2]: (Object) Orbipay's Payment Token API response object ***(TBD how to use this)***
  Pseudo code:   
          1. CHECK that all parameters were provided in a valid format
        2. GENERATE a unique idempotentRequestKey token for the Payment Token API
        3. CACULATE total amount that will be paid from the shopping cart.
        4. CREATE InvocationContext object from passed in parmeters to be a parameter for Payment Token API
        5. CALL Payment Token API
        6. RETURN a data object 
 
  Date of Dev: 04/13/2025
  Last Rev Date: 04/15/2025
  Revision Notes:
  04/13/2025 - Ross Rhone: Create Skeleton Template.
  04/15/2025 - Lucas Herrera: Update amount to be passed in from the form fields.
  04/24/2025 - Ross Rhone: Caculating the total amount that will paid.
  07/11/2025 - Ross Rhone: Updating idempotent key length to 32. Fixes bug-WADNR-6187
  */

    logger.info('Start of the process OrbipayEBillProcessPayment at ' + Date());

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                    Payment Gateway variables                               */
    /* -------------------------------------------------------------------------- */

    const clientKey = 8000521245;
    const clientApiKey = 'capik_058d87da-3cd8-4a29-8032-22c5d71a9016';
    const signatureKey = 'B05K1W76CB78ZLDT'; //Used for sandbox?
    //Signature Key2 :M6BZ3Y5CNSRGGD20 used for production?

    const hwfPublicKey =
        'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF3dklJelN6NXY4NTFpQzZaY21NNAp1SVJkSUdvT0lmTXE2WXh3MzFFbjNTYm5DcWJ1QWJZVTcwT2hPQXpUaERrd20raVdNbTJXaERBZ3pOOGE3NWRuCkRzMkNZMHg0Mkd4VERkTERMN1hMa0k5WHBQVEc1cFJsNytma0xEUHZJT2RaUVNXSmtYM0NjbDhMQStUWDRCaEIKbUdDRHhMaWhwRjJ5R1d2MU91bm5raURJVHBBbFIyK1hnRVI5VFhmNkIyaWh3cUVMazJMZW9ZS1FHbmEwODIzQgpnK0FYNy9xWU50MW4yZEc0cmQxWHpqSTh5SFZUQWJFZW9NeEJoWGZOTFk3a1dIeFlLcExWRkR2SHYxeGNwbE1nCmFHUG1ad1p3M3hBNVU0c0VGUmhacm1wSWYxTDVqclkyUnBtWW1GRGhZVzFpbFlPcEdNTGFKMHlHUURVWWFPVlEKRlFJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t';
    const clientPrivateKey =
        'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRGEvNnpML0gzVytyZlgKSHJwVHV5VC9zNm9weDE4bWd6K2pGa3ZmQWhzOGkxWkQrQjRxdDB0ZkNSNkZCdVE4aGJBWmZiL29NQjV0cUpaRgpDRHRmSVIzMm5xZzI2czRiNHlqUXpvRzY5c0N3R0ZBcllaWWtlS2ZrMGpZbThGUVNuOGZpWG16bS9DQUxOZVZMCk81dzlBVFM0L0YySnNWTHBOZWNRM2VKZkpMU0NxL3FEczJsTzdoQzNVRjByOEJheVNWbFJ3LzlCVzh6ZHNQTDAKV3l2c0h3RG0xeHZadWc0djh2T29FL1RwNlZkdmZhTXJ6dkRYQk1rZWZaU2VxTlRTaXpaRVpIdm9FT3dMeVhqTQpuWjhtb1JGQ3JyZmxwQ0czYU9lMndnalF6MG9MdWZoNlVJZ3JrNlZJSy9NTHJoUDdIVjFuWm5UeDhORDJrV1JPClp6angvQnBEQWdNQkFBRUNnZ0VBR1Y0bmZvT1RjaDBkd1luNkxHdlB0OXp3ZDZGMEdLcDRheVJRaXBjY1g1R0cKWHg0MUpGNlNHUUtkNmV2bjhVak5JczdKdFpRcFdpdCtxS1Z3OXk2SFlZTjBXZFF1SnRYVDZ3Z1l4L2NBVUFXbwo5N1Y0cG1YaGtPUjJ5R0RyWkRMay9RaFNGaG1iZnFEeUhCcGVHVVR6L2YraHVDcjF2elR5dktYdkxIVThnYXhDClZlS1BaN2JOUnh5d1c3UFY3RUJyOTF6SDVsZmVwV1RCSGVmOGdwcXM5YzlXbmJDelZuUWltd28vdkdTV01lbXkKZ2J5dWZZdUhwbmFuK3RpSHF0NnNTRCtXN1Q1WjZDeUhWNGsvSkYySzZxOU5PY0k1eTcwR0dMSmdpMzkvekhkRQozWThMeHJmeGExVmMwck5qNytUNzlpVzBiUVBJa25KZVJnL2hXUEJhUVFLQmdRRGo2TExDa0RnYWYxUnowNDBrClg3NWFuM1dmekhLVmwvVWliUzhKSDRHa1BEZEhYd1BXckR2UGg2QjFGNW9YaElpcTNqbEwxRUlnU0RvbjY5eWMKdVlYa3BHVktGUG5aUzhNU2tHb1ZsVXVWdkVJb0dnQmdlTytObFVVWitGR0l6NUxRUW8yWVRwWnhxaGhHaTlvbQplaytUSnZnV1h0K1IwTmNpZTBmZy96RVJ3UUtCZ1FEMS9kUUN0bGM4dDU5bGVyVjZETnlnMnd6K2ZDK1R1cUpTCkNCck9RVjdmZ2hCTGpPMkZGaXV1bmViUnFPd0F5bFduUllCMXBBU1luZS83U3FGZi9vRDlKM3FndVlsUmErUVcKTmZvRXhGbFZpK25USnltaENuSjZkbk9JaFV3NVl5cTh3SGtnRDAvSUw5MDFKOEYrZXgvWElRZkk3UkJxNU5DYgplZzdCWXRnbEF3S0JnUURpY0I2N3hNS1pRUTFOajFEYVpPNGg1L0RiOWl1YWljSWFsRlI1UWY1eWlRbDdOZUlBCmRsdHVsQmhPZmtheE94TDJnWmgzeU1weWZKQ2JmWEpSbk5wMUV3azRFNk14ekY1aW9XMWxTRkl5MFRzQjBPT3kKOWpVOGZLU05hdlRIYzBVdytnN28xcHdQRHFyVDNMdkFJeUhRMkpVQTFQNVlTQ0NYdDlqd3FWdTlnUUtCZ0VGOQptbncrWDJ0aTE2VUV6bHY0SUtVU3JKcjBKUmFIa2IrVk9NM0F5YWxueno3Ti9rNTRZSmpVb1NjZ2VmU2I2Y0htCjF4UjYzbDVqYmdqUkRiV281RjZCckR3dUtVanNHSVZ4U1djTGYxMHZLc2wwbTdpc04xNHpPdjhWdmYxcFVXOS8KTHNCQ1UxTlFxdXdEOFpmaTM4OCtrL3dDWVdTVUZwWE9JUytMU1ZCUkFvR0FBdkMzTlFXd0M4S1Z5Uk9LSmlKZgpLUUFjOEdRVmZsWFF2elRQUGpUbmxNMDJpTFkyNlRqOEYrY3dFZGpxbGxrNWppdmlINnZnS3ZwRVJuc3J0LzI1Cm5rcHFoUTVtUk1hVzZwTHZYcVdJVkc5bzBWYUNNaStLZU1UV2VNdk5GTnNSdEpuMzRSd1JMclhqaHdPeGJ0ajkKY3VpSEg0Q2hMTndzaDZsVDFlQTVJeDA9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=';
    const liveMode = 'false'; //Set false for Sandbox environment
    /* -------------------------------------------------------------------------- */
    /*                    Config variables                                        */
    /* -------------------------------------------------------------------------- */

    const queryName = 'zWebSvcGetUnpaidPaymentItemsForShoppingCart';

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

    function generateUniqueToken() {
        /* Generates a random idempotentRequestKey [a-zA-Z0-9]{1,32}.
        32 is the max length that orbipay/keybank allows. Otherwise it will throw an
        generic error */
        const length = 31;

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            token += characters[randomIndex];
        }

        return token;
    }

    async function processPayment({
        token,
        digiSign,
        customerReference,
        customerAccountReference,
        amount,
        invocationContext,
    }) {
        console.log(new Date().toISOString());
        const paymentToken = new orbipayCheckoutApI.PaymentTokenApi(customerAccountReference, amount)
            .withToken(token, digiSign)
            .forClient(clientKey, signatureKey);

        // Return a Promise that wraps the callback
        return new Promise((resolve, reject) => {
            paymentToken.confirm(
                (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                },
                invocationContext,
                liveMode
            );
        });
    }

    function createJsonParameters(individualId, shoppingCartId) {
        return (jsonFormId = {
            params: JSON.stringify([
                {
                    parameterName: 'individualId',
                    value: individualId,
                },
                {
                    parameterName: 'shoppingCartId',
                    value: shoppingCartId,
                },
            ]),
        });
    }

    function runCustomQuery(individualID, shoppingCartID, queryName) {
        const jsonParameters = createJsonParameters(individualID, shoppingCartID);

        const shortDescription = 'Custom Query using filter parameter for backward compatibility';

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, jsonParameters)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function calculateTotalAmount(individualID, shoppingCartID) {
        const unpaidRelatedItemsData = await runCustomQuery(individualID, shoppingCartID, queryName);

        // Calculate the sum of related Payment Items by their Transaction Amount
        let paymentItemTotal = unpaidRelatedItemsData.reduce((paymentTotal, paymentItem) => {
            const transactionAmount = currency(paymentItem['transaction Amount']);
            paymentTotal = paymentTotal.add(transactionAmount);
            return paymentTotal;
        }, currency(0));

        // Set payment item total as the `currency` value property, and determine if the Shopping Cart is only paid by Check
        return paymentItemTotal.value.toFixed(2);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        if (!clientApiKey || !hwfPublicKey || !clientPrivateKey) {
            console.log('Orbipay Credentials Incorrect/Empty');
            throw new Error('Error: Invalid Credentials');
        }

        const customerReference = getFieldValueByName('customer_reference');
        const customerAccountReference = getFieldValueByName('customer_account_reference');
        const individualID = getFieldValueByName('individualId');
        const shoppingCartID = getFieldValueByName('shoppingCartId');

        if (individualID.length != 0 && shoppingCartID.length != 0) {
            const totalamount = await calculateTotalAmount(individualID, shoppingCartID);

            if (totalamount > 0) {
                const idempotentRequestKey = generateUniqueToken(
                    customerReference,
                    customerAccountReference,
                    totalamount
                );

                if (!idempotentRequestKey) {
                    throw new Error('Error: Invalid Credentials');
                }

                let invocationContext = new orbipayCheckoutApI.InvocationContext(
                    clientApiKey,
                    clientPrivateKey,
                    hwfPublicKey,
                    idempotentRequestKey
                );

                if (!invocationContext) {
                    console.log('Orbipay InvocationContext Failed');
                    throw new Error('Error: Invalid Credentials');
                }

                // Collect all values in a single object
                const params = {
                    token: getFieldValueByName('token'),
                    digiSign: getFieldValueByName('digiSign'),
                    customerReference: getFieldValueByName('customer_reference'),
                    customerAccountReference: getFieldValueByName('customer_account_reference'),
                    amount: totalamount,
                    invocationContext: new orbipayCheckoutApI.InvocationContext(
                        clientApiKey,
                        clientPrivateKey,
                        hwfPublicKey,
                        idempotentRequestKey
                    ),
                };

                const result = await processPayment(params);
                console.log('Payment confirmed:', result);
                logger.info('Payment confirmed');

                // BUILD THE SUCCESS RESPONSE ARRAY
                outputCollection[0] = 'Success'; // Don't change this
                outputCollection[1] = result;
            } else {
                throw new Error('Error: There is no remaing balance to pay.');
            }
        } else {
            logger.error('fpOnline Payment Error: Missing individualId or shoppingCartId.');
            throw new Error('fpOnline Payment Error: Missing individualId or shoppingCartId.');
        }
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        let errorMessage;
        if (error && typeof error === 'object') {
            if (error.message) {
                errorMessage = error.message;
            } else {
                // Fallback: convert the full object to a string
                // e.g. { name: 'ErrorName', status: 500, ... }
                errorMessage = JSON.stringify(error);
            }
        } else {
            // If it’s a string or something else, just show it
            errorMessage = error;
        }

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this
        outputCollection[1] = errorMessage;
    } finally {
        // SEND THE RESPONSEz
        if (outputCollection[0] == 'Success') {
            response.json(200, outputCollection);
        } else {
            response.json(200, outputCollection);
        }
    }
};
