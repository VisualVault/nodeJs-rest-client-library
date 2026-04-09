/**
 * VV.Form.Global.FormatCurrency
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (Currency) {
//Purpose of function is to take a Currency entered in any format and format it into a standard of X.XX

//Requires a 'Currency' parameter to be passed in

//Pass in a string that represents the Currency

//Convert string to integer
var s2 = parseFloat(Currency.replace(/,/g, ''));

if (s2.toFixed(2) == 'NaN') {
    return Currency;
}
else {
    return s2.toFixed(2);
}
}
