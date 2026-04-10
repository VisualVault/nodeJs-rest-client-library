/**
 * VV.Form.Global.AddRecordLogic
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (fillInRelateOptions) {
/*
    Script Name:   AddRecordLogic
    Customer:      PAELS
    Purpose:       The purpose of this process is to have central logic that can be used to fillin and relate a sub record to the Child Record.

    Parameters:   fillInRelateOptions - Object with the following properties: 
                   formGUID (Required, GUID) - Form that will be used for fillin and relate.
                   confirmTitle (Required, String) - Confirmation title displayed to end user before action is performed.
	                 confirmMsg (Required, String) - Confirmation message displayed to end user before action is performed.
                   fieldArr (Required, String) - Array of objects to populate for the fillin and relate global function.
                   validationParam (Required, String) - Parameter to pass into FormValidation that will be ran.
                   asyncFuncBeforeFillIn (Function) - A Promise-returning function that can do anything before the Fill-in and relate step, such as duplicate checks and form saves. Default behavior is only to save before Fill-in.

    Date of Dev:   
    Last Rev Date: 2/17/2023
    Revision Notes:
    2/17/2023  - Rocky: Script created.
    4/10/2023  - John: Add asyncFuncBeforeFillIn parameter
    4/24/2023  - Rocky: Allow no validation params so all validation is checked.
*/

let errorLog = [];
let asyncFuncBeforeFillIn;

// Check if parameters were passed in.
if (!fillInRelateOptions.hasOwnProperty("formGUID")) {
  errorLog.push(
    "A form GUID was not passed in, this is required to do a fillin and relate."
  );
}
if (!fillInRelateOptions.hasOwnProperty("confirmTitle")) {
  errorLog.push(
    "A confirmation title was not pass in, this is a required parameter."
  );
}
if (!fillInRelateOptions.hasOwnProperty("confirmMsg")) {
  errorLog.push(
    "A confirmation message was not pass in, this is a required parameter."
  );
}
if (!fillInRelateOptions.hasOwnProperty("fieldArr")) {
  errorLog.push(
    "An array of fields was not passed in, this is a required parameter."
  );
}
if (fillInRelateOptions.hasOwnProperty("asyncFuncBeforeFillIn") === true) {
  asyncFuncBeforeFillIn = fillInRelateOptions.asyncFuncBeforeFillIn;
} else {
  // do a form save by default
  asyncFuncBeforeFillIn = () => {
    return VV.Form.UnsavedChanges > 0
      ? VV.Form.DoAjaxFormSave()
      : Promise.resolve();
  };
}

// Display any errors to the user.
if (errorLog.length) {
  let errors = errorLog.join("<br>");
  VV.Form.Global.DisplayModal({
    Icon: "error",
    Title: "Missing Required Parameters",
    HtmlContent: errors,
  });
} else {
  //Confirmation message variables
  let messageData = fillInRelateOptions.confirmMsg;
  let title = fillInRelateOptions.confirmTitle;
  let formGUID = fillInRelateOptions.formGUID;
  let fieldArr = fillInRelateOptions.fieldArr;
  let validationParam = fillInRelateOptions.hasOwnProperty("validationParam") ? fillInRelateOptions.validationParam : null;
  //Measuring the form validation
  if (VV.Form.Template.FormValidation(validationParam) === true) {
    //Confirmation function
    function okFunction() {
      //Call the fill in global script
      asyncFuncBeforeFillIn().then((resp) => {
        VV.Form.Global.FillinAndRelateForm(formGUID, fieldArr);
      });
    }

    VV.Form.Global.DisplayModal({
      Icon: "question",
      Title: title,
      HtmlContent: messageData,
      okFunction: okFunction,
    });
  } else {
    VV.Form.Global.ValidationModal();
  }
}

}
