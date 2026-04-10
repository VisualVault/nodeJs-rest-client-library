/**
 * VV.Form.Global.ClearFields
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (fieldNames) {
// Example usage: clearFields(["Field 1", "Field 2", "Field 3"]);
for (const fieldName of fieldNames) {
  VV.Form.SetFieldValue(fieldName, "");

  // Check if the field is a dropdown list based on its attributes
  const fieldElement = document.querySelector(`[vvfieldname="${fieldName}"]`);
  const isDropdown = fieldElement && fieldElement.getAttribute("vvfieldtype") === "dropdownlist";

  if (isDropdown) {
    VV.Form.RefreshDropDownListControl(fieldName);
  }
}

}
