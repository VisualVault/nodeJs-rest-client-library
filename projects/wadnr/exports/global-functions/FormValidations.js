/**
 * VV.Form.Global.FormValidations
 * Parameters: 4
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (FieldName, ValidationType, NumberCondition, NumberConditionValue) {
/*
  Script Name:  FormValidations
  Customer:     WADNR
  Purpose:      Validates fields in a form within the platform.
  
  Parameters:   
                - FieldName (String, Required) - The name of the field.
                - ValidationType (String, Required) - The type of validation to perform.
                    * Possible Values: TextBox, DdSelect, NumberOnly
                - NumberCondition (String, Optional) - Condition to apply for NumberOnly validation.
                    * Possible Values: GreaterThanEqualTo, LessThanEqualTo, EqualTo, etc.
                - NumberConditionValue (Number/String, Optional) - The value to compare against.

  Example usage: 
                VV.Form.Global.FormValidations('First Name', 'TextBox')
                VV.Form.Global.FormValidations('Country', 'DdSelect')
                VV.Form.Global.FormValidations('Score', 'NumberOnly')
                VV.Form.Global.FormValidations('Age', 'NumberOnly', 'GreaterThanEqualTo', 18)

  Return Value: Boolean

  Date of Dev:
                1/29/2025
  Last Rev Date: 
                1/29/2025
  Revision Notes:
                1/29/2025 - Fernando Chamorro: Script created and optimized.
*/

// Validate required parameters
if (typeof FieldName !== "string" || FieldName.trim() === "") {
  throw new Error("FieldName must be a non-empty string.");
}

if (typeof ValidationType !== "string" || ValidationType.trim() === "") {
  throw new Error("ValidationType must be a non-empty string.");
}

// If the field is read-only, do not validate it
if (VV.Form.IsFieldReadOnly(FieldName)) {
  return false;
}

// Get the current field value and trim any whitespace
let currentValue = VV.Form.GetFieldValue(FieldName).trim();

// If the validation type is "NumberOnly", remove commas before validation
if (ValidationType === "NumberOnly") {
  currentValue = currentValue.replace(/,/g, "").trim();
}

// Generic function to validate fields based on a validation key
function validateField(validationKey, errorMessage) {
  if (!VV.Form.Global.CentralValidation(currentValue, validationKey)) {
    VV.Form.SetValidationErrorMessageOnField(FieldName, errorMessage);
    return false;
  } else {
    VV.Form.ClearValidationErrorOnField(FieldName);
    return true;
  }
}

// Function to validate numbers with optional conditions (e.g., >= 18, <= 100)
function validateNumberWithCondition() {
  if (currentValue !== "") {
    if (
      VV.Form.Global.CentralValidation(currentValue, "NumberOnly") == false ||
      (NumberCondition &&
        NumberConditionValue !== null &&
        VV.Form.Global.CentralNumericValidation(
          currentValue,
          NumberConditionValue.toString(),
          NumberCondition
        ) == true)
    ) {
      VV.Form.SetValidationErrorMessageOnField(
        FieldName,
        `A whole number ${
          NumberCondition
            ? NumberCondition.replace(/([A-Z])/g, " $1").toLowerCase() +
              " " +
              NumberConditionValue
            : "greater than 0"
        } must be entered for ${FieldName}.`
      );
      return false;
    } else {
      VV.Form.ClearValidationErrorOnField(FieldName);
      return true;
    }
  } else {
    VV.Form.ClearValidationErrorOnField(FieldName);
    return true;
  }
}

// Mapping validation types to their respective functions
const validators = {
  TextBox: () =>
    validateField("Blank", `Please complete the ${FieldName} field.`),
  DdSelect: () =>
    validateField(
      "DDSelect",
      `Please make a selection from the ${FieldName} dropdown.`
    ),
  NumberOnly: () => validateNumberWithCondition(),
};

// Execute the appropriate validation function based on the provided validation type
if (validators[ValidationType]) {
  return validators[ValidationType]();
} else {
  throw new Error(`Invalid ValidationType: "${ValidationType}".`);
}
}
