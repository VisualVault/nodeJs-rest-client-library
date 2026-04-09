/**
 * VV.Form.Global.FormatPhone
 * Parameters: 1
 * Extracted: 2026-04-09
 */
function (phoneNumber) {
/*
    Script Name:   FormatPhone
    Customer:      VisualVault
    Purpose:       The purpose of this founction is to take a phone number entered in any format and format it into a 
                    standard of (XXX) XXX-XXXX or (XXX) XXX-XXXX x12345 with 1 to 5 characters in the extension.
                    
    Parameters:    The following represent variables passed into the function:  
                   phoneNumber - Pass in a string that represents the phone number.
                   
    Return Value:  The following represents the value being returned from this function:
                    Formatted string representing the phone number.         
    Date of Dev:   
    Last Rev Date: 06/01/2017
    Revision Notes:
    06/01/2017 - Jason Hatch: Initial creation of the business process. 
*/

//Remove all non-alphabetic characters
var s2 = ("" + phoneNumber).replace(/\D+/g, "");

if (s2.length < 10) {
  //Have not fully keyed in the phone number so just return what they have keyed in.
  return s2;
} else if (s2.length > 15) {
  //Have too many numbers for a US number, return phone number.
  return s2;
} else if (s2.length == 10) {
  //Phone number is a number without extension.
  var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
  return !m ? null : "(" + m[1] + ") " + m[2] + "-" + m[3];
} else {
  //Phone number has an extenstion, format it into the 4 groups.
  var m = s2.match(/^(\d{3})(\d{3})(\d{4})(\d{1,5})?$/);
  return !m ? null : "(" + m[1] + ") " + m[2] + "-" + m[3] + " x" + m[4];
}
}
