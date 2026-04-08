/**
 * VV.Form.Global.FillAndRelateTransferRequest
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
const templateId = "fe65f91f-42e2-ef11-aa78-af9225d6a1b2";

const fieldMapping = [
    {
        sourceFieldName: "FPAN Number",
        sourceFieldValue: VV.Form.GetFieldValue('FPAN Number'),
        targetFieldName: "FPAN ID"
    },
    {
        sourceFieldName: "FPAN Number",
        sourceFieldValue: VV.Form.GetFieldValue('FPAN Number'),
        targetFieldName: "FPAN Number"
    },
    {
        sourceFieldName: "Form ID",
        sourceFieldValue: VV.Form.DhDocID,
        targetFieldName: "Related Record ID"
    }
]

VV.Form.DoAjaxFormSave().then(() => {
    VV.Form.Global.FillinAndRelateForm(templateId, fieldMapping);
});

}
