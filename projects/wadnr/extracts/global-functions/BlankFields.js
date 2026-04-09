/**
 * VV.Form.Global.BlankFields
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (arrayOfNameFields, executeEvaluateGroupConditions, executeOnChange) {
/*
Script Name:    BlankFields
Customer:       VisualVault
Purpose:        This function takes in a list of fields to unset their values and remove their validation error messages if any.

Parameters:     The following represent variables passed into the function:
                - arrayOfNameFields: (Array) Field names to unset.
                - executeEvaluateGroupConditions: (Boolean) Whether to execute the EvaluateGroupConditions function.
                - executeOnChange: (Boolean) Whether to execute the onChange event attached to the value set.

Return Value:   The following represents the value being returned from this function:
                - (Promise<void>) Returns a solved promise after unsetting each field.

Date of Dev:    12/07/2018
Last Rev Date:  12/24/2025

Revision Notes:
                12/07/2018 - Jason Hatch: Initial creation of the business process. 
                10/10/2019 - Jason Hatch: Add header.
                05/13/2024 - Valkiria Salerno: Logic to handle format date: "YYYY-MM-DD".
                02/26/2025 - Federico Cuelho: Update to set all control types to its default value.
                02/28/2025 - Federico Cuelho: Update handle dropdowns differently to avoid setting a new blank value.
                12/24/2025 - Federico Cuelho: Added parameters to control EvaluateGroupConditions and onChange executions.
*/

const setFieldValuePromises = [];
const clearValidationErrorOnFieldPromises = [];

function getFieldControlType(controlName) {
    const elements = document.querySelectorAll(`[vvfieldname="${controlName}"]`);

    if (elements.length > 0) {
        let control = elements[0];

        if (control.tagName === "IMG" || control.getAttribute("vvfieldtype") === "calendar") {
            control = document.querySelector(`[vvfieldnamewrapper="${controlName}"]`);
        }

        if (control.getAttribute('app-image') !== null) {
            return "image";
        }
        if (control.getAttribute("app-calendar") !== null) {
            return "calendar";
        }

        const fieldType = control.getAttribute("vvfieldtype");
        if (fieldType) {
            return fieldType.toLowerCase();
        }

        return "unknown";
    }

    return null;
}

// Loop through fields and determine correct reset value based on control type
for (let i = 0; i < arrayOfNameFields.length; i++) {
    if (typeof arrayOfNameFields[i] === 'string') {
        const fieldName = arrayOfNameFields[i];
        const controlType = getFieldControlType(fieldName);

        let resetValue = null; // Default for most fields

        if (controlType === "dropdownlist") {
            resetValue = "Select Item"; // Special case for dropdowns
        }

        setFieldValuePromises.push(VV.Form.SetFieldValue(fieldName, resetValue, executeEvaluateGroupConditions, executeOnChange));
    }
}

// Handle clearing validation errors after setting values
return Promise.all(setFieldValuePromises).then(() => {
    for (let i = 0; i < arrayOfNameFields.length; i++) {
        if (typeof arrayOfNameFields[i] === 'string') {
            VV.Form.ClearValidationErrorOnField(arrayOfNameFields[i]);
        }
    }
});
}
