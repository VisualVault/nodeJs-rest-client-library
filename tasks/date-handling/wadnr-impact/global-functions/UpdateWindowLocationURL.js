/**
 * VV.Form.Global.UpdateWindowLocationURL
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
var baseUrl = VV.BaseAppUrl; //Get the base URL from the global variable to ensure the correct environment is used in the URL
var dataId = VV.Form.DataID; //Get the DataID from the form context

var currentParams = new URLSearchParams(window.location.search);
var xcid = currentParams.get('xcid'); // Get the xcid parameter from the current URL
var xcdid = currentParams.get('xcdid'); // Get the xcdid parameter from the current URL

if (!xcid || !xcdid) { // Check if both xcid and xcdid are provided
    console.error('Missing required parameters: xcid and/or xcdid');
    return;
}

var newUrl = baseUrl + 'FormViewer/app' + // Construct the new URL using the base URL and the app path
    '?DataID=' + encodeURIComponent(dataId) +
    '&hidemenu=true' +
    '&xcid=' + encodeURIComponent(xcid) +
    '&xcdid=' + encodeURIComponent(xcdid);

// Update the browser's URL without reloading the page
window.history.replaceState(null, '', newUrl);
}
