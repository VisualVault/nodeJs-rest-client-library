/**
 * FeeSCHInstallmentReminderNotifications
 * Category: Scheduled
 * Modified: 2025-01-09T18:14:47.693Z by john.sevilla@visualvault.com
 * Script ID: Script Id: 629d7168-b5ce-ef11-82bd-d3a492f2461d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-10
 */
const logger = require("../log");
const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/utc"));

module.exports.getCredentials = function () {
  var options = {};
  options.customerAlias = "WADNR";
  options.databaseAlias = "fpOnline";
  options.userId = "09f356bb-3f44-49b1-a55f-d2caa2de9cc1";
  options.password = "xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=";
  options.clientId = "09f356bb-3f44-49b1-a55f-d2caa2de9cc1";
  options.clientSecret = "xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=";
  return options;
};

module.exports.main = async function (vvClient, response, token) {
  /*Script Name:  FeeSCHInstallmentReminderNotifications
  Customer:      WADNR
  Purpose:       The purpose of this process is to send out a email reminders when the installment fees are due soon or are past due to the provider's profile administrators. Will additionally send an email to administrators (VaultAccess) notifying them of any process errors that may have occurred.

  Pseudo code:   
                1. Get installment fees that need an upcoming due notification
                  a. If no records need notification, stop and don't process any more
                2. For each fee,
                  a. Get the email of the profile administrator(s) for the provider of the fee
                  b. Create the email that profile administrators will receive
                  c. Update the hidden field checkbox that flags that this notification has been sent
                3. Get installment fees that need an overdue notification
                  a. If no records need notification, stop and don't process any more
                4. For each fee,
                  a. Get the email of the profile administrator(s) for the provider of the fee
                  b. Create the email that profile administrators will receive
                  c. Update the hidden field date that denotes the last date when this notification was sent
                5. If any errors were encountered, create an email to administrators to notify them. The notification will change depending on the errors found and severity.
                  a. If Hard Errors were encountered, an immediate send email will be sent
                  b. If Soft Errors were encountered, a digest email with these process errors will be sent
                6. Log any errors that occurred.
  
  Date of Dev: 01/08/2025
  Last Rev Date: 01/08/2025
  Revision Notes:
  01/08/2025 - John Sevilla: Script migrated.
  */

  const ScheduledProcessName =
    "FeeSCHInstallmentReminderNotifications";
  logger.info(`Start of the process ${ScheduledProcessName} at ` + Date());
  response.json(
    "200",
    "Process started, please check back in this log for more information as the process completes.",
  );

  /****************
  Config Variables
  *****************/
  const FeeTemplateID = "Fee";
  const StaffRelationTemplateID = "Staff Relation";
  const IndividualRecordTemplateID = "Individual Record";
  const GetGroupUserEmailsWebsvcName = "LibGroupGetGroupUserEmails";
  const GenerateEmailWebsvcName = "LibEmailGenerateAndCreateCommunicationLog";
  const UpcomingDueInstallmentQueryName =
    "zWebSvc Upcoming Due Instl Fees Need Notification";
  const OverdueInstallmentQueryName = 
    "zWebSvc Overdue Installment Fees Need Notification";
  const UpcomingDueInstallmentEmailTemplateName =
    "Upcoming Due Installment Fee for Profile Administrators";
  const OverdueInstallmentEmailTemplateName =
    "Overdue Installment Fee for Profile Administrators";
  const FeeNameEmailToken = "[Fee Name]";
  const NextDueDateEmailToken = "[Next Due Date]";
  const UpcomingDueInstallmentNotificationCompleteCheckboxName =
    "Upcoming Due Installment Fee Notification Sent";
  const OverdueInstallmentNotificationLastSendDateFieldName =
    "Overdue Installment Fee Notification Last Send Date";

  /* Admin Email Constants */
  const AdministratorGroups = ["VaultAccess"];
  const ScheduledProcessNameEmailToken = "[Scheduled Process Name]";
  const HardErrorFoundAdminImmediateEmailTemplateName =
    "Hard Error Encountered in Scheduled Process";
  const SoftErrorsFoundAdminDigestEmailTemplateName =
    "Soft Errors Encountered in Scheduled Process";
  const ErrorsMessageEmailToken = "[Error Messages]";
  const MaxErrorsToLogInEmail = 50; // controls how many soft errors to show in error emails before truncating
  const SiteUrlToken = "[Site URL]";
  const CustomerAliasToken = "[Customer Alias]";
  const DatabaseAliasToken = "[Database Alias]";

  /* Used by ProcessRecordsHelper */
  const MaxLoops = 10; // Max number of loops that can occur during one scheduled run

  /****************
  Script Variables
  *****************/
  let HardErrorLog = [];
  let SoftErrorLog = [];

  /* Used by ProcessRecordsHelper */
  let CurrentLoopRecordCount = 0;

  /**
   * A mapping of a Provider ID to an array of profile administrator emails for the provider
   * @type {Map<String, String[]>}
   */
  let ProviderIDToProfileAdminEmailsMap = new Map();

  try {
    /****************
    Helper Functions
    *****************/
    /**
     * Wraps an async function that handles a large query result set that may not return all at once (CurrentLoopRecordCount)
     * and calls it until all data records have been processed (typically measured by a process flag set on the record
     * via postFormRevision) or a maximum loop count is reached (MaxLoops) to avoid running infinitely
     *
     * @param {Function} mainFunction - The function that handles the query set
     */
    async function ProcessRecordsHelper(mainFunction) {
      if (typeof mainFunction !== "function") {
        throw new Error("Function not supplied to ProcessRecordsHelper");
      }
      let totalLoops;
      let getNextRows = true;
      for (totalLoops = 0; getNextRows && totalLoops < MaxLoops; totalLoops++) {
        CurrentLoopRecordCount = -1;
        await mainFunction();
        if (CurrentLoopRecordCount === -1) {
          throw new Error(
            `CurrentLoopRecordCount must be updated inside of ${mainFunction.name}. (e.g. CurrentLookRecordCount = getFormsData.length)`,
          );
        } else {
          // processing continues unless last call resulted in no more records
          getNextRows = CurrentLoopRecordCount > 0;
        }
      }

      if (totalLoops >= MaxLoops) {
        throw new Error(
          `Maximum number of iterations reached. Possible infinite loop or large record backlog detected. Killing process.`,
        );
      }
    }

    async function UpcomingDueInstallmentNotification() {
      // Step 1. Get installment fees that need an upcoming due notification
      let queryParams = {};
      let customQueryResp =
        await vvClient.customQuery.getCustomQueryResultsByName(
          UpcomingDueInstallmentQueryName,
          queryParams,
        );
      customQueryResp = JSON.parse(customQueryResp);
      let feesThatNeedNotification = customQueryResp.hasOwnProperty("data")
        ? customQueryResp.data
        : null;

      if (customQueryResp.meta.status !== 200) {
        throw new Error(
          `Error encountered when calling getCustomQueryResultsByName on ${UpcomingDueInstallmentQueryName}. ${customQueryResp.meta.statusMsg}.`,
        );
      }
      if (Array.isArray(feesThatNeedNotification) === false) {
        throw new Error(
          `Data was not returned when calling getCustomQueryResultsByName on ${UpcomingDueInstallmentQueryName}.`,
        );
      }
      // update count for ProcessRecordsHelper
      CurrentLoopRecordCount = feesThatNeedNotification.length;
      if (CurrentLoopRecordCount < 1) {
        // Step 1a. If no records need notification, stop and don't process any more
        return; // exit function without error
      }

      // Step 2. For each fee,
      let feeErrorCount = 0;
      for (const fee of feesThatNeedNotification) {
        try {
          // Step 2a. Get the email of the profile administrator(s) for the provider of the fee
          let profileAdminEmails = await getProviderProfileAdminEmails(fee['provider ID']);

          // Step 2b. Create the email that profile administrators will receive
          await createUpcomingDueInstallmentEmail(fee, profileAdminEmails);

          // Step 2c. Update the hidden field checkbox that flags that this notification has been sent
          let formUpdateObj = {};
          formUpdateObj[UpcomingDueInstallmentNotificationCompleteCheckboxName] = "True";

          let postFormResp = await vvClient.forms.postFormRevision(
            null,
            formUpdateObj,
            FeeTemplateID,
            fee["dhid"],
          );
          if (postFormResp.meta.status !== 201) {
            let message = postFormResp.hasOwnProperty("meta")
              ? postFormResp.meta.statusMsg
              : postFormResp.message;
            throw new Error(
              `Unable to update the ${FeeTemplateID} form. ${message}.`,
            );
          }
        } catch (error) {
          // any errors processing individual fees can be considered soft since one fee failing doesn't fail all fees
          SoftErrorLog.push(
            `Error processing Fee ${fee["dhDocID"]}: ${error.message}`,
          );
          feeErrorCount++;
        }
      }

      if (feeErrorCount >= feesThatNeedNotification.length) {
        throw new Error(
          "Errors encountered processing all fees in a single iteration.",
        );
      }
    }

    async function OverdueInstallmentNotification() {
      // Step 3. Get installment fees that need an overdue notification
      let queryParams = {};
      let customQueryResp =
        await vvClient.customQuery.getCustomQueryResultsByName(
          OverdueInstallmentQueryName,
          queryParams,
        );
      customQueryResp = JSON.parse(customQueryResp);
      let feesThatNeedNotification = customQueryResp.hasOwnProperty("data")
        ? customQueryResp.data
        : null;

      if (customQueryResp.meta.status !== 200) {
        throw new Error(
          `Error encountered when calling getCustomQueryResultsByName on ${OverdueInstallmentQueryName}. ${customQueryResp.meta.statusMsg}.`,
        );
      }
      if (Array.isArray(feesThatNeedNotification) === false) {
        throw new Error(
          `Data was not returned when calling getCustomQueryResultsByName on ${OverdueInstallmentQueryName}.`,
        );
      }
      // update count for ProcessRecordsHelper
      CurrentLoopRecordCount = feesThatNeedNotification.length;
      if (CurrentLoopRecordCount < 1) {
        // Step 3a. If no records need notification, stop and don't process any more
        return; // exit function without error
      }

      // Step 4. For each fee,
      let feeErrorCount = 0;
      for (const fee of feesThatNeedNotification) {
        try {
          // Step 4a. Get the email of the profile administrator(s) for the provider of the fee
          let profileAdminEmails = await getProviderProfileAdminEmails(fee['provider ID']);

          // Step 4b. Create the email that profile administrators will receive
          await createOverdueInstallmentEmail(fee, profileAdminEmails);

          // Step 4c. Update the hidden field date that denotes the last date when this notification was sent
          let formUpdateObj = {};
          formUpdateObj[OverdueInstallmentNotificationLastSendDateFieldName] = dayjs().toISOString();

          let postFormResp = await vvClient.forms.postFormRevision(
            null,
            formUpdateObj,
            FeeTemplateID,
            fee["dhid"],
          );
          if (postFormResp.meta.status !== 201) {
            let message = postFormResp.hasOwnProperty("meta")
              ? postFormResp.meta.statusMsg
              : postFormResp.message;
            throw new Error(
              `Unable to update the ${FeeTemplateID} form. ${message}.`,
            );
          }
        } catch (error) {
          // any errors processing individual fees can be considered soft since one fee failing doesn't fail all fees
          SoftErrorLog.push(
            `Error processing Fee ${fee["dhDocID"]}: ${error.message}`,
          );
          feeErrorCount++;
        }
      }

      if (feeErrorCount >= feesThatNeedNotification.length) {
        throw new Error(
          "Errors encountered processing all fees in a single iteration.",
        );
      }
    }

    async function getProviderProfileAdminEmails(providerID) {
      let profileAdminEmails = ProviderIDToProfileAdminEmailsMap.get(providerID);
      if (Array.isArray(profileAdminEmails) && profileAdminEmails.length > 0) {
        return profileAdminEmails;
      }

      // Get profile administrators for this provider
      let queryParams = {};
      queryParams.q = `[Provider ID] eq '${providerID}' and [Profile Administrator] eq 'True' and [Individual ID] ne ''`;
      queryParams.expand = false;
      queryParams.fields = 'individual ID';
      
      let getFormsResp = await vvClient.forms.getForms(queryParams, StaffRelationTemplateID);
      getFormsResp = JSON.parse(getFormsResp);
      let getFormsData = (getFormsResp.hasOwnProperty('data') ? getFormsResp.data : null);
      
      if (getFormsResp.meta.status !== 200) { throw new Error(`There was an error when calling getForms on ${StaffRelationTemplateID}.`) }
      if (Array.isArray(getFormsData) === false) { throw new Error(`Data was not able to be returned when calling getForms on ${StaffRelationTemplateID}.`) }
      if (getFormsData.length < 1) { throw new Error(`Unable to find profile administrators for provider ${providerID}.`) }

      let profileAdminIndividualIDs = getFormsData.map((staffRelation) => staffRelation['individual ID']);
      
      // Get the emails for each profile admin
      let IDQueryString = profileAdminIndividualIDs.map((id) => `'${id}'`).join(", ");
      queryParams = {};
      queryParams.q = `[instanceName] in (${IDQueryString}) and [Email] ne ''`;
      queryParams.expand = false;
      queryParams.fields = 'email';
      
      getFormsResp = await vvClient.forms.getForms(queryParams, IndividualRecordTemplateID);
      getFormsResp = JSON.parse(getFormsResp);
      getFormsData = (getFormsResp.hasOwnProperty('data') ? getFormsResp.data : null);
      
      if (getFormsResp.meta.status !== 200) { throw new Error(`There was an error when calling getForms on ${IndividualRecordTemplateID}.`) }
      if (Array.isArray(getFormsData) === false) { throw new Error(`Data was not able to be returned when calling getForms on ${IndividualRecordTemplateID}.`) }
      if (getFormsData.length < 1) { throw new Error(`Unable to find emails for the profile administrators of provider ${providerID}.`) }
      
      profileAdminEmails = getFormsData.map((individualRecord) => individualRecord['email']);

      // add to map for future use
      ProviderIDToProfileAdminEmailsMap.set(providerID, profileAdminEmails);

      return profileAdminEmails;
    }

    /**
     * @param {Object} fee - VV form data object for a fee
     * @param {String[]} recipientEmails
     */
    async function createUpcomingDueInstallmentEmail(fee, recipientEmails) {
      // format due date or use a generic string if date is not valid
      let formattedDueDate = "the due date";
      let feeDueDate = dayjs.utc(fee["next Due Date"]); // parse as UTC so subsequent formatting is not affected by script server's local time
      if (feeDueDate.isValid()) {
        formattedDueDate = feeDueDate.format("M/D/YYYY");
      }

      // create communication log
      let tokenArr = [
        { name: FeeNameEmailToken, value: fee["fee Name"] },
        { name: NextDueDateEmailToken, value: formattedDueDate },
      ];

      let emailRequestArr = [
        {
          name: "Email Name",
          value: UpcomingDueInstallmentEmailTemplateName,
        },
        { name: "Department Name", value: "" },
        { name: "Program Office", value: "" },
        { name: "Tokens", value: tokenArr },
        { name: "Email Address", value: recipientEmails.join(",") },
        { name: "Email AddressCC", value: "" },
        { name: "SendDateTime", value: "" },
        { name: "RELATETORECORD", value: [fee["dhDocID"]] },
        {
          name: "OTHERFIELDSTOUPDATE",
          value: {
            "Primary Record ID": fee["dhDocID"],
            "Other Record": fee['provider ID'],
          },
        },
      ];

      let generateEmailResp = await vvClient.scripts.runWebService(
        GenerateEmailWebsvcName,
        emailRequestArr,
      );
      let generateEmailData = generateEmailResp.hasOwnProperty("data")
        ? generateEmailResp.data
        : null;
      if (generateEmailResp.meta.status !== 200) {
        throw new Error(
          `There was an error when calling ${GenerateEmailWebsvcName}.`,
        );
      } else if (!Array.isArray(generateEmailData)) {
        throw new Error(
          `Data was not returned when calling ${GenerateEmailWebsvcName}.`,
        );
      } else if (generateEmailData[0] === "Error") {
        throw new Error(
          `The call to ${GenerateEmailWebsvcName} returned with an error. ${generateEmailData[1]}.`,
        );
      } else if (generateEmailData[0] !== "Success") {
        throw new Error(
          `The call to ${GenerateEmailWebsvcName} returned with an unhandled error.`,
        );
      }
    }

    /**
     * @param {Object} fee - VV form data object for a fee
     * @param {String[]} recipientEmails
     */
    async function createOverdueInstallmentEmail(fee, recipientEmails) {
      // format due date or use a generic string if date is not valid
      let formattedDueDate = "the due date";
      let feeDueDate = dayjs.utc(fee["next Due Date"]); // parse as UTC so subsequent formatting is not affected by script server's local time
      if (feeDueDate.isValid()) {
        formattedDueDate = feeDueDate.format("M/D/YYYY");
      }

      // create communication log
      let tokenArr = [
        { name: FeeNameEmailToken, value: fee["fee Name"] },
        { name: NextDueDateEmailToken, value: formattedDueDate },
      ];

      let emailRequestArr = [
        {
          name: "Email Name",
          value: OverdueInstallmentEmailTemplateName,
        },
        { name: "Department Name", value: "" },
        { name: "Program Office", value: "" },
        { name: "Tokens", value: tokenArr },
        { name: "Email Address", value: recipientEmails.join(",") },
        { name: "Email AddressCC", value: "" },
        { name: "SendDateTime", value: "" },
        { name: "RELATETORECORD", value: [fee["dhDocID"]] },
        {
          name: "OTHERFIELDSTOUPDATE",
          value: {
            "Primary Record ID": fee["dhDocID"],
            "Other Record": fee['provider ID'],
          },
        },
      ];

      let generateEmailResp = await vvClient.scripts.runWebService(
        GenerateEmailWebsvcName,
        emailRequestArr,
      );
      let generateEmailData = generateEmailResp.hasOwnProperty("data")
        ? generateEmailResp.data
        : null;
      if (generateEmailResp.meta.status !== 200) {
        throw new Error(
          `There was an error when calling ${GenerateEmailWebsvcName}.`,
        );
      } else if (!Array.isArray(generateEmailData)) {
        throw new Error(
          `Data was not returned when calling ${GenerateEmailWebsvcName}.`,
        );
      } else if (generateEmailData[0] === "Error") {
        throw new Error(
          `The call to ${GenerateEmailWebsvcName} returned with an error. ${generateEmailData[1]}.`,
        );
      } else if (generateEmailData[0] !== "Success") {
        throw new Error(
          `The call to ${GenerateEmailWebsvcName} returned with an unhandled error.`,
        );
      }
    }

    // Formats the errors logged during the process and sends the proper email template to administrators
    async function createProcessErrorsAdminEmail() {
      // environment variables for email templates
      const { customerAlias, databaseAlias } = module.exports.getCredentials();
      const baseUrl = vvClient.getBaseUrl();

      const siteUrl = new URL(`${baseUrl}/app/${customerAlias}`);
      // get administrator emails
      let administratorEmails = await getUserGroupMemberEmailsNoMap(AdministratorGroups);

      // truncate soft error log if necessary to avoid oversized emails
      let emailSoftErrorLog = SoftErrorLog;
      if (SoftErrorLog.length > MaxErrorsToLogInEmail) {
        emailSoftErrorLog = SoftErrorLog.slice(0, MaxErrorsToLogInEmail);
        emailSoftErrorLog.push(
          `And ${
            SoftErrorLog.length - MaxErrorsToLogInEmail
          } additional process errors`,
        );
      }

      // determine email template & tokens
      let tokenArr = [
        { name: ScheduledProcessNameEmailToken, value: ScheduledProcessName },
      ];

      let adminEmailTemplateName;
      if (HardErrorLog.length > 0) {
        // Step 5a. If Hard Errors were encountered, an immediate send email will be sent
        let errorMessageHTML = `<p><b>Hard Error(s) (halted the process):</b></p>${buildUnorderedListHTMLFromArr(
          HardErrorLog,
        )}<br>`;
        if (emailSoftErrorLog.length > 0) {
          errorMessageHTML += `<p><b>Soft Error(s):</b></p>${buildUnorderedListHTMLFromArr(
            emailSoftErrorLog,
          )}`;
        }

        tokenArr.push(
          { name: ErrorsMessageEmailToken, value: errorMessageHTML},
          { name: SiteUrlToken, value: siteUrl.href},
          { name: CustomerAliasToken, value: customerAlias},
          { name: DatabaseAliasToken, value: databaseAlias}
        );

        adminEmailTemplateName = HardErrorFoundAdminImmediateEmailTemplateName;
      } else if (emailSoftErrorLog.length > 0) {
        // Step 5b. If Soft Errors were encountered, a digest email with these process errors will be sent
        let errorMessageHTML = `${buildUnorderedListHTMLFromArr(
          emailSoftErrorLog,
        )}`;

        tokenArr.push(
          { name: ErrorsMessageEmailToken, value: errorMessageHTML},
          { name: SiteUrlToken, value: siteUrl.href},
          { name: CustomerAliasToken, value: customerAlias},
          { name: DatabaseAliasToken, value: databaseAlias}
        );

        adminEmailTemplateName = SoftErrorsFoundAdminDigestEmailTemplateName;
      }

      // create communication log
      let emailRequestArr = [
        { name: "Email Name", value: adminEmailTemplateName },
        { name: "Department Name", value: "" },
        { name: "Program Office", value: "" },
        { name: "Tokens", value: tokenArr },
        { name: "Email Address", value: administratorEmails.join(",") },
        { name: "Email AddressCC", value: "" },
        { name: "SendDateTime", value: "" },
        { name: "RELATETORECORD", value: [] },
        {
          name: "OTHERFIELDSTOUPDATE",
          value: {
            "Primary Record ID": "",
            "Other Record": "",
          },
        },
      ];

      let generateEmailResp = await vvClient.scripts.runWebService(
        GenerateEmailWebsvcName,
        emailRequestArr,
      );
      let generateEmailData = generateEmailResp.hasOwnProperty("data")
        ? generateEmailResp.data
        : null;
      if (generateEmailResp.meta.status !== 200) {
        throw new Error(
          `There was an error when calling ${GenerateEmailWebsvcName}.`,
        );
      } else if (!Array.isArray(generateEmailData)) {
        throw new Error(
          `Data was not returned when calling ${GenerateEmailWebsvcName}.`,
        );
      } else if (generateEmailData[0] === "Error") {
        throw new Error(
          `The call to ${GenerateEmailWebsvcName} returned with an error. ${generateEmailData[1]}.`,
        );
      } else if (generateEmailData[0] !== "Success") {
        throw new Error(
          `The call to ${GenerateEmailWebsvcName} returned with an unhandled error.`,
        );
      }
    }

    /**
     * Builds a list of unique email addresses belonging to all specified user groups. Note: Does NOT implement
     * UserGroupNameToMemberEmailsMap for caching user group member emails.
     * @param {String[]} groupNames
     * @returns {String[]} groupMemberEmails
     */
    async function getUserGroupMemberEmailsNoMap(groupNames) {
      if (groupNames.length < 1) return []; // no groups

      let groupsParamArr = [{ name: "groups", value: groupNames }];

      let groupEmailAddressesResp = await vvClient.scripts.runWebService(
        GetGroupUserEmailsWebsvcName,
        groupsParamArr,
      );
      let groupEmailAddressesData = groupEmailAddressesResp.hasOwnProperty(
        "data",
      )
        ? groupEmailAddressesResp.data
        : null;
      if (groupEmailAddressesResp.meta.status !== 200) {
        throw new Error(
          `There was an error when calling ${GetGroupUserEmailsWebsvcName}.`,
        );
      } else if (!Array.isArray(groupEmailAddressesData)) {
        throw new Error(
          `Data was not returned when calling ${GetGroupUserEmailsWebsvcName}.`,
        );
      } else if (groupEmailAddressesData[0] === "Error") {
        throw new Error(
          `The call to ${GetGroupUserEmailsWebsvcName} returned with an error. ${groupEmailAddressesData[1]}.`,
        );
      } else if (groupEmailAddressesData[0] !== "Success") {
        throw new Error(
          `The call to ${GetGroupUserEmailsWebsvcName} returned with an unhandled error.`,
        );
      }

      let userData = groupEmailAddressesData[2];
      return userData.map((user) => user["emailAddress"]);
    }

    /**
     * @param {any[]} arr - An array of items that can be converted to a string that will serve as li elements
     * @returns the ul HTML element string
     */
    function buildUnorderedListHTMLFromArr(arr) {
      let listItems = arr.map((item) => `<li>${item}</li>`);
      return `<ul>${listItems.join("")}</ul>`;
    }

    /****************
    BEGIN ASYNC CODE
    *****************/

    // Step 1-2 inside UpcomingDueInstallmentNotification
    try {
      await ProcessRecordsHelper(UpcomingDueInstallmentNotification);
    } catch (error) {
      HardErrorLog.push(`UpcomingDueInstallmentNotification: ${error.message}`);
    }

    // Step 3-4 inside OverdueInstallmentNotification
    try {
      await ProcessRecordsHelper(OverdueInstallmentNotification);
    } catch (error) {
      HardErrorLog.push(`OverdueInstallmentNotification: ${error.message}`);
    }

    // Step 5. If any errors were encountered, create an email to administrators to notify them. The notification will change depending on the errors found and severity.
    if (HardErrorLog.length > 0 || SoftErrorLog.length > 0) {
      await createProcessErrorsAdminEmail();
    }

    // Step 6. Log any errors that occurred.
    if (HardErrorLog.length > 0) {
      throw new Error(HardErrorLog.join(' '));
    } else if (SoftErrorLog.length > 0) {
      logger.info(`Soft errors encountered during processing: ${SoftErrorLog}`);
    }
  } catch (error) {
    // Log errors captured.
    logger.info(JSON.stringify(`${error} ${SoftErrorLog}`));
    throw new Error(
      "Error encountered during processing. Please contact support to troubleshoot the errors that are occurring.",
    );
  } finally {
    // Measure results and communicate completion.
    return vvClient.scheduledProcess.postCompletion(
      token,
      "complete",
      true,
      `${ScheduledProcessName} has completed successfully.`,
    );
  }
};

