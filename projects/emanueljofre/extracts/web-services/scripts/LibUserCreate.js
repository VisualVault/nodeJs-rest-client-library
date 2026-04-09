/**
 * LibUserCreate
 * Category: Form
 * Modified: 2023-10-09T19:46:08.947Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: a1d45a5d-dc66-ee11-8243-eda07f9ff9fa
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
var logger = require('../log');
var Q = require('q');
var moment = require('moment');
var momentTz = require('moment-timezone');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = 'EmanuelJofre';
    options.databaseAlias = 'Main';
    options.userId = 'ema.api';
    options.password = 'p';
    options.clientId = '82748acc-b97f-481a-9f79-7d3705e0f566';
    options.clientSecret = 'hp/AqG8EJr8cySYZCJs3BpV5E0HMM8BUPG65X93LcaQ=';
    return options;
};

module.exports.main = function (ffCollection, vvClient, response) {
    /*Script Name:   LibUserCreate
     Customer:      Visual Vault
     Purpose:       This process will allow a user to be created with various potential options.
                    Those options will be turned on or off depending on what is passed to the NodeJS process.
                    NOTE: If the user is found to exist already, whether enabled or disabled, this script will simply return that info. No other actions will be taken. 
     IMPORTANT CONFIGURATION NOTE: A query must be configured in Default queries (NOT in form data queries) that reflects the below:
                        SELECT UsUserID, UsId, UsFirstName, UsMiddleInit, UsLastName, UsEmailAddress, UsSiteID, UsEnabled
                        FROM dbo.Users
     Parameters: The following represent variables passed into the function from an array:
                User Id - (String, Required)
                Email Address - (String, Required)
                Site Name - (String, Required)
                Group List - (String, Required) String of groups separated by commas. May be an empty string if no groups are desired.
                First Name - (String, Optional)
                Middle Initial - (String, Optional)
                Last Name - (String, Optional)
                Password - (String, Optional) If blank or not passed in, random password will be generated
                Folder Path - (String, Optional) If blank or not passed in, a folder will not be created.
                Folder Permissions - (String, Optional unless folder path was provided and config variable forceSecurities set to true.) Pass in 'Viewer', 'Editor', or 'Owner'
                    IMPORTANT NOTE: This feature should not be used without discussion. Assigning user-based security to folders can cause performance issues. 
                    'Viewer' - The created user account will be assigned viewer permissions to the created folder
                    'Editor' - The created user account will be assigned editor permissions to the created folder
                    'Owner' - The created user account will be assigned owner permissions to the created folder
                Send Email - (String, Required) Pass in 'Standard', 'Custom', or 'Both'.
                    'Standard' will send only the VV-generated username and password email.
                    'Custom' allows Email Subject and Email Body to be passed in.
                    'Both' will send both the VV-generated email and the custom email passed in.
                Email Subject - (String, Required when Send Email is Custom or Both) Subject of the username and password email
                Email Body - (String, Required when Send Email is Custom or Both) Body of username and password email.
                              When Send Email is 'Custom', [Username] and [Password] must be included in the email body.
                Related Records - (Array of Strings, optional) The Form IDs of any records that the Communication Log should be related to.
                Other Fields - (Object, optional) This is an object of other field names with field values to update on the Communications Log.
                    Example format:
                    {
                        name: 'Other Fields', value: {
                            "Individual ID": indivId,
                            "Record ID": formId
                        }
                    }
         
    Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.
                Any item in the array at points 2 or above can be used to return multiple items of information.
                0 - Status: Success, Minor Error, Error
                    //Minor Error represents any errors that occurred after the user account was created.
                    //If updating form record fields to reflect an "account created" status, update the fields when Success or Minor Error returned.
                1 - Message
                    //On Error response, "User Exists" and "User Disabled" messages should be handled specifically.
                2 - User GUID
     Psuedo code: 
        1. Validate passed in parameters
        2. Search for the user ID provided to see if the user already exists. Use a custom query to return disabled users too.
            a. If user already exists, process will end and notify user of the duplicate. UsID and SiteID are returned.
        3. Search the Site Name passed in to determine if it exists.
                    a. If site already exists then it will save the SiteID pass that on.
                    b. If site does not exist then it will create a site by running postSite
        4. If groups were passed in, check if the groups exist using getGroups.
            a. If any of the groups do not exist, process will end and notify user of the error.
        5. Start of user creation logic. If a random password needs to be generated, do it now.
        6. Create the user account by calling postUsers.
            a. If this step is completed successfully, any handled errors occurring later in the code are pushed into the error array and returned as minor errors. 
               Once the user has been created, want to be sure the user GUID and site ID are passed back so user creation is reflected on the form record.
        7. If groups were passed in, add the user to groups using addUserToGroup.
        8. If a custom email needs to be sent to the created user, send it using postEmails.
        9. If a communications log needs to be created to reflect the welcome email, create it with postForms.
            a. Relate the created communication log to each Form ID in the relateToRecords array.
        10. If user has entered a folder path, determine if a folder exists in the destination location, to prevent duplication. Call getFolders.
            a. If the folder was not found, create the folder suing postFolderByPath.
            b. Add security permission for the user on that folder.
        11. If all steps above completed successfully, check if any errors were logged in the error array.
            a. If minor errors occurred, return ‘Minor Error’ with details.
            b. If no errors, return ‘Success’
     Date of Dev:   12/4/2018
     Last Rev Date: 06/17/2020
     Revision Notes:
     12/04/2018 - Alex Rhee: Initial creation of the business process.
     12/18/2018 - Alex Rhee: Code reorganized and rewritten to follow promise chaining examples. Still missing folder provisioning.
     12/20/2018 - Alex Rhee: Script is now fully functional and adding folder securities works. Need to now clean up code and test further.
     1/2/19 - Alex Rhee: Script has been cleaned up, commented, bug tested.
     1/18/19 - Alex Rhee: Made sure all API calls are being measured by Resp.meta.status === 200.
     09/25/2019 - Removed uppercase I and lowercase L at customer request.
     12/19/2019 - Kendra Austin: Script rewrite. Add hyphen (-) to user ID chars, add configuration to use or not use Comm Log, send only one custom email.
     01/08/2020 - Kendra Austin: Switch out getUsers to a custom query. Allows disabled users to be returned so better error handling.
     01/16/2020 - Kendra Austin: Add Other Fields to parameters for Comm Log creation. Make comments about folder security.
     06/17/2020 - Kendra Austin: Do not use $ in passwords. $& is a .replace() method shortcut. 
     */

    logger.info('Start of the process UserCreate at ' + Date());

    //---------------CONFIG OPTIONS---------------
    //Possible characters for password. Do not include $.
    var passwordChars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#%^&*()_+";

    //Allowed characters for User ID
    var userNameChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.@+-";

    var PasswordLength = 8;                                 //Password length when a random password is generated
    var minPasswordLength = 5;                              //Minimum length for password when one is passed in to be used.                    
    var SysChangePass = 'true';                             //Require user to change password on first login. Set to 'true' for required; set to 'false' for not required.
    var createCommLog = true;                               //Dictates whether a communication log is created to reflect the custom welcome email sent to the user. Passwords are redacted.
    var commLogTemplateID = 'Communications Log';           //When createCommLog is true, this is the template name of the Communications Log. Used to post form. 
    var userQueryName = 'User Lookup';                      //The name of the custom query in Default queries (NOT in form data queries)
    var timeZone = 'America/Phoenix';                       //Set the local time zone here. Used when posting Communications Logs

    /* Reference List of Moment Timezones: 
    Pacific Time: America/Los_Angeles
    Arizona Time: America/Phoenix
    Central Time: America/Chicago
    Eastern Time: America/New_York
    */

    //forceSecurities: KEEP THIS FALSE UNLESS GIVEN EXPLICIT PERMISSION.
    //Force the user to input security permissions when passing in folder paths. 
    //If set to true an error will be sent back if the user passes in a folder but no folder security or an invalid folder security.
    //If false and not passed in, folder is created without security. 
    var forceSecurities = false; 

    //------------------END CONFIG OPTIONS----------------

    //Passed-in Parameters
    //Create variables for the values the user inputs when creating their User
    var userID = ffCollection.getFormFieldByName('User Id');
    var siteName = ffCollection.getFormFieldByName('Site Name');
    var firstName = ffCollection.getFormFieldByName('First Name');
    var middleInitial = ffCollection.getFormFieldByName('Middle Initial');
    var lastName = ffCollection.getFormFieldByName('Last Name');
    var emailAddress = ffCollection.getFormFieldByName('Email Address');
    var password = ffCollection.getFormFieldByName('Password');
    var groupList = ffCollection.getFormFieldByName('Group List');

    //Admin options for User Creation
    var sendEmail = ffCollection.getFormFieldByName('Send Email');
    var relateToRecords = ffCollection.getFormFieldByName('Related Records');
    var otherFields = ffCollection.getFormFieldByName('Other Fields');
    var folderPath = ffCollection.getFormFieldByName('Folder Path');
    var securityLevel = ffCollection.getFormFieldByName('Folder Permissions');

    //Email information coming from client side or intermediary node script
    var subjectField = ffCollection.getFormFieldByName('Email Subject');
    var bodyField = ffCollection.getFormFieldByName('Email Body');

    //Script Variables
    var errors = [];                        //Used to hold errors as they are found, to return together.
    var createFolder = false;               //Used to measure whether folder attributes were passed in and a folder should be created.
    var siteID = '';                        //Used to store the site ID that the user wil be assigned to.
    var siteExists = false;                 //Used to determine if the site exists or if it needs to be created. 
    var userGUID = '';                      //Used to store the user GUID to be returned to the calling function.
    var groupsPassed = false;               //Used to determine if groups were passed in to be assigned to the user.
    var groupIdArray = [];                  //Used to hold the IDs of all groups the user should be added to.
    var bodyWithoutPassword = '';           //Used to hold the version of the welcome email with the username in it but password redacted.
    var folderId = '';                      //Used to hold the folder ID, stored to apply security permissions. 
    var userPassword = '';                  //Used to hold the user's password.

    //Initialization of the return object
    var returnObj = [];

    /*******************************************************
    *                   HELPER FUNCTIONS                    *
    ********************************************************/
    //Character validation function, used for usernames and passwords
    var characterValidation = function (phrase, type) {
        var errorList = '';
        var charList = '';

        if (type == 'password') {
            charList = passwordChars;
        }
        else if (type == 'username') {
            charList = userNameChars;
        }
        else {
            return ['Error', 'Invalid type'];
        }

        for (i = 0; i < phrase.length; i++) {
            if (charList.indexOf(phrase[i]) < 0) {
                errorList += phrase[i] + ' is an invalid character for ' + type + 's. ';
            }
        }

        if (errorList != '') {
            return ['Error', errorList];
        }
        else {
            return ['Success'];
        }
    }

    var arrayTrimmer = function (array) {
        arrayHolder = [];
        for (i = 0; i < array.length; i++) {
            arrayHolder.push(array[i].trim());
        }
        return arrayHolder;
    }

    var randomPassword = function () {
        var text = "";

        for (var i = 0; i < PasswordLength; i++)
            text += passwordChars.charAt(Math.floor(Math.random() * passwordChars.length));

        return text;
    };

    /*******************************************************
    *                   MAIN FUNCTION                       *
    ********************************************************/


    //Start the promise chain
    var result = Q.resolve();

    return result.then(function () {
        //Validate passed in fields
        //User Id
        if (!userID || !userID.value) {
            errors.push("The User Id parameter was not supplied.");
        }
        else {
            userID = userID.value;

            //Validate that the user ID provided includes only accepted characters
            var userIdValidation = characterValidation(userID, 'username');
            if (userIdValidation[0] == 'Error') {
                errors.push(userIdValidation[1]);
            }
        }

        //Email Address
        if (!emailAddress || !emailAddress.value) {
            errors.push("The Email Address parameter was not supplied.");
        }
        else {
            emailAddress = emailAddress.value;

            //Validate that the email address is a valid email
            var emailReg = new RegExp('\\b[A-Za-z0-9._%+-]+\@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}\\b');
            if (!emailReg.test(emailAddress)) {
                errors.push("The Email Address provided is not a valid email format.");
            }
        }

        //Site Name
        if (!siteName || !siteName.value) {
            errors.push("The Site Name parameter was not supplied.");
        }
        else {
            siteName = siteName.value;
        }

        //Group List. Allow an empty string.
        if (!groupList || (!groupList.value && groupList.value.trim() != '')) {
            errors.push("The Group List parameter was not supplied.");
        }
        else {
            groupList = groupList.value;

            if (groupList.trim() == '') {
                groupsPassed = false;
            }
            else {
                groupsPassed = true;
            }
        }

        //Send Email
        if (!sendEmail || !sendEmail.value) {
            errors.push("The Send Email parameter was not supplied.");
        }
        else {
            sendEmail = sendEmail.value;

            //Validate that Send Email is an appropriate value. 
            if (sendEmail != 'Standard' && sendEmail != 'Custom' && sendEmail != 'Both') {
                errors.push("The Send Email parameter must be 'Standard', 'Custom', or 'Both'.");
            }
        }

        //Validate conditionally required inputs
        //First Name
        if (!firstName || !firstName.value) {
            //Not required. Set to empty string to avoid undefined errors.
            firstName = '';
        }
        else {
            firstName = firstName.value;
        }

        //Middle Initial
        if (!middleInitial || !middleInitial.value) {
            //Not required. Set to empty string to avoid undefined errors.
            middleInitial = '';
        }
        else {
            middleInitial = middleInitial.value;
        }

        //Last Name
        if (!lastName || !lastName.value) {
            //Not required. Set to empty string to avoid undefined errors.
            lastName = '';
        }
        else {
            lastName = lastName.value;
        }

        //Password
        if (!password || !password.value || password.value.trim() == '') {
            //Not required. Set to empty string to avoid undefined errors. Will generate random password for user.
            password = '';
        }
        else {
            password = password.value;

            //Validate that the password is a valid length. 
            if (password.length < minPasswordLength) {
                errors.push('The password must be at least ' + minPasswordLength + ' long. ');
            }

            //Validate that the password provided includes only accepted characters
            var passwordValidation = characterValidation(password, 'password');
            if (passwordValidation[0] == 'Error') {
                errors.push(passwordValidation[1]);
            }
        }

        //Folder Path
        if (!folderPath || !folderPath.value || folderPath.value.trim() == '') {
            //Not required. Set to empty string to avoid undefined errors.
            folderPath = '';
            createFolder = false;
        }
        else {
            folderPath = folderPath.value;
            createFolder = true;
        }

        //Folder Permissions
        if (createFolder) {
            if (!securityLevel || !securityLevel.value || securityLevel.value.trim() == '') {
                if (forceSecurities) {
                    errors.push('The Folder Permissions parameter was not supplied.');
                }
                else {
                    //Not required. Set to empty string to avoid undefined errors.
                    securityLevel = '';
                }
            }
            else {
                securityLevel = securityLevel.value;

                if (securityLevel != 'Viewer' && securityLevel != 'Editor' && securityLevel != 'Owner') {
                    errors.push('The Folder Permissions parameter must be Viewer, Editor, or Owner.');
                }
            }
        }
        else {
            //Set to empty string to avoid undefined errors.
            securityLevel = '';
        }

        //Email Subject and Email Body
        if (sendEmail == 'Custom' || sendEmail == 'Both') {
            //Email Subject
            if (!subjectField || !subjectField.value) {
                errors.push("The Email Subject parameter was not supplied.");
            }
            else {
                subjectField = subjectField.value;
            }

            //Email Body
            if (!bodyField || !bodyField.value) {
                errors.push("The Email Body parameter was not supplied.");
            }
            else {
                bodyField = bodyField.value;

                //If only the custom email is being sent, make sure it includes the username and password
                if (sendEmail == 'Custom') {
                    if (bodyField.indexOf('[Username]') == -1 || bodyField.indexOf('[Password]') == -1) {
                        errors.push('The Email Body must include [Username] and [Password].');
                    }
                }
            }
        }
        else {
            //Set values to empty strings to avoid undefined errors.
            subjectField = '';
            bodyField = '';
        }

        //Related Records
        if (!relateToRecords || !relateToRecords.value) {
            //Not required. Set to empty array to avoid undefined errors.
            relateToRecords = [];
        }
        else {
            relateToRecords = relateToRecords.value;

            if (Array.isArray(relateToRecords) == false) {
                errors.push('The Related Records parameter must be an array when it is provided.');
            }
        }

        //Other Fields
        if (!otherFields || !otherFields.value) {
            //Not required. Set to empty object to avoid undefined errors.
            otherFields = {};
        }
        else {
            otherFields = otherFields.value;
        }

        //Return all validation errors at once.
        if (errors.length > 0) {
            throw new Error(errors);
        }
    })
        .then(function () {
            //Search for the user ID provided to see if the user already exists
            var userQueryParams = { filter: "[UsUserID] = '" + userID + "'" }

            return vvClient.customQuery.getCustomQueryResultsByName(userQueryName, userQueryParams).then(function (userRes) {
                var userData = JSON.parse(userRes);
                if (userData.meta.status == 200) {
                    if (userData.data.length == 1) {
                        //Exactly one user found. Save all user info for later use. 
                        var userInfo = userData.data[0];
                        userGUID = userInfo.usId;
                        returnObj[2] = userGUID;

                        //Measure the found user is enabled or disabled. Send a correct error.
                        var userEnabled = userInfo.usEnabled;           //This is 0 or 1
                        if (userEnabled == 1) {
                            throw new Error('User Exists');
                        }
                        else if (userEnabled == 0) {
                            throw new Error('User Disabled');
                        }
                        else {
                            throw new Error('A duplicate user was found, but the process was unable to determine if the user account is currently enabled or disabled. '
                                + 'Please try again or contact a system administrator.');
                        }
                    }
                    else if (userData.data.length == 0) {
                        //No user found. This is good.
                        logger.info('Searched for existing users with ID ' + userID + '. None found. Continuing the process.');
                    }
                    else {
                        //Many users found. Invalid state. 
                        throw new Error('More than one user was found for ID: ' + userID + '. This is an invalid state. Please notify a system administrator.');
                    }
                }
                else if (userData.meta.status == 404) {
                    throw new Error('The custom query to find users was not found. Please ensure that a query named ' + userQueryName + ' has been configured in the default queries area.');
                }
                else {
                    throw new Error('There was an error when searching for the user ' + userID + '.');
                }
            })
        })
        .then(function () {
            //Search the Site Name passed in to determine if it exists. 
            var siteSearchObject = {};
            siteSearchObject.q = "name eq '" + siteName + "'";
            siteSearchObject.fields = "id,name";

            return vvClient.sites.getSites(siteSearchObject).then(function (siteResp) {
                var siteData = JSON.parse(siteResp);
                if (siteData.meta.status === 200) {
                    if (siteData.data.length === 0) {
                        //Need to create the site.
                        siteExists = false;
                    }
                    else if (siteData.data.length === 1) {
                        logger.info('The site exists. Continuing the process.');
                        //Found exactly one site. Store the ID and move on. 
                        siteID = siteData.data[0].id;

                        //Do not need to create the site.
                        siteExists = true;
                    }
                    else {
                        //Found more than one matching site. This is not a valid state. 
                        throw new Error('The call to search for the site name ' + siteName + ' returned with more than one result. This is an invalid state. Please contact a system administrator.');
                    }
                }
                else {
                    throw new Error('The call to search for the site name ' + siteName + ' returned with an error.');
                }
            })
        })
        .then(function () {
            //If needed, create the site. 
            if (!siteExists) {
                var newSiteData = {};
                newSiteData.name = siteName;
                newSiteData.description = siteName;

                return vvClient.sites.postSites(null, newSiteData).then(function (postSiteResp) {
                    if (postSiteResp.meta.status === 200) {
                        logger.info('Site created successfully.');
                        siteID = postSiteResp.data.id;
                    }
                    else {
                        throw new Error('The call to create a site with name ' + siteName + ' returned with an error.');
                    }
                });
            }
        })
        .then(function () {
            if (groupsPassed) {
                //Check if the groups passed in by the user exist.
                var groupParam = {};
                groupParam.q = "";
                groupParam.fields = 'id,name,description';

                //Function to get all system groups
                return vvClient.groups.getGroups(groupParam).then(function (groupResp) {
                    var groupData = JSON.parse(groupResp);
                    if (groupData.meta.status === 200) {
                        if (groupData.data.length > 0) {
                            //Groups were found. Process results.
                            //Array to hold all the group names that the user has input.
                            var groupArrayUntrimmed = groupList.split(",");
                            var groupArray = arrayTrimmer(groupArrayUntrimmed);

                            //Need to ensure that all items in groupArray exist in existingGroups; extract group IDs.
                            var groupErrors = '';
                            groupArray.forEach(function (groupName) {
                                var group = groupData.data.find(x => x.name === groupName);
                                if (group != undefined) {
                                    //Found it
                                    groupIdArray.push(group);
                                }
                                else {
                                    groupErrors += 'The group ' + groupName + ' does not exist. ';
                                }
                            });

                            //If any groups do not exist, stop the process. Otherwise continue. 
                            if (groupErrors != '') {
                                throw new Error('At least one group was not found to exist. ' + groupErrors);
                            }
                            else {
                                logger.info('All groups were found to exist. Continuing the process.');
                            }
                        }
                        else {
                            throw new Error('No user permission groups were found to exist in the system. Please contact a system administrator.');
                        }
                    }
                    else {
                        throw new Error('The call to get existing group names returned with an error.');
                    }
                });
            }
        })
        .then(function () {
            //Starting user creation logic. If a random password needs to be generated, do it now.
            if (password == '') {
                //Generate a random password
                userPassword = randomPassword();
            }
            else {
                //Use the password that was passed in.
                userPassword = password;
            }

            var newUserObject = {};
            newUserObject.userid = userID;
            newUserObject.firstName = firstName;
            newUserObject.middleInitial = middleInitial;
            newUserObject.lastName = lastName;
            newUserObject.emailaddress = emailAddress;
            newUserObject.password = userPassword;
            newUserObject.mustChangePassword = SysChangePass;

            if (sendEmail != 'Custom') {
                newUserObject.sendEmail = 'true';
            }
            else {
                newUserObject.sendEmail = 'false';
            }

            var userParams = {};

            return vvClient.users.postUsers(userParams, newUserObject, siteID).then(function (userResp) {
                if (userResp.meta.status === 200) {
                    //User created. Store the user GUID for passing back to the calling function. 
                    //At this point, future processes should return Success or Minor Errors. Not throwing any more errors because the user has been created.
                    userGUID = userResp.data.id;
                }
                else {
                    throw new Error('The call to create the user returned with an error.');
                }
            });
        })
        .then(function () {
            //If groups were passed in, add the user to groups
            if (groupsPassed) {
                var addGroupProcess = Q.resolve();

                groupIdArray.forEach(function (groupItem) {
                    addGroupProcess = addGroupProcess.then(function () {
                        return vvClient.groups.addUserToGroup({}, groupItem.id, userGUID).then(function (addResp) {
                            var addData = JSON.parse(addResp);
                            if (addData.meta.status !== 201) {
                                //Continuing the process if an error occurs; will measure this at the end of the process.
                                logger.info('Error adding user to group ' + groupItem.name + '.');
                                errors.push('Error adding user to group ' + groupItem.name + '.');
                            }
                        });
                    });
                });

                return addGroupProcess;
            }
        })
        .then(function () {
            //If an email needs to be sent to the created user, send it now
            if (sendEmail == 'Custom' || sendEmail == 'Both') {
                var emailData = {};
                emailData.recipients = emailAddress;
                emailData.subject = subjectField;

                //Replace Username and Password tokens.
                bodyWithoutPassword = bodyField.replace('[Username]', userID);
                emailData.body = bodyWithoutPassword.replace('[Password]', userPassword);

                var emailParams = '';

                return vvClient.email.postEmails(emailParams, emailData).then(function (emailResp) {
                    if (emailResp.meta.status === 201 && emailResp.data.success == true) {
                        logger.info("Welcome email sent successfully.");
                    }
                    else {
                        logger.info('User has been created, but the welcome email was not sent successfully.');
                        errors.push('User has been created, but the welcome email was not sent successfully.');
                    }
                });
            }
        })
        .then(function () {
            //If a communications log needs to be created to reflect the welcome email, send it now.
            if (createCommLog && sendEmail != 'Standard') {

                var sendDate = momentTz().tz(timeZone).format('L');
                var sendTime = momentTz().tz(timeZone).format('LT');
                var localTime = sendDate + " " + sendTime;

                var targetFields = {};
                targetFields['Communication Type'] = 'Email';
                targetFields['Email Type'] = 'Immediate Send';
                targetFields['Email Recipients'] = emailAddress;
                targetFields['Subject'] = subjectField;
                targetFields['Email Body'] = bodyWithoutPassword;
                targetFields['Scheduled Date'] = localTime;
                targetFields['Communication Date'] = localTime;
                targetFields['Approved'] = 'Yes';
                targetFields['Communication Sent'] = 'Yes';

                //Load additional fields
                for (var property1 in otherFields) {
                    targetFields[property1] = otherFields[property1];
                }

                return vvClient.forms.postForms(null, targetFields, commLogTemplateID).then(function (postResp) {
                    if (postResp.meta.status === 201 || postResp.meta.status === 200) {
                        var commLogRevisionId = postResp.data.revisionId;

                        if (relateToRecords.length > 0) {
                            //Relate the created communication log to each Form ID in the relateToRecords array.
                            var relateProcessResult = Q.resolve();

                            relateToRecords.forEach(function (relatedForm) {
                                relateProcessResult = relateProcessResult.then(function () {
                                    return vvClient.forms.relateFormByDocId(commLogRevisionId, relatedForm).then(function (relateResp) {
                                        var relatedResp = JSON.parse(relateResp);
                                        if (relatedResp.meta.status === 200 || relatedResp.meta.status === 404) {
                                            logger.info("Communications Log related to form " + relatedForm + " successfully.");
                                        }
                                        else {
                                            logger.info("Call to relate the Communications Log to form " + relatedForm + " returned with an error.");
                                            errors.push("Call to relate the Communications Log to form " + relatedForm + " returned with an error.");
                                        }
                                    });
                                });
                            });

                            return relateProcessResult;
                        }
                    }
                    else {
                        errors.push("Call to post Communications Log form returned with an error. The server returned a status of " + postResp.meta.status);
                    }
                })
            }
        })
        .then(function () {
            //If user has entered a folder path, then the system will search for the folder and create a new folder if it does not already exist.
            if (createFolder) {
                //Determine if a folder exists in the destination location, to prevent duplication
                logger.info("Finding folder: " + folderPath);

                var FolderParams = {};
                FolderParams.folderPath = folderPath;

                return vvClient.library.getFolders(FolderParams).then(function (folderResp) {
                    var folderData = JSON.parse(folderResp);
                    if (folderData.meta.status === 200) {
                        if (folderData.data.length > 0) {
                            //Folder found. Log the ID but do not create the folder.
                            folderId = folderData.data[0].id;
                        }
                        else {
                            logger.info("The call to find a folder at " + folderPath + " returned with no duplicates. Continuing the process.");
                        }
                    }
                    else if (folderData.meta.status === 403) {
                        logger.info("The call to find a folder at " + folderPath + " returned with a 403. Assuming no duplicates and continuing the process.");
                    }
                    else {
                        logger.info("The call to find a folder at " + folderPath + " returned with an error.");
                        errors.push("The call to find a folder at " + folderPath + " returned with an error.");
                    }
                });
            }
        })
        .then(function () {
            //If the folder was not found in the previous step, create the folder
            if (createFolder && folderId == '') {
                var folderData = {};
                return vvClient.library.postFolderByPath(null, folderData, folderPath).then(function (createFolderResp) {
                    if (createFolderResp.meta.status === 200) {
                        logger.info("Folder created successfully.");
                        folderId = createFolderResp.data.id;
                    }
                    else {
                        errors.push("User was created but call to create folder at " + folderPath + " returned with an error.");
                    }
                });
            }
        })
        .then(function () {
            //The system will then take the security permissions that the user has entered and will add that security permission for the user on that folder.
            if (securityLevel != '' && folderId != '') {
                var memType = 'User';
                memType = vvClient.constants.securityMemberType[memType];
                var role = vvClient.constants.securityRoles[securityLevel]
                var cascadeChanges = true;

                return vvClient.library.putFolderSecurityMember(folderId, userGUID, memType, role, cascadeChanges).then(function (folderSecurityResp) {
                    if (folderSecurityResp.meta.status === 200) {
                        logger.info('Security permissions successfully added to folder');
                    }
                    else {
                        errors.push('The folder was created, but an error was returned when attempting to add user security permissions to the folder.');
                    }
                });
            }
        })
        .then(function () {
            //Handle any minor errors.
            if (errors.length > 0) {
                returnObj[0] = 'Minor Error';
                returnObj[1] = '';
                errors.forEach(function (errorLog) {
                    returnObj[1] += errorLog + '<br>';
                });
            }
            else {
                returnObj[0] = 'Success';
                returnObj[1] = 'All actions completed successfully.';
            }

            //Always pass back the user GUID, since user was created.
            returnObj[2] = userGUID;
            return response.json(returnObj);
        })
        .catch(function (err) {
            logger.info(JSON.stringify(err));

            returnObj[0] = 'Error';

            if (err && err.message) {
                returnObj[1] = err.message;
            } else {
                returnObj[1] = "An unhandled error has occurred. The message returned was: " + err;
            }

            return response.json(returnObj);
        })
}

