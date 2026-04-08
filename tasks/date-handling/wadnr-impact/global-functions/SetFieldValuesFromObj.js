/**
 * VV.Form.Global.SetFieldValuesFromObj
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (fieldObj, evaluateGroupConditions, triggerEvents) {
/*
    Script Name:   SetFieldValuesFromObj
    Customer:      PAELS
    Purpose:       The purpose of this script is to populate fields on a form from a passed in Object in a way that the case of the field names in the Object does not matter (matching behavior server side of postFormRevision & postForms). SetFieldValue is case sensitive as IE11 does not support the Case-insensitive CSS attribute selectors (https://caniuse.com/#feat=css-case-insensitive). This script will perform a case insensitive search of the field names in the passed in object against the field names on the form and ensure that the correct case is then passed to SetFieldValue.

    Parameters:    fieldObj (Object, required) - Object of Key Value pairs, the same format used server side for postFormRevision and postForms.
                   evaluateGroupConditions (Boolean) - Option to trigger groups and conditions on the set fields. Defaults to true.
                   triggerEvents (Boolean) - Option to trigger events on the set fields. Defaults to true.
    
    Return Value:  A Promise that resolves into an array after all fields have been set (similar to VV.Form.SetFieldValue). The array contains any fields that were not found on the form but were in the passed in fieldObj.

    Date of Dev:   7/2/2020
    Last Rev Date: 5/31/2023
    Revision Notes:
    7/2/2020  - Rocky: Script created.
    8/24/2020 - Rocky: If null or undefined set as empty string
    5/31/2023 - John: Update script to return promise and take in additional SetFieldValue params
*/

// Checks required params are set and optional params are set to default. Throws error if required params missing.
checkForParameters();

// Array to hold form field names.
let formFields = [];
// Array to hold any form fields that were not found. This is returned at the end of the process.
let fieldsNotFound = [];

/* In the form HTML a type tag corresponds to the following:
    1 - Textbox
    3 - Multi-line Textbox
    4 - Checkbox
    5 - Dropdown
    10 - Signature
    13 - Date
    14 - Cell Field (number)
*/

// Push the field name on the form into an array if it matches one of the specified types.
$(
  '[vvfftype="1"], [vvfftype="3"], [vvfftype="4"], [vvfftype="5"], [vvfftype="10"], [vvfftype="13"], [vvfftype="14"]',
).each(function (i, elem) {
  formFields.push($(this).attr("vvfieldnamewrapper"));
});

// Performs a case insensitive search using passed in fieldName against the field names in formFields array. If a match is found it returns the field name matching the case on the form.
function caseInsensitiveFieldNameSearch(fieldName) {
  let searchResult = "";

  // Measure length so it isn't recalculated each loop.
  let formFieldsLength = formFields.length;

  // Search through field array as soon as a match is found break the loop.
  for (let i = 0; i < formFieldsLength; i++) {
    if (formFields[i].toLowerCase() === fieldName.toLowerCase()) {
      searchResult = formFields[i];
      break;
    }
  }

  // If field could not be found push the name into the fieldsNotFound array.
  if (!searchResult) {
    fieldsNotFound.push(fieldName);
  }

  return searchResult;
}

// Iterate through Object. Each key represents a field and the value is what the field will be set to.
let setFieldValueArr = [];
for (let key in fieldObj) {
  if (fieldObj.hasOwnProperty(key)) {
    let searchResult = caseInsensitiveFieldNameSearch(key);
    let valueToSet = fieldObj[key];

    if (valueToSet === null || valueToSet === undefined) {
      valueToSet = "";
    }

    // Only run SetFieldValue if a field was found.
    if (searchResult) {
      setFieldValueArr.push(
        VV.Form.SetFieldValue(
          searchResult,
          valueToSet,
          evaluateGroupConditions,
          triggerEvents,
        ),
      );
    }
  }
}

function checkForParameters() {
  let errorLog = [];
  if (fieldObj == null || Object.keys(fieldObj).length < 1) {
    errorLog.push(
      "A field object was not passed in, this is a required parameter.",
    );
  }
  if (evaluateGroupConditions == null) {
    evaluateGroupConditions = true;
  }
  if (triggerEvents == null) {
    triggerEvents = true;
  }

  if (errorLog.length > 0) {
    const errorTitle = "Missing Required Parameters";
    VV.Form.Global.DisplayModal({
      Title: errorTitle,
      Icon: "error",
      HtmlContent: errorLog.join("<br>"),
    });

    throw new Error(`${errorTitle}\n${errorLog.join("\n")}`);
  }
}

return Promise.all(setFieldValueArr).then(() => {
  // Return array of any fields that were not found.
  return fieldsNotFound;
});

}
