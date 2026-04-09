/**
 * VV.Form.Global.CentralTimeValidation
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (PassedControlValue) {
//Pass in value of PassedControlValue
if (typeof VV.Form.Global.EmailReg === 'undefined') {
  VV.Form.Global.SetupReg();
}

return VV.Form.Global.TimeReg.test(PassedControlValue); // true or false
}
