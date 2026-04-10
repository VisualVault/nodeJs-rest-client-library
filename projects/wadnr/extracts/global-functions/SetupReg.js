/**
 * VV.Form.Global.SetupReg
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
/*
    Script Name:   SetupReg
    Customer:      VisualVault
    Purpose:       The purpose of this function is to establish regular expressions that will be used as part of the validations.
                    
    Parameters:    The following represent variables passed into the function:  
                    No items passed in
                   
    Return Value:  The following represents the value being returned from this function:
                            
    Date of Dev:   
    Last Rev Date: 07/22/2020
    Revision Notes:
    06/01/2011 - Jason Hatch: Initial creation of the business process. 
    04/15/2019 - Maxwell Rehbein: NumberOnly created. 
    06/11/2020 - Michael Rainey: Add name validation RegExp
    07/22/2020 - Kendra Austin: Add 2 Medicaid ID RegExp 
    04/16/2021 - John Sevilla: Modify ZipReg to support Canadian Postal Codes
    10/14/2021 - Saesha Senger: Uncomment first PhoneReg to support phone numbers without extension.
    04/19/2022 - Jess Daniel: Updated EmailReg to regex used by VisualVault, provided by Tod 
*/

//This first PhoneReg is just for phones without extensions.  
VV.Form.Global.PhoneReg = new RegExp('^(\\s?)\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$');
//This PhoneReg is for phones that have extensions.  Format is XXX-XXX-XXXX.  Needs to be x, ext or extension with any number of digits when entering the extensions.
//VV.Form.Global.PhoneReg = new RegExp('^(\\s?)([0-9]{3})[-]([0-9]{3})[-]([0-9]{4})(?:\\s*(?:#|x\\.?|ex\\.?|ext\\.?|extension)\\s*(\\d+))?$');
//This PhoneReg is for phones that have extensions.  Format is (XXX) XXX-XXXX.  Needs to be x, ext or extension with any number of digits when entering the extensions.
//VV.Form.Global.PhoneReg = new RegExp('^(\\s?)\\(([0-9]{3})\\)[ ]([0-9]{3})[-]([0-9]{4})?$');  
//This PhoneReg is for phones that have extensions.  Format is (XXX) XXX-XXXX.  Needs to be x, ext or extension with any number of digits when entering the extensions.

//VV.Form.Global.PhoneReg = new RegExp('^(\\s?)\\(([0-9]{3})\\)[ ]([0-9]{3})[-]([0-9]{4})(?:\\s*(?:#|x\\.?|ex\\.?|ext\\.?|extension)\\s*(\\d+))?$');
//VV.Form.Global.PhoneReg = new RegExp('^(\\s?)\\(([0-9]{3})\\)[ ]([2-9]{1})([0-9]{2})[-]([0-9]{4})(?:\\s*(?:#|x\\.?|ex\\.?|ext\\.?|extension)\\s*(\\d+))?$')
VV.Form.Global.EmailReg = new RegExp('^\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*');
VV.Form.Global.URLReg = new RegExp('^([\\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$');
VV.Form.Global.BlankReg = new RegExp('\\w');
VV.Form.Global.ZipReg = new RegExp('(^(\\s?)\\d{5}(-\\d{4})?$)|(^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$)');
VV.Form.Global.DDSelectReg = new RegExp('^((?!Select).)*$');
VV.Form.Global.TimeReg = new RegExp('^([0-9]|0[0-9]|1[0-9]):[0-5][0-9] ([AP][M])$');
VV.Form.Global.PartnerReg = new RegExp('\\bpartnership', 'gi');
VV.Form.Global.CGASScore = new RegExp('\\s?[0-9]{3}');
VV.Form.Global.DoubleDigitCheck = new RegExp('\\s?[0-9]{2}');
VV.Form.Global.SSN = new RegExp('([0-9]{3})[-]([0-9]{2})[-]([0-9]{4})$');
VV.Form.Global.EIN = new RegExp('^([0-9]{2})[-]\\d{7}$');
VV.Form.Global.NPI = new RegExp('^\\d{10}$');
// Currency format must be '0.00' or '-0.00'
VV.Form.Global.Currency = new RegExp('^[0-9]*\.[0-9]{2}$');
// Percent check. Value can be 0 - 100 including decimals.
VV.Form.Global.Percent = new RegExp('^(100([\.][0]{1,})?$|[0-9]{1,2}([\.][0-9]{1,})?)$');
VV.Form.Global.NumberOnly = new RegExp('^([0-9]{1,3}([0-9]{3},)*[0-9]{3}|[0-9]+)?$');
//First and Last Name RegExp
//To add additional characters to fail validation, add the special character or unicode between the two []
VV.Form.Global.NameReg = new RegExp(/[!@#$%^*+={}/|\\\[\]<>?~]|[\d]{2,}/g);
VV.Form.Global.NameNumberReg = new RegExp(/[\d]{1,}/g);
VV.Form.Global.MedicaidIDRecipient = new RegExp('^\\d{10}$');
VV.Form.Global.MedicaidIDProvider = new RegExp('^\\d{9}$');
}
