/**
 * VV.Form.Global.ToProperCase
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (stringValue) {
return stringValue.split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}
