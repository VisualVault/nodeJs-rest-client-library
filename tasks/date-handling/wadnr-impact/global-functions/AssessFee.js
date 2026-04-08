/**
 * VV.Form.Global.AssessFee
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
// AssessFee - A generic fill-in and relate to the Fee form, used across different form templates (FPAN, Step 1, Renewal, etc.)

//Template GUID goes here
var templateId = 'ae4c1ec5-3201-f011-aa80-d9a3142b916a';

//Field mappings
var fieldMappings = [
    {
        sourceFieldName: "Related Record ID",
        sourceFieldValue: VV.Form.DhDocID,
        targetFieldName: "Related Record ID",
    },
    {
        sourceFieldName: "Related Record GUID",
        sourceFieldValue: VV.Form.DataID,
        targetFieldName: "Related Record GUID",
    },
    {
        sourceFieldName: "Individual ID",
        sourceFieldValue: VV.Form.GetFieldValue("Individual ID"),
        targetFieldName: "Individual ID",
    }
];

//Call the fill in global script
VV.Form.Global.FillinAndRelateForm(templateId, fieldMappings);
}
