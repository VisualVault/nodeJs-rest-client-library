/**
 * VV.Form.Global.FillAndRelateLTA5Day
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
const templateId = "c0b92b5e-c0fa-ef11-aa7f-874c1b64b9a4";

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
