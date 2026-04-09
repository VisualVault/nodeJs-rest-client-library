/**
 * VV.Form.Global.FormatDateFields
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (date) {
/*
    Script Name:   FormatDateFields
    Customer:      WADNR
    Purpose:       The purpose of this process is to format the date entered in a text field to MM/YYYY

    Parameters:   date - date value entered in the text field

    Date of Dev:  02/04/2025 
    Revision Notes:
    02/04/2025 - Austin Stone: Script created.
    03/07/2025 - Moises Savelli: Return undefined for empty strings.
*/

let month = "";
let year = "";

if (typeof date !== "string" || date.length < 4 || date.length > 10) {
  return "Invalid Date"; // Invalid if too short or too long
}

if (VV.Form.Global.isNullEmptyUndefined(date)) {
  return undefined;
}

if (date.includes("/")) {
  let parts = date.split("/");

  if (parts.length < 2 || parts.length > 3) {
    return "Invalid Date"; // Invalid if not exactly 2 or 3 parts
  }

  // Extract month and year based on structure
  month = parts[0].length === 1 ? `0${parts[0]}` : parts[0]; // Ensure 2-digit month
  year = parts.length === 3 ? parts[2] : parts[1]; // Handles MM/YYYY and MM/DD/YYYY
} else {
  // Handling numeric-only dates (e.g., MMYYYY or MYYYY)
  if (date.length === 5) {
    month = `0${date.slice(0, 1)}`; // Single-digit month
    year = date.slice(1);
  } else if (date.length === 6) {
    month = date.slice(0, 2); // Two-digit month
    year = date.slice(2);
  } else {
    return "Invalid Date"; // Cases where format is ambiguous
  }
}

// Ensure numeric values and valid month/year range
if (!/^\d+$/.test(month) || !/^\d+$/.test(year)) {
  return date; // Ensure all numeric values
}

month = parseInt(month, 10);
year = parseInt(year, 10);

if (month >= 1 && month <= 12 && year >= 1000 && year <= 9999) {
  return `${month.toString().padStart(2, "0")}/${year}`;
} else {
  return "Invalid Date";
}

}
