/**
 * VV.Form.Global.ValidationModal
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (ControlName) {
// ValidationLoadModal Global Script

/*
    Script Name:   ValidationLoadModal
    Customer:      PAELS
    Purpose:       The purpose of this script is to load a modal with field names and error messages from fields that have a validation error. This is done by detecting the visible error image flag that is show by a field (even if a container is hidden). This script will also generate a link, if possible, to call a function that will take the user directly to the field with the error.
    **** This script should be called after validation has been run that returned false (had errors). ****
    Parameters:    Pass in the control.value from a button click when calling this script. This is used to generate an error message.
    Date of Dev:   
    Last Rev Date: 05/09/2024
    Revision Notes: Added btnSearch Modal Instructions
    02/15/2023  - Brian Davis: Script created.
    05/08/2024  - Moises Savelli: Document product version.
    05/09/2024  - Fernando Culell: Add the display of an error message for the case when no fields were found with validation error flags.
*/

// Fancy Modal Variables
var controlName = ControlName;
var htmlContent = "";

var title = "Form Validation Errors";

// Instructions displayed at top of modal.

var modalInstructions =
  '<p class="validationusermessage">Please examine the list of fields with errors that have occurred. The description by each field outlines the error that was encountered. Navigate to the field, make the appropriate correction, and then try again.</p>';

// If Button name is passed in show these instructions. Add additional as needed here.
if (controlName == "btnSave") {
  modalInstructions =
    '<p class="validationusermessage">Please examine the list of fields with errors that have occurred. The description by each field outlines the error that was encountered. Navigate to the field, make the appropriate correction, and then try clicking the Save and Confirm button again.</p>';
} else if (controlName == "btnSubmit") {
  modalInstructions =
    '<p class="validationusermessage">Please examine the list of fields with errors that have occurred. The description by each field outlines the error that was encountered. Navigate to the field, make the appropriate correction, and then try clicking the Submit button again.</p>';
} else if (controlName == "btnSearch") {
  modalInstructions =
    '<p class="validationusermessage">Please examine the list of search fields with errors that have occurred. The description by each search field outlines the error that was encountered. Navigate to the field, make the appropriate correction, and then try clicking the Search button again.</p>';
}

// If this script was called but no fields were found with validation errors this message will be shown.
var noValidationErrorsFound =
  "Form Validation was performed and reported an error. However no specific field was found with an error displayed. Please try again or contact a system administrator if the problem continues.";

// Store fields found to have validation errors.
var formFields = [];

/* In the form HTML a type tag corresponds to the following:
   1 - Textbox
   3 - Multi-line Textbox
   4 - Checkbox
   5 - Dropdown
   10 - Signature
   13 - Date
   14 - Cell Field (number)
*/

// looks for aliases to the field names that will display in the modal
var aliases = null;
if (VV.Form.Template.DisplayValidationModalFieldAliases) {
  aliases = VV.Form.Template.DisplayValidationModalFieldAliases(); //This script will be created as needed per form template. It does not exist as a global.
}

// Find all fields that have been flagged with a validation error. Get the field name and error message.
$(
  '[vvfftype="1"], [vvfftype="3"], [vvfftype="4"], [vvfftype="5"], [vvfftype="10"], [vvfftype="13"], [vvfftype="14"]'
).each(function (i, elem) {
  if (
    $(this).find('[vvimage="validation"]').attr("style") ===
    "display: inline-block;"
  ) {
    var error = $(this)
      .find('[vvimage="validation"]')
      .children()
      .eq(0)
      .attr("title");
    var field = $(this).attr("vvfieldnamewrapper");
    if (error && field) {
      var displayName = null;
      if (aliases && aliases[field]) {
        displayName = aliases[field];
      } else {
        displayName = field;
      }
      formFields.push({
        fieldName: field,
        errorMessage: error,
        fieldDisplayName: displayName,
      });
    }
  }
});

//On May 7, 2024, the function stopped working because "var error" was not finding the message in the DOM. The product proposed this version, but it was ultimately not necessary to implement it.

/*
$('[vvfftype="1"], [vvfftype="3"], [vvfftype="4"], [vvfftype="5"], [vvfftype="10"], [vvfftype="13"], [vvfftype="14"]').each(function (i, elem) {
  if ($(this).find('[vvimage="validation"]').attr("style") === "display: inline-block;") {
    var error = $(this).find('[vvimage="validation"]').children().eq(0).attr("title");
    var field = $(this).attr("vvfieldnamewrapper");
    if (error && field) {
      var displayName = null;
        displayName = field;
      console.log(error)
    }
  }
});
*/

