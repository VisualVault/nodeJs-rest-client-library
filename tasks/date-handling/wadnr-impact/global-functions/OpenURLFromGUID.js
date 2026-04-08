/**
 * VV.Form.Global.OpenURLFromGUID
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (guid, readOnly, windowTarget) {
/*
    Script Name: OpenURLFromGUID
    Purpose: Opens a URL based on the provided GUID and optional read-only mode.

    Parameters:
    - guid (String): The GUID for the form.
    - readOnly (Boolean): Determines if the URL should open in "Read Only" mode. Optional.
    - windowTarget (String): Determines the target for opening the URL. If "_self", opens in the current window; if "_blank", opens in a new tab/window. Optional. Default is "_blank".

    Return Value: None (Function opens the URL or shows an error modal using DisplayModal)

    Date of Dev: 8/22/2023
    Created By: Brian Davis

    Last Revision Date: 8/22/2023
    Revision Notes:
    - 8/22/2023 - Brian: Initial version of the script.

*/

if (VV.Form.Global.isNullEmptyUndefined(guid)) {
    // Show an error modal using DisplayModal if no GUID is provided
    showErrorModal();
  } else {
    // Set baseUrl to VV.BaseURL
    const baseUrl = VV.BaseURL;
  
    // Create URL with GUID and hidemenu=true query parameters
    let url = `${baseUrl}FormDetails?DataID=${guid}&hidemenu=true`;
  
    // Check if readOnly parameter is provided and append "Mode=ReadOnly" to the URL
    if (readOnly) {
      url += "&Mode=ReadOnly";
    }
  
    // Determine the target for opening the URL
    const target = windowTarget || "_blank";
  
    // Open the URL in the specified tab/window
    window.open(url, target);
  }
  
  function showErrorModal() {
    // Show an error modal using DisplayModal if no GUID is provided
    VV.Form.Global.DisplayModal({
      Icon: "error",
      Title: "Error: Missing GUID",
      HtmlContent: "No GUID was provided to the OpenURLFromGUID function. Please provide a GUID.",
    });
  }
  
}
