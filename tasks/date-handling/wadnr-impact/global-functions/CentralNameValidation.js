/**
 * VV.Form.Global.CentralNameValidation
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (PassedValue) {
/*
    Script Name:   CentralNameValidation
    Customer:      VisualVault
    Purpose:       The purpose of this function is to allow the validation of individual names for valid characters in the name.
    Parameters:    The following represent variables passed into the function:  
                    Passed parameters: PassedValue
                    This function validates individual names and tests for special characters that are present in the VV.Form.Global.NameReg:
                    PassedValue - string representing the name that is being validated
    Return Value:  The following represents the value being returned from this function:
                    True if no special characters in the regex expression are present AND no more than 1 number in a name.       
    Date of Dev:   
    Last Rev Date: 06/11/2020
    Revision Notes:
    06/11/2020 - Michael Rainey: Initial creation of the business process. 
    06/25/2020 - Jason Hatch:  Moved SetupReg logic into its own area.  Updated dates in the comment.
*/

// if PassedValue returns actual value
//var PassedValue = 'test'

//Setup the regular expressions if not setup already.
if (typeof VV.Form.Global.EmailReg === 'undefined') {
    VV.Form.Global.SetupReg();
}



if (typeof PassedValue === 'string' && PassedValue.trim()) {
    var PassedControlValue = PassedValue.trim();
} else {
    return false;
}

//Validate name, test for amount of numbers.
if (PassedControlValue.match(VV.Form.Global.NameNumberReg) != null) {
    if (VV.Form.Global.NameReg.test(PassedControlValue) || (PassedControlValue.match(VV.Form.Global.NameNumberReg).length) > 1) {
        return false;
    } else {
        return true;
    }
} else {
    if (VV.Form.Global.NameReg.test(PassedControlValue)) {
        return false;
    } else {
        return true;
    }
}
}
