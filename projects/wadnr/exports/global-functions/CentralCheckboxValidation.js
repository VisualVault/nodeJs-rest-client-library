/**
 * VV.Form.Global.CentralCheckboxValidation
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (checkboxArray, requiredNumber) {
/*
    Script Name:   CentralCheckboxValidation
    Customer:      VisualVault
    Purpose:       The purpose of this function is to make sure a required number of checkboxes have been checked.
                   Validation errors will be handled outside of this script(ex. inside the FormValidation()).
    Parameters:    The following represent variables passed into the function:  
                    checkboxArray - An array with all the checkbox values that need to be checked. Values are 'true' or 'false'.
                    requiredNumber - The number of required checkboxes. Value must be greater than or equal to 1.
    Return Value:  The following represents the value being returned from this function:
                    True if required number are selected, false if not.        
    Date of Dev:   
    Last Rev Date: 06/01/2017
    Revision Notes:
    06/01/2017 - Cesar Perez: Initial creation of the business process. 
*/

//The following are passed into this function in the following order:

// Check for empty array
if (checkboxArray.length === 0) {
    //alert('Empty array of checkbox values passed in CentralCheckboxValidation function');
    return false;
}

// Check for correct requiredNumber. Set default to 1.
if (requiredNumber < 1 || requiredNumber > checkboxArray.length) {
    //alert('Invalid required number passed in CentralCheckboxValidation function');
    return false;
}

// Keep track of checkboxes that are 'true'
var checked = 0;
// Loop through array and check for 'true' value, return true,  if required number of boxes are checked...
for (var i = 0; i < checkboxArray.length; i++) {
    if (checkboxArray[i] === 'True') {
        checked++;
        if (checked === requiredNumber) {
            return true;
        }
    }
}
// ... otherwise return false
return false
}
