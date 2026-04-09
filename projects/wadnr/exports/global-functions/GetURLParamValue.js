/**
 * VV.Form.Global.GetURLParamValue
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (parameterName, urlString) {
/*
  Script Name:   GetURLParamValue
  Customer:      PAELS
  Purpose:       The purpose of this process is to get the value of a URL parameter from the current location or a given URL string
  Parameters:    The following represent variables passed into the function: 
                  parameterName (String, Required) - The name of the parameter
                  urlString (String) - A url with search parameters. Defaults to the url of the current page.
  
  Return Value:  (String) The value of the parameter or an empty string if no such parameter is found

  Date of Dev: 5/23/2024 
  Last Rev Date: 5/23/2024
  Revision Notes:
  5/23/2024  - John Sevilla: Script created
*/
const urlParams = new URLSearchParams(urlString ?? window.location.href);

return urlParams.get(parameterName) ?? '';
}
