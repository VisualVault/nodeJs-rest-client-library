/**
 * VV.Form.Global.FormatZipCode
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (zipCodeVal) {
//Parameter passed:  zipCodeVal
//The purpose of this function is to take a zip code entered in any format and format it into a standard of either ##### or 
//  #####-#### (zip + 4).
//Pass in a string that represents the zipcode.

//Remove all characters
var s2 = (""+zipCodeVal).replace(/\D/g, '');

// 5 digits is a legit zip.
if (s2.length == 5) {  
  var m = s2.match(/^(\d{5})$/);
  return (!m) ? null : m[1] ;
}

// 9 digits can create a US Zip + 4, so format it.
else if (s2.length == 9) {
  var m = s2.match(/^(\d{5})(\d{4})?$/);
  return (!m) ? null :  m[1] + "-" + m[2] ;
}

// too many numbers for a US number or US + 4, return digits entered.
else if (s2.length > 9) {
  return zipCodeVal;
}

// Just shy of full 9 digits, return digits entered.
else if (s2.length < 9) {   
  return zipCodeVal;
}
}
