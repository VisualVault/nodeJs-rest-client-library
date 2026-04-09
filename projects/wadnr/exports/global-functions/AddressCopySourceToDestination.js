/**
 * VV.Form.Global.AddressCopySourceToDestination
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (options) {
/*
  Script Name:   AddressCopySourceToDestination
  Customer:      PAELS
  Purpose:       The purpose of this process is copy the values from a set of source address fields to a set of destination 
                 address fields. Source fields must be valid (FormValidation using validationControlName)

  Parameters:   options (object, Required) - 
                  sourceToDestinationAddressFieldsMap (object, Required) - Object structured as a map, where each property is 
                  the source address field name and the value is the destination address field name
                  sourceAddressFieldsIdentifier (string, Required) - A name used to identify the set of source address fields in 
                  a modal error message
                  validationControlName (string, Required) - The argument to pass into FormValidation so that it checks all 
                  source address fields
                  sameAddressFieldName (string, Required) - The name of the dropdown that holds Yes/No options

  Example usage: 
                // Same_Address_onChange.js
                VV.Form.Global.AddressCopySourceToDestination({
                  sourceToDestinationAddressFieldsMap: {
                    "Mailing Street": "Physical Street",
                    "Mailing Zip Code": "Physical Zip Code",
                    "Mailing City": "Physical City",
                    "Mailing State": "Physical State",
                  },
                  sourceAddressFieldsIdentifier: "Mailing Address",
                  validationControlName: "CopyMailingToPhysicalAddress",
                  sameAddressFieldName: "Same Address"
                });

  Return Value: none

  Date of Dev: 4/17/2023
  Last Rev Date: 4/17/2023
  Revision Notes:
  4/17/2023  - John: Script created
*/

// Checks required params are set and optional params are set to default. Throws error if required params missing.
checkForParameters();

let evalGroupsConditions = true;
let triggerEvents = false;
if (VV.Form.GetFieldValue(options.sameAddressFieldName) !== "Yes") {
  return; // do not copy
} else if (VV.Form.Template.FormValidation(options.validationControlName) === false) {
  // mailing address fields incomplete; show message warning about this
  VV.Form.Global.CentralMessages("Unable To Copy Same Address", {
    sourceAddressFieldsIdentifier: options.sourceAddressFieldsIdentifier,
    sameAddressFieldName: options.sameAddressFieldName,
  });

  // set same address back to "No"
  VV.Form.SetFieldValue(options.sameAddressFieldName, "No", evalGroupsConditions, triggerEvents)

  return; // do not copy
}

VV.Form.Global.CopyFieldValues(options.sourceToDestinationAddressFieldsMap, evalGroupsConditions, triggerEvents);

function checkForParameters() {
  const requiredOptions = ["sourceToDestinationAddressFieldsMap", "sourceAddressFieldsIdentifier", "validationControlName", "sameAddressFieldName"];
  let errorLog = [];
  if (options == null || Object.keys(options).length < 1) {
    errorLog.push("An options parameter object was not passed in, this is a required parameter.");
  } else {
    // check required options
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
