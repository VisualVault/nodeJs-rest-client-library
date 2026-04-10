/**
 * VV.Form.Global.SetProperCaseFieldValue
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (fieldName) {
// Get the current field value from the specified field.
const fieldValue = VV.Form.GetFieldValue(fieldName);

// Trim the field value to remove leading and trailing spaces.
const trimmedFieldValue = fieldValue.trim();

// Split the trimmed field value into words.
const words = trimmedFieldValue.split(/\s+/);

// Capitalize and trim each word in the value.
const properCaseWords = words.map((word) => {
  // Capitalize the first letter and convert the rest to lowercase.
  const properCaseValue = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  return properCaseValue;
});

// Join the proper case words back together.
const properFieldValue = properCaseWords.join(" ");

// Check if the new value is different from the current value.
if (fieldValue !== properFieldValue) {
  // Set the field value to the proper case value.
  VV.Form.SetFieldValue(fieldName, properFieldValue.trim());
}

}
