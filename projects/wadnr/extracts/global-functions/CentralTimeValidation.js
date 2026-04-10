/**
 * VV.Form.Global.CentralTimeValidation
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (PassedControlValue) {
//Pass in value of PassedControlValue
if (typeof VV.Form.Global.EmailReg === 'undefined') {
  VV.Form.Global.SetupReg();
}

return VV.Form.Global.TimeReg.test(PassedControlValue); // true or false
}
