/**
 * SearchExistingNotificationProfile
 * Category: Workflow
 * Modified: 2025-12-12T19:12:29.447Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: 9df85a0c-fe1e-f011-82d6-afeb582902bd
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
  Script Name:    SearchExistingNotificationProfile
  Customer:       WADNR
  Purpose:        Retrieve the latest enabled Notification Profile and return fields
  Parameters:     
                  The following represent variables passed into the function:
                  SAW ID: Saw ID
                  Email: Email
  Return Object:
                  outputCollection[0]: Status
                  outputCollection[1]: Short description message
                  outputCollection[2]: Data
  Pseudo code: 
                  1° Verify at least one of the required fields present
                  2° Get latest enabled notification profile
                  ...

  Date of Dev:    04/21/2025
  Last Rev Date:  04/21/2025

  Revision Notes:
                  04/21/2025 - Nicolas Culini:    First Setup of the script
                  05/21/2025 - Fernando Chamorro: Adding extra fields
                  05/22/2025 - Fernando Chamorro: Recover the last saved record
                  09/16/2025 - Fernando Chamorro: Add the 'WDFW Concurrence Reviewer' field to the retrieved fields
  */

    logger.info(`Start of the process SearchExistingNotificationProfile at ${Date()}`);

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

    const templateName = 'Forest Practices Notification Profile';

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

    function getNotificationProfile(sawId, email, fieldsToRetrieve) {
        const shortDescription = `Get form ${templateName}`;
        let query = `[SAW User ID] eq '${sawId}'`;

        if (!sawId) {
            query = `[Email] eq '${email}'`;
        }

        const getFormsParams = {
            q: `${query} AND [Status] eq 'Enabled'`,
            fields: fieldsToRetrieve,
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => (res.data ? res.data : []));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1° GET THE VALUES OF THE FIELDS

        const sawId = getFieldValueByName('SAW User ID');
        const email = getFieldValueByName('Email');
        const comingFromLink = getFieldValueByName('Coming From Link');

        // 2° CHECK IF THE REQUIRED PARAMETERS ARE PRESENT (we only need one of the two)

        if (!sawId && !email) {
            // Throw every error getting field values as one concatenated string
            throw new Error(errorLog.join('; '));
        }

        let fields = [
            'Aerial Chemical Spray',
            'All Activities',
            'All FPAN',
            'Geographic Area Types',
            'Hydraulic Projects in Typed Water',
            'No Notifications Geographical Area',
            'Northeast',
            'Northwest',
            'Olympic',
            'Only Certain FPAN',
            'Pacific Cascade',
            'Road Construction or Abandonment',
            'Rock Pit or Spoils Area',
            'South Puget Sound',
            'Southeast',
            'Status',
            'Timber Harvest',
            'Was Email Sent',
            'WDFW Concurrence Reviewer',
            'Yes Notifications Geographical Area',
            'Status',
        ];

        if (comingFromLink) {
            const extraFields = [
                'Address Line 1',
                'Address Line 2',
                'Address Line 3',
                'City',
                'Country',
                'County2',
                'Federal Agency',
                'First Name',
                'Last Name',
                'Local Government Entity',
                'Organization Name',
                'Other',
                'Phone',
                'Province',
                'Public',
                'State Agency',
                'State',
                'Tribe',
                'Updating Preferences',
                'Zip Code',
            ];

            fields = fields.concat(extraFields);
        }

        const data = await getNotificationProfile(sawId, email, fields.toString());

        if (data.length !== 0) {
            const mostRecent = data.reduce((latest, current) => {
                const getNumber = (str) => parseInt(str.split('-').pop());
                return getNumber(current.instanceName) > getNumber(latest.instanceName) ? current : latest;
            });

            outputCollection[0] = 'Success'; // Don´t change this
            outputCollection[1] = 'Successfully retrieved previous notification profile data';
            outputCollection[2] = mostRecent;
        } else {
            outputCollection[0] = 'Success'; // Don´t change this
            outputCollection[1] = 'No previous notification profile data found';
            outputCollection[2] = [];
        }
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

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
