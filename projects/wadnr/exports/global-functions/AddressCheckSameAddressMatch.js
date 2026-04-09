/**
 * VV.Form.Global.AddressCheckSameAddressMatch
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (options) {
/*
  Script Name:   AddressCheckSameAddressMatch
  Customer:      PAELS
  Purpose:       The purpose of this process is to check if two address fields match, given that they share the same address.
                 If they do not match, the "Same Address" field is set to "No".

  Parameters:   options (object, Required) - 
                  sameAddressFieldName (string, Required) - The name of the "Same Address" field
                  addressOneFieldName (string, Required) - The name of an address field from the "first" address field set to compare
                  addressTwoFieldName (string, Required) - The name of an address field from the "second" address field set to compare

  Example usage: 
                // Mailing_Street_onBlur.js
                VV.Form.Global.AddressCheckSameAddressMatch({
                  sameAddressFieldName: "Same Address",
                  addressOneFieldName: "Mailing Street",
                  addressTwoFieldName: "Physical Street",
                });

  Return Value: none

  Date of Dev: 4/17/2023
  Last Rev Date: 4/17/2023
  Revision Notes:
  4/17/2023  - John: Script created
*/

// Checks required params are set and optional params are set to default. Throws error if required params missing.
checkForParameters();

if (VV.Form.GetFieldValue(options.sameAddressFieldName) !== "Yes") {
  return; // addresses not shared; do not perform check
}

// Check if address fields match, setting "Same Address" field to "No" if not
if (VV.Form.GetFieldValue(options.addressOneFieldName) !== VV.Form.GetFieldValue(options.addressTwoFieldName)) {
  let evalGroupsConditions = true;
  let triggerEvents = false;
  VV.Form.SetFieldValue(options.sameAddressFieldName, "No", evalGroupsConditions, triggerEvents);
}

function checkForParameters() {
  const requiredOptions = ["sameAddressFieldName", "addressOneFieldName", "addressTwoFieldName"];
  let errorLog = [];
  if (options == null || Object.keys(options).length < 1) {
    errorLog.push("An options parameter object was not passed in, this is a required parameter.");
  } else {
    // check options
    requiredOptions.forEach((reqOptionName) => {
      if (options[reqOptionName] == null) {
        errorLog.push(`A ${reqOptionName} option was not passed in, this is a required parameter.`);
      }
    });
  }
  
  if (errorLog.length > 0) {
    const errorTitle = "Missing Required Parameters";
    VV.Form.Global.DisplayModal({
      Title: errorTitle,
      Icon: "error",
      HtmlContent: errorLog.join("<br>"),
    });
    
    throw new Error(`${errorTitle}\n${errorLog.join('\n')}`);
  }
}
}
