/**
 * VV.Form.Global.GetFormData
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (FieldNames) {
// GetFormData for Global - Builds an array of form field objects for use in microservices (getFieldValueByName) based on passed in field names (FieldNames) or returns the entire form data collection if no array is passed in.
let formData = [];
if (Array.isArray(FieldNames)) {
    FieldNames.forEach((fieldName) => {
        let field = {};
        field.name = fieldName;
        field.value = VV.Form.GetFieldValue(fieldName);
        formData.push(field);
    });
} else {
    formData = VV.Form.getFormDataCollection();
}

return formData;
}
