/**
 * VV.Form.Global.SSNValidation
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (SocialSecurityNumber) {
//This validates the SocialSecurityNumber for the following criteria:
// Cannot contain all zeroes in any specific group (e.g 000-##-####, ###-00-####, or ###-##-0000)
// Cannot begin with 666.
// If the 1st character is '9' then the 4th character must be >= 7

//Remove everything that isn't a digit.
var SSNstr = (""+SocialSecurityNumber).replace(/\D/g, '');

if (SSNstr.length != 9) {
    return false;
}

var firstGroupPass, secondGroupPass, thirdGroupPass;
var firstGroup = SSNstr.substring(0, 3);
if (firstGroup != '000' && firstGroup != '666' && (SSNstr[0] != '9' || (SSNstr[0] == '9' && parseFloat(SSNstr[3]) >= 7))) {
    firstGroupPass = true;
} else {
    firstGroupPass = false;
}

var secondGroup = SSNstr.substring(3, 5);
secondGroupPass = (secondGroup != '00');

var thirdGroup = SSNstr.substring(5, 9);
thirdGroupPass = (thirdGroup != '0000');

return firstGroupPass && secondGroupPass && thirdGroupPass;
}
