/**
 * VV.Form.Global.CopyFieldValues
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (sourceToDestinationFieldMap, evaluateGroupConditions, triggerEvents) {
/*
  Script Name:   CopyFieldValues
  Customer:      PAELS
  Purpose:       The purpose of this process is to copy the value(s) of source fields to destination field(s)

  Parameters:   sourceToDestinationFieldMap (Object, required) - Object structured as a map, where each property is the 
                source field name and the value is the destination field name
                evaluateGroupConditions (boolean) - Option to trigger groups and conditions on the destination 
                fields. Defaults to true.
                triggerEvents (boolean) - Option to trigger events on the destination fields. Defaults to true.

  Example usage: 
                VV.Form.Global.CopyFieldValues({
                  "Mailing Street": "Physical Street",
                  "Mailing Zip Code": "Physical Zip Code",
                  "Mailing City": "Physical City",
                  "Mailing State": "Physical State",
                }, false, false);

  Return Value:  A Promise that resolves after all fields have been set (similar to VV.Form.SetFieldValue)

  Date of Dev: 4/12/2023
  Last Rev Date: 4/12/2023
  Revision Notes:
  4/12/2023  - John: Script created
*/

// Checks required params are set and optional params are set to default. Throws error if required params missing.
checkForParameters();

// Set destination fields to source field values
let setFieldValuePromises = [];
for (const sourceFieldName in sourceToDestinationFieldMap) {
  if (sourceToDestinationFieldMap.hasOwnProperty(sourceFieldName)) {
    const destinationFieldName = sourceToDestinationFieldMap[sourceFieldName];
    const sourceFieldValue = VV.Form.GetFieldValue(sourceFieldName);

    setFieldValuePromises.push(VV.Form.SetFieldValue(destinationFieldName, sourceFieldValue, evaluateGroupConditions, triggerEvents));
  }
}

function checkForParameters() {
  let errorLog = [];
  if (sourceToDestinationFieldMap == null || Object.keys(sourceToDestinationFieldMap).length < 1) {
    errorLog.push("A source to destination field map was not passed in, this is a required parameter.");
  }
  if (evaluateGroupConditions == null) {
    evaluateGroupConditions = true;
  }
  if (triggerEvents == null) {
    triggerEvents = true;
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

return Promise.all(setFieldValuePromises);
}
