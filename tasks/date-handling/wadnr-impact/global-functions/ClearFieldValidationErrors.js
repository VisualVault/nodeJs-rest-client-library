/**
 * VV.Form.Global.ClearFieldValidationErrors
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (arrayOfNameFields) {
/*
Script Name:    ClearFieldValidationErrors
Customer:       VisualVault
Purpose:        This function takes in a list of fields to remove their validation error messages if any.

Parameters:     The following represent variables passed into the function:
                - arrayOfNameFields: (Array) Field names to unset.

Return Value:   None.

Date of Dev:    01/27/2026
Last Rev Date:  01/27/2026

Revision Notes:
                01/27/2026 - Federico Cuelho: Initial creation of the business process.
*/
for (let i = 0; i < arrayOfNameFields.length; i++) {
  VV.Form.ClearValidationErrorOnField(arrayOfNameFields[i]);
}
/*
Example usage:
const fieldNames = ["Field 1", "Field 2", "Field 3"]

VV.Form.Global.ClearFieldValidationErrors(fieldNames);
*/
}
