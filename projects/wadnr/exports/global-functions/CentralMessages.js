/**
 * VV.Form.Global.CentralMessages
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (messageType, messageParams) {
// CentralMessages Global Script
let modalIcon = "";
let modalTitle = "";
let modalMessage = "";
let modalMessageStyles = null;
let urls = "";

// Helper Function that turns string text into title case
String.prototype.toTitleCase = function () {
  return this.toLowerCase()
    .split(" ")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

//Check if messageParams were passed into the function if not display an error message. Items in the exceptions list will not display an error and flow will continue.
if (VV.Form.Global.isNullEmptyUndefined(messageParams)) {
  modalIcon = "error";
  modalTitle = `Missing messageParams`;
  modalMessage = `No messageParams were provided for function VV.Form.Global.CentralMessages(messageType, messageParams). Please provide messageParams.`;
  showModal(); //Call VV.Form.Global.DisplayModal to display the CentralMessage
} else {
  // Check messageType and set modalTitle, modalIcon and modalMessage accordingly
  switch (messageType) {
    // This code handles the "Duplicate Record" case
    case "Duplicate Record":
      /* The following is an example of what a messageParams object 
      could contain when passed into this function for "Duplicate Record" case: 
        {
          templateName: 'License Regulation Relation', // Template name that will be displayed
          duplicateFields: ['License Type', 'Regulation ID'], // Field names that will be displayed
          duplicateData: duplicateData, // Duplicate data objects returned from WebSvc
          action: 'Add a License Type', // Friendly text describing the user action.
        }
      */
      // Duplicate records will always display an error icon
      modalIcon = "error";
      // Sets the modal title to include the template name
      modalTitle = `Duplicate Record`;

      // If there is duplication data provided
      if (!VV.Form.Global.isNullEmptyUndefined(messageParams.duplicateData)) {
        modalMessage = `${
          messageParams.duplicateData.length == 1
            ? `A duplicate <u>${
                !VV.Form.Global.isNullEmptyUndefined(messageParams.templateName)
                  ? messageParams.templateName
                  : ""
              }</u> record was`
            : `Multiple duplicate <u>${
                !VV.Form.Global.isNullEmptyUndefined(messageParams.templateName)
                  ? messageParams.templateName
                  : ""
              }</u> records were`
        } found based on the information provided for the following field(s):
        <br><b>[${messageParams.duplicateFields.join(", ")}]</b></br>
        <br>Check that the data entered is correct and make any necessary adjustments then take the 
        <b>[${messageParams.action}]</b>
        action again. If you believe the information entered is correct, please reach out to the department responsible for the license for further assistance.
        </br>`;
        // Build URLs for the found duplicate records with html formatting
        urls = VV.Form.Global.BuildUrls(messageParams.duplicateData, true).join(
          "",
        );
        modalMessage += `<br>Click on the link below to open the corresponding duplicate record:</br>
       <br>${urls}</br>`;
      } else {
        modalMessage = `Duplicate <b><u>${
          !VV.Form.Global.isNullEmptyUndefined(messageParams.templateName)
            ? messageParams.templateName
            : ""
        }</u></b> data was found based on the information provided for the following field(s):
        <br><b>[${messageParams.duplicateFields.join(", ")}]</b></br>
        <br>Check that the data entered is correct and make any necessary adjustments then take the 
        <b>[${messageParams.action}]</b>
        action again. If you believe the information entered is correct, please reach out to the department responsible for the license for further assistance.
        </br>`;
      }
      break;
    case "No Records Selected":
      /*Example action: 'enable' || 'disable'
        {
          action:action.toLowerCase(),
        }
      */
      modalIcon = "warning"; //Message will always display a warning icon
      modalTitle = "No records selected";
      modalMessage = `Please select at least one record to ${messageParams.action}.`;
      break;
    case "Status":
      /*Example action: 'saved' || 'enabled' || 'disabled'
        {
          templateName: 'SomeTemplateName'
          status: 'saved' || 'added' || 'enabled' || 'updated' || 'deleted' etc...
          selection: true || false //Determines if verbiage for selected record or records will be displayed
          multipleRecords: true || false //Used to determine singular or plural language
        }
      */
      if (VV.Form.Global.isNullEmptyUndefined(messageParams.selection)) {
        modalIcon = "success";
        modalTitle = `${
          VV.Form.Global.isNullEmptyUndefined(messageParams.multipleRecords)
            ? "Record"
            : "Records"
        } ${messageParams.status}`;
        modalMessage = `The ${
          !VV.Form.Global.isNullEmptyUndefined(messageParams.templateName)
            ? messageParams.templateName
            : ""
        } ${
          VV.Form.Global.isNullEmptyUndefined(messageParams.multipleRecords)
            ? "Record has"
            : "Records have"
        } been ${messageParams.status}.`;
      } else {
        let multipleRecords = messageParams.multipleRecords;
        let multipleRecordsText = multipleRecords ? "Records" : "Record";
        let messagePrefix = "selected";
        modalIcon = "success"; //Disabled records will always display an success icon
        modalTitle = `${multipleRecordsText} ${messageParams.status.toTitleCase()}`;
        modalMessage = `The ${messagePrefix} ${
          !VV.Form.Global.isNullEmptyUndefined(messageParams.templateName)
            ? messageParams.templateName
            : ""
        } ${multipleRecordsText.toLowerCase()} ${
          multipleRecords ? "have" : "has"
        } been ${messageParams.status.toLowerCase()}.`;
      }
      break;
    case "Unable To Copy Same Address":
      /*Example messageParams:
        {
          sourceAddressFieldsIdentifier: "Mailing Address", // identifies the set of address fields
          sameAddressFieldName: "Same Address", // identifies only the same address field
        }
      */
      var sourceAddressFieldsIdentifier = "";
      if (
        VV.Form.Global.isNullEmptyUndefined(
          messageParams.sourceAddressFieldsIdentifier,
        ) === false
      ) {
        sourceAddressFieldsIdentifier =
          messageParams.sourceAddressFieldsIdentifier;
      }
      var sameAddressFieldName = "";
      if (
        VV.Form.Global.isNullEmptyUndefined(
          messageParams.sameAddressFieldName,
        ) === false
      ) {
        sameAddressFieldName = messageParams.sameAddressFieldName;
      }
      modalIcon = "error";
      modalTitle = "Unable to copy address fields";
      modalMessage = `Please complete the ${sourceAddressFieldsIdentifier} fields with valid information before selecting "Yes" on the ${sameAddressFieldName} field.`;
      break;
    case "Help":
      /*Example messageParams:
        {
          helpTitle: "Help",
          helpText: "Some helpful text",
          helpTextAlignment: "left",
        }
      */
      let helpText = "";
      if (
        VV.Form.Global.isNullEmptyUndefined(messageParams.helpText) === false
      ) {
        helpText = messageParams.helpText;
      }
      let helpTitle = "";
      if (
        VV.Form.Global.isNullEmptyUndefined(messageParams.helpTitle) === false
      ) {
        helpTitle = `${messageParams.helpTitle} Help`;
      } else {
        helpTitle = "Help";
      }

      let helpTextStyles = {};
      if (VV.Form.Global.isNullEmptyUndefined(messageParams.helpTextAlignment) === false) {
        helpTextStyles.textAlign = messageParams.helpTextAlignment;
      }

      modalIcon = "question";
      modalTitle = helpTitle;
      modalMessage = helpText;
      modalMessageStyles = helpTextStyles;
      break;  
    default: //Set error message for missing or invalid messageType
      modalIcon = "error";
      modalTitle = "MessageType missing or invalid";
      modalMessage = `MessageType missing or invalid for function VV.Form.Global.CentralMessages(). Please provide a valid messageType.`;
      break;
  }
  showModal(); //Call VV.Form.Global.DisplayModal to display the CentralMessage
}

function showModal() {
  try {
    // Display modal with modalIcon, modalTitle and modalMessage
    VV.Form.Global.DisplayModal({
      Icon: modalIcon,
      Title: modalTitle,
      HtmlContent: modalMessage,
      HtmlContentStyles: modalMessageStyles,
    });
  } catch (err) {
    // Display modal failed
    console.error("Error displaying modal", err);
  }
}

}
