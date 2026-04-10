/**
 * VV.Form.Global.FormatDateTextField
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (date) {
/*
    Script Name:   FormatDateTextField
    Customer:      WADNR
    Purpose:       The purpose of this process is to format the date entered in a text field to MM/YYYY

    Parameters:   date - date value entered in the text field
    
    Example: 
        -Input: 1/2025, Output: 01/2025
        -Input: 14/2025, Output: Invalid Date,
        -Input: 12/2025123, Output: Invalid Date,
        -Input: 10/12/2025, Output: 10/2025,

    Date of Dev:  03/07/2025 
    Revision Notes:
    21/01/2025 - Nicolas Culini: Script created.
    03/07/2025 - Moises Savelli: Return undefined for empty strings.
*/

let month = ''
let year = ''

if (VV.Form.Global.isNullEmptyUndefined(date)) {
  return undefined;
}

if(date.length == 6 || date.length == 7){
  month = date.split('/')[0].length == 1 ? `0${date.split('/')[0]}`:date.split('/')[0];
  year = date.split('/')[1];
}else if(date.length > 7 && date.length < 11){
  month = date.split('/')[0].length == 1 ? `0${date.split('/')[0]}`:date.split('/')[0];
  year = date.split('/')[2];
}else{
  return "Invalid Date";
}

if(month > 0 && month < 13 && year > 0 && year < 10000){
  return `${month}/${year}`
}else{
  return "Invalid Date";
}
}
