/**
 * VV.Form.Global.ValidateCheckboxFields
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (CheckboxFields, ControlName, RunAll) {
/**
 * Validates a group of checkbox fields to ensure at least one is selected.
 * If all checkboxes are unchecked ("false"), it sets validation error messages;
 * otherwise, it clears any existing errors.
 *
 * @param {string[]} CheckboxFields - Array of field names representing the checkbox controls to validate.
 * @param {string|null} ControlName - The name of the field that triggered the validation, or null if running validation for all fields.
 * @param {boolean} RunAll - Indicates whether to run the validation for all fields regardless of ControlName.
 * @returns {boolean} - Returns `true` if validation passes, `false` if all checkboxes are unchecked.
 */

let ErrorReporting = true;

const blankFields = CheckboxFields.filter(
  (field) => VV.Form.GetFieldValue(field).toLowerCase() === "false"
);

const allBlank = blankFields.length === CheckboxFields.length;
const isTriggered = CheckboxFields.includes(ControlName) || RunAll;

const clearErrors = () => {
  CheckboxFields.forEach((field) => {
    VV.Form.ClearValidationErrorOnField(field);
  });
};

const setErrors = () => {
  CheckboxFields.forEach((field) => {
    VV.Form.SetValidationErrorMessageOnField(
      field,
      `Please make a selection from the ${field} checkbox.`
    );
  });
};

if (isTriggered && allBlank) {
  setErrors();
  ErrorReporting = false;
} else {
  clearErrors();
}

return ErrorReporting;

}
