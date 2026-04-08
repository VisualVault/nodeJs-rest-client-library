/**
 * VV.Form.Global.HyphenatedToProperCase
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (fieldName) {
// Get the current field value from the specified field.
const fieldValue = VV.Form.GetFieldValue(fieldName);

// Create a function to capitalize a word while preserving hyphens.
function properCaseWord(word) {
  return word
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-');
}

// Split the trimmed field value into words, including hyphens.
const words = fieldValue.split(/\s+/);

// Capitalize and trim each word in the value.
const properCaseWords = words.map(properCaseWord);

// Join the proper case words back together with spaces.
const properFieldValue = properCaseWords.join(" ");

// Check if the new value is different from the current value.
if (fieldValue !== properFieldValue) {
  // Set the field value to the proper case value.
  VV.Form.SetFieldValue(fieldName, properFieldValue.trim());
}

}
