/**
 * VV.Form.Global.RadioButtons
 * Parameters: 1
 * Extracted: 2026-04-09
 */
function (UnSelectedArray) {
UnSelectedArray.map(function (field) {
  VV.Form.SetFieldValue(field, "false");
});
}
