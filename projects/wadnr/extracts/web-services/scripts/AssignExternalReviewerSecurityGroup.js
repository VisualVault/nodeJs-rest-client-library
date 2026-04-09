/**
 * AssignExternalReviewerSecurityGroup
 * Category: Workflow
 * Modified: 2025-11-27T16:58:22.4Z by fernando.chamorro@visualvault.com
 * Script ID: Script Id: 9e50fca3-a6cb-f011-82fa-da1785568e94
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
    Script Name:    AssignExternalReviewerSecurityGroup 
    Customer:       WADNR
    Purpose:        
                    - Assign the "Required Reviewers (External)" security role permission to a user 
                      through the standard assignment and unassignment process, which occurs when 
                      setting a user as an External Reviewer in the Individual Record form.
    Preconditions:
                    - The user must have completed the registration process to have an existing 
                      record in the Individual Record form.
                    
    Parameters:     
                    - Action	 (string)	The action that will instruct the process to add or remove the security group.
                    - User ID	 (string)	The email address that serves as the Username for login "user@id.com".
                    - Group      (string)	The security group to be assigned to the user (User ID).
    Return Object:
                    - outputCollection[0]: Status (Success | Error)
                    - outputCollection[1]: Short description message
                    - outputCollection[2]: JSON Data
    Pseudo code: 
                    1. Get the values of the fields
                    2. Check if the required parameters are present
                    3. Verify that the group is correct
                    4. Get the user's GUID
                    5. Validate whether we should add or remove the security group
                        5.1 Add security group
                        5.2 Remove the security group
                    6. Return response
 
    Date of Dev:    11/27/2025
    Last Rev Date:  11/27/2025
 
    Revision Notes:
                    11/27/2025 - Fernando Chamorro:  First Setup of the script
    */

    logger.info(`Start of the process AssignExternalReviewerSecurityGroup at ${Date()}`);

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

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

    function getGroup(group) {
        const shortDescription = `Get group data for: ${group}`;
        const getGroupsParams = {
            q: `name eq '${group}'`, // groups = `"Office Staff", "Proponent", ...`
        };

        return vvClient.groups
            .getGroups(getGroupsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getUserGuid(userID) {
        const shortDescription = `Get user for user ID: ${userID}`;
        const getUserQuery = {
            q: `[userid] eq '${userID}'`, // userID = 'user@id.com'
            expand: 'true',
        };

        return vvClient.users
            .getUser(getUserQuery)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]['id']);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // 1. Get the values of the fields
        const action = getFieldValueByName('Action');
        const userId = getFieldValueByName('User ID');
        const groupName = getFieldValueByName('Group');

        // 2. Check if the required parameters are present
        if (!action || !userId || !groupName) {
            throw new Error(errorLog.join('; '));
        }

        // 3. Verify that the group is correct
        const extRevgroup = await getGroup(groupName);

        if (!isNullEmptyUndefined(extRevgroup)) {
            // 4. Get the user's GUID.
            const userGuid = await getUserGuid(userId);

            // 5. Validate whether we should add or remove the security group.
            if (action === 'Add') {
                // 5.1 Add security group
                let addUserToGroup = await vvClient.groups.addUserToGroup(
                    {}, // queryParams
                    extRevgroup[0].id,
                    userGuid
                );

                addUserToGroup = JSON.parse(addUserToGroup);

                // 201 is success;
                // 400 means the user is already part of the group.
                // Both are successful results.
                if (addUserToGroup.meta.status === 201 || addUserToGroup.meta.status === 400) {
                    logger.info(`User added to group '${groupName}' successfully.`);

                    // 6. Return response
                    outputCollection[0] = 'Success'; // Don´t change this
                    outputCollection[1] = `User added to group '${groupName}' successfully.`;
                    outputCollection[2] = addUserToGroup;
                } else {
                    throw new Error(
                        `Attempt to remove user '${userId}' from group '${groupName}' encountered an error.`
                    );
                }
            } else {
                // 5.2 Remove the security group
                let removeUserFromGroup = await vvClient.groups.removeUserFromGroup(
                    {}, // queryParams
                    extRevgroup[0].id,
                    userGuid
                );

                removeUserFromGroup = JSON.parse(removeUserFromGroup);

                // 200 is success;
                if (removeUserFromGroup.meta.status === 200) {
                    logger.info(`User removed from group '${groupName}' successfully.`);

                    // 6. Return response
                    outputCollection[0] = 'Success'; // Don´t change this
                    outputCollection[1] = `User removed from group '${groupName}' successfully.`;
                    outputCollection[2] = removeUserFromGroup;
                } else {
                    throw new Error(
                        `Attempt to remove user '${userId}' from group '${groupName}' encountered an error.`
                    );
                }
            }
        } else {
            throw new Error(`Attempt to get group '${groupName}' encountered an error.`);
        }
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors occurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        response.json(200, outputCollection);
    }
};
