/**
 * VV.Form.Global.CentralEmailValidation
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (PassedValue) {
/*
    Script Name:   CentralEmailValidation
    Customer:      VisualVault
    Purpose:       The purpose of this function is to allow the validation one or many emails
    Parameters:    The following represent variables passed into the function:  
                    Passed parameters: PassedValue
                    This function validates one or more emails with the regex in the VV.Form.Global.EmailReg:
                    PassedValue - string representing the name that is being validated
    Return Value:  The following represents the value being returned from this function:
                    True if the email passes validation      
    Date of Dev:   
    Last Rev Date: 06/11/2011
    Revision Notes:
    06/11/2011 - Michael Rainey: Initial creation of the business process. 
*/

// if PassedValue returns actual value
if (PassedValue.trim()) {
    VV.Form.Global.SetupReg();
    var PassedControlValue = PassedValue.trim();
    var emailTestArray = [];
    var emailbadArray = [];
} else {
    return false;
}

//This splits all the email addresses into an array on a comma.
emailTestArray = PassedControlValue.split(',');
//This tests the array for each email address. All bad email addresses are pushed into the emailbadarray.
emailTestArray.forEach(function (t) {
    t = t.trim();
    if (t.length > 0) {
        if (!VV.Form.Global.EmailReg.test(t)) {
            emailbadArray.push(t);
        }
    }
})
//This sets the validation error messages depending on how many bad email addresses are found.
if (emailbadArray.length > 0) {
        return false
}
}
