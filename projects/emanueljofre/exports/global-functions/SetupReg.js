/**
 * VV.Form.Global.SetupReg
 * Parameters: 0
 * Extracted: 2026-04-09
 */
function () {
VV.Form.Global.PhoneReg = new RegExp(
  "^(\\s?)\\(([0-9]{3})\\)[ ]([0-9]{3})[-]([0-9]{4})(?:\\s*(?:#|x\\.?|ex\\.?|ext\\.?|extension)\\s*(\\d+))?$"
);
VV.Form.Global.EmailReg = new RegExp(
  /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
);
VV.Form.Global.URLReg = new RegExp(
  "^([\\da-z.-]+).([a-z.]{2,6})([/w .-]*)*/?$"
);
VV.Form.Global.BlankReg = new RegExp("\\w");
VV.Form.Global.ZipReg = new RegExp("^(\\s?)\\d{5}(-\\d{4})?$");
VV.Form.Global.DDSelectReg = new RegExp("^((?!Select).)*$");
VV.Form.Global.TimeReg = new RegExp(
  "^([0-9]|0[0-9]|1[0-9]):[0-5][0-9] ([AP][M])$"
);
VV.Form.Global.PartnerReg = new RegExp("\\bpartnership", "gi");
VV.Form.Global.CGASScore = new RegExp("\\s?[0-9]{3}");
VV.Form.Global.DoubleDigitCheck = new RegExp("\\s?[0-9]{2}");
VV.Form.Global.SSN = new RegExp("([0-9]{3})[-]([0-9]{2})[-]([0-9]{4})$");
VV.Form.Global.EIN = new RegExp("^([0-9]{2})[-]\\d{7}$");
VV.Form.Global.NPI = new RegExp("^\\d{10}$");
// Currency format must be '0.00' or '-0.00'
VV.Form.Global.Currency = new RegExp("^[0-9]*.[0-9]{2}$");
// Percent check. Value can be 0 - 100 including decimals.
VV.Form.Global.Percent = new RegExp(
  "^(100([.][0]{1,})?$|[0-9]{1,2}([.][0-9]{1,})?)$"
);
VV.Form.Global.NumberOnly = new RegExp(
  "^([0-9]{1,3}([0-9]{3},)*[0-9]{3}|[0-9]+)?$"
);
//First and Last Name RegExp
//To add additional characters to fail validation, add the special character or unicode between the two []
VV.Form.Global.NameReg = new RegExp(/[!@#$%^*+={}/|\\\[\]<>?~]|[\d]{2,}/g);
VV.Form.Global.NameNumberReg = new RegExp(/[\d]{1,}/g);
VV.Form.Global.MedicaidIDRecipient = new RegExp("^\\d{10}$");
VV.Form.Global.MedicaidIDProvider = new RegExp("^\\d{9}$");
}
