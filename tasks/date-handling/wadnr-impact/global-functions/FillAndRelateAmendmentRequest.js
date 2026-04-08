/**
 * VV.Form.Global.FillAndRelateAmendmentRequest
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
const templateId = '8253eba1-25f9-ef11-aa7f-874c1b64b9a4';

const fieldMapping = [
  {
    sourceFieldName: 'FPAN Number',
    sourceFieldValue: VV.Form.GetFieldValue('FPAN Number'),
    targetFieldName: 'FPAN ID',
  },
  {
    sourceFieldName: 'FPAN Number',
    sourceFieldValue: VV.Form.GetFieldValue('FPAN Number'),
    targetFieldName: 'FPAN Number',
  },
  {
    sourceFieldName: 'Form ID',
    sourceFieldValue: VV.Form.DhDocID,
    targetFieldName: 'Related Record ID',
  },
  {
    sourceFieldNAme: 'Region',
    sourceFieldValue: VV.Form.GetFieldValue('Region'),
    targetFieldName: 'Region',
  },
  {
    sourceFieldNAme: 'Project Name',
    sourceFieldValue: VV.Form.GetFieldValue('Project Name'),
    targetFieldName: 'Project Name',
  },

  // ========================= 1a Landowner =========================

  {
    sourceFieldNAme: 'Landowner Business Or Individual',
    sourceFieldValue: VV.Form.GetFieldValue('Landowner Business Or Individual'),
    targetFieldName: 'Landowner Business Or Individual',
  },
  {
    sourceFieldNAme: 'DG Landowner Businesses',
    sourceFieldValue: VV.Form.GetFieldValue('DG Landowner Businesses'),
    targetFieldName: 'DG Landowner Businesses',
  },
  {
    sourceFieldNAme: 'DG Landowners',
    sourceFieldValue: VV.Form.GetFieldValue('DG Landowners'),
    targetFieldName: 'DG Landowners',
  },

  // ========================= 1b Timber Owner =========================

  {
    sourceFieldNAme: 'Timber Owner Business Or Individual',
    sourceFieldValue: VV.Form.GetFieldValue(
      'Timber Owner Business Or Individual'
    ),
    targetFieldName: 'Timber Owner Business Or Individual',
  },
  {
    sourceFieldNAme: 'DG Timber Owner Businesses',
    sourceFieldValue: VV.Form.GetFieldValue('DG Timber Owner Businesses'),
    targetFieldName: 'DG Timber Owner Businesses',
  },
  {
    sourceFieldNAme: 'DG Timber Owners',
    sourceFieldValue: VV.Form.GetFieldValue('DG Timber Owners'),
    targetFieldName: 'DG Timber Owners',
  },

  // ========================= 1c Operator =========================

  {
    sourceFieldNAme: 'Operator Business Or Individual',
    sourceFieldValue: VV.Form.GetFieldValue('Operator Business Or Individual'),
    targetFieldName: 'Operator Business Or Individual',
  },
  {
    sourceFieldNAme: 'DG Operator Businesses',
    sourceFieldValue: VV.Form.GetFieldValue('DG Operator Businesses'),
    targetFieldName: 'DG Operator Businesses',
  },
  {
    sourceFieldNAme: 'DG Operators',
    sourceFieldValue: VV.Form.GetFieldValue('DG Operators'),
    targetFieldName: 'DG Operators',
  },
];

VV.Form.DoAjaxFormSave().then(() => {
  VV.Form.Global.FillinAndRelateForm(templateId, fieldMapping);
});

}
