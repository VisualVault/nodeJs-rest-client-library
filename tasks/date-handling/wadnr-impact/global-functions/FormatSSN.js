/**
 * VV.Form.Global.FormatSSN
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (SocialSecurityNumber) {
//Purpose of function is to take a Social Security Number entered in any format and format it into a standard of XXX-XX-XXXX
//Pass in a string that represents the SocialSecurityNumber

//Remove everything that isn't a digit.
var s2 = (""+SocialSecurityNumber).replace(/\D/g, '');

if (s2.length < 9) {   //Have not fully keyed in the number so just return what they have keyed in.
    return SocialSecurityNumber;
}
else if (s2.length > 9) {   //Have too many digits number so just return what they have keyed in.
    return SocialSecurityNumber;
}
else if (s2.length == 9) {  //Social Security Number starts with three digits.
    var m = s2.match(/^(\d{3})(\d{2})(\d{4})$/);
    return (!m) ? null : m[1] + "-" + m[2] + "-" + m[3];
}
}