// If this script was called but no fields were found with validation errors display a message to the user.
if (formFields.length === 0) {
  VV.Form.HideLoadingPanel();
  VV.Form.Global.DisplayModal({
    Icon: "error",
    Title: "Form Validation Errors Found",
    HtmlContent: noValidationErrorsFound,
});
  // TAB LOGIC - Check if tabs are visible on page and relationships are mapped. Check if function exists before calling it.
} else if (
  $(".styleTabButtons").length > 0 &&
  $(".styleTabButtons").prop("style")["display"] !== "none" &&
  typeof VV.Form.Template.TabToFieldRelationships === "function"
) {
  // Modal instructions
  $(modalInstructions).appendTo("#validationmessagearea");
  htmlContent += modalInstructions;
  var generatedCodeObj = {
    "Not Mapped": [],
    "Not In": [],
  };
  var tabToFieldRelationshipsObj = {};
  // Get tab to relationship object from function setup on form.
  tabToFieldRelationshipsObj = VV.Form.Template.TabToFieldRelationships();
  // Get tab buttons on form to set in the same order so the order is maintained when displaying the modal.
  $(".styleTabButtons > div").each(function (i, elem) {
    generatedCodeObj[$(this).children(":first").val()] = [];
  });
  // Helper function that takes an object of a fieldName and errorMessage and generates HTML to display in modal.
  function findFieldInObj(fieldObj) {
    var fieldFound = false;

    for (var key in tabToFieldRelationshipsObj) {
      // Find if a field name has a relationship to a tab.
      if (tabToFieldRelationshipsObj.hasOwnProperty(key)) {
        fieldFound = tabToFieldRelationshipsObj[key].some(function (elem) {
          return elem.toLowerCase() === fieldObj["fieldName"].toLowerCase();
        });
        if (fieldFound) {
          // Make sure an array exists to push into.
          if (!Array.isArray(generatedCodeObj[key])) {
            generatedCodeObj[key] = [];
          }
          // Tab relationship was found to field, generated HTML.
          generatedCodeObj[key].push(
            "<b>" +
              fieldObj["fieldDisplayName"] +
              '</b>: <a href="javascript:void(0)" onclick="VV.Form.Global.ValidationModalGoToField(' +
              "'" +
              fieldObj["fieldName"] +
              "'" +
              ')">' +
              fieldObj["errorMessage"] +
              "</a><br>"
          );
          break;
        }
      }
    }
    if (!fieldFound) {
      // If a field isn't being displayed and a tab relationship wasn't found it can't be navigated to automatically. Generate HTML with no link.
      if (
        $('[VVFieldName="' + fieldObj["fieldName"] + '"]')
          .parent()
          .parent()
          .prop("style")["display"] === "none"
      ) {
        generatedCodeObj["Not Mapped"].push(
          "<b>" +
            fieldObj["fieldDisplayName"] +
            "</b>: " +
            fieldObj["errorMessage"] +
            "<br>"
        );
      } else {
        generatedCodeObj["Not In"].push(
          "<b>" +
            fieldObj["fieldDisplayName"] +
            '</b>: <a href="javascript:void(0)" onclick="VV.Form.Global.ValidationModalGoToField(' +
            "'" +
            fieldObj["fieldName"] +
            "'" +
            ')">' +
            fieldObj["errorMessage"] +
            "</a><br>"
        );
      }
    }
  }
  // Call function for each field with a validation error.
  formFields.forEach(function (elem) {
    findFieldInObj(elem);
  });
  // Take object of that has keys that match Tab name and a value that is an Array of HTML code for each field and join and populate the modal.
  for (var key in generatedCodeObj) {
    if (generatedCodeObj.hasOwnProperty(key)) {
      if (
        Array.isArray(generatedCodeObj[key]) &&
        generatedCodeObj[key].length > 0
      ) {
        if (key === "Not Mapped") {
          $(
            '<hr style="width:40%;margin-top:0;margin-bottom:5px">' +
              generatedCodeObj[key].join("") +
              "<br>"
          ).appendTo("#validationbuttonArea");

          htmlContent +=
            '<hr style="width:40%;margin-top:0;margin-bottom:5px">' +
            generatedCodeObj[key].join("") +
            "<br>";
        } else {
          $(
            "<h4>" +
              key +
              ' Tab</h4><hr style="width:40%;margin-top:0;margin-bottom:5px">' +
              generatedCodeObj[key].join("") +
              "<br>"
          ).appendTo("#validationbuttonArea");

          htmlContent +=
            "<h4>" +
            key +
            ' Tab</h4><hr style="width:40%;margin-top:0;margin-bottom:5px">' +
            generatedCodeObj[key].join("") +
            "<br>";
        }
      }
    }
  }
  // Build ModalObject
  let modalObject = {
    ControlName: "FormField",
    ModalType: "info",
    Icon: "error",
    Title: "Form Validation Errors Found",
    HtmlContent: htmlContent,
    Width: "64rem",
  };
  //Fire the modal.
  VV.Form.Global.DisplayModal(modalObject);
} else {
  //No Tabs Logic
  // Modal instructions
  $(modalInstructions).appendTo("#validationmessagearea");
  htmlContent += modalInstructions;
  // Iterate through returned LES Child Assignment data to populate modal.
  formFields.forEach(function (fieldObj) {
    $(
      "<b>" +
        fieldObj["fieldDisplayName"] +
        '</b>: <a href="javascript:void(0)" onclick="VV.Form.Global.ValidationModalGoToField(' +
        "'" +
        fieldObj["fieldName"] +
        "'" +
        ')">' +
        fieldObj["errorMessage"] +
        "</a><br>"
    ).appendTo("#validationbuttonArea");
    htmlContent +=
      "<b>" +
      fieldObj["fieldDisplayName"] +
      '</b>: <a href="javascript:void(0)" onclick="VV.Form.Global.ValidationModalGoToField(' +
      "'" +
      fieldObj["fieldName"] +
      "'" +
      ')">' +
      fieldObj["errorMessage"] +
      "</a><br>";
  });
  $(document).ready(function () {
    // Build ModalObject
    let modalObject = {
      ControlName: "FormField",
      ModalType: "info",
      Icon: "error",
      Title: "Form Validation Errors Found",
      HtmlContent: htmlContent,
      Width: "64rem",
    };
    //Fire the modal.
    VV.Form.Global.DisplayModal(modalObject);
  });
}

}
