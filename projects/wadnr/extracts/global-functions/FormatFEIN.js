/**
 * VV.Form.Global.FormatFEIN
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (feinVal) {
/*
    Script Name:   FormatFEIN
    Customer:      VisualVault
    Purpose:       The purpose of this founction is to take a FEIN entered in any format and format it into a standard of XX-XXXXXXX
                    
    Parameters:    The following represent variables passed into the function:  
                    feinVal - Pass in a string that represents the FEIN.
                   
    Return Value:  The following represents the value being returned from this function:
                    Formatted string representing the FEIN.         
    Date of Dev:   
    Last Rev Date: 06/01/2017
    Revision Notes:
    06/01/2017 - Cesar Perez: Initial creation of the business process. 
*/

//Remove all characters
var s2 = ("" + feinVal).replace(/\D/g, '');

if (s2.length < 8) {   //Have not fully keyed in the number so just return what they have keyed in.
    return feinVal;
}
if (s2.length > 9) {   //Have not fully keyed in the number so just return what they have keyed in.
    return feinVal;
}
else if (s2.length == 9) {  //FEIN starts with two digits.
    var m = s2.match(/^(\d{2})(\d{7})$/);
    return (!m) ? null : m[1] + "-" + m[2];
}
else {      //FEIn starts with one digit.
    var m = s2.match(/^(\d{1})(\d{7})$/);
    return (!m) ? null : "0" + m[1] + "-" + m[2];
}
}
