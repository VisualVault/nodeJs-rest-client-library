/**
 * VV.Form.Global.RedirectToSubmitted
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
//RedirectToSubmitted for Global - changes the URL of the page to the designated User Registration success page

try {
  // var submitUrl = VV.BaseAppUrl + 'app/' + VV.CustomerAlias + '/' + VV.CustomerDatabaseAlias + '/FormConfirmation?DataID=' + VV.Form.DataID;

  var submitUrl = "https://sc-dev.visualvault.com/PAELSRegistrationConfirmation.html";
  if (window) {
      window.location.href = submitUrl;
  }
} catch (e) {
  // if (window) {
  //     window.location.href = './FormConfirmation';
  // }
  console.error(e);
}
}
