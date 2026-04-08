/**
 * VV.Form.Global.DatagridClearSelected
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (datagridName) {
// DatagridClearSelected
// datagridName is a string that is the name of the datagrid to setup selectable rows for.

$(`[vvfieldnamewrapper="${datagridName}"] .selected`).removeClass('selected')

if ($(`[vvfieldnamewrapper="${datagridName}"] .selected`).length > 0) {
  VV.Form.SetFieldValue(`${datagridName} Selected`, 'True')
} else {
  VV.Form.SetFieldValue(`${datagridName} Selected`, 'False')
}
}
