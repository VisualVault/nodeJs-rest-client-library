/**
 * VV.Form.Global.SetLabelValue
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (labelName, labelValue) {
/*
    Script Name:   SetLabelValue
    Customer:      VisualVault
    Purpose:       Sets the value of a text label. Note: The value is NOT stored, so on reload the label element will revert back to its original content
                    
    Parameters:    The following represent variables passed into the function:  
                    labelName (String, Required) - The field name of the label.
                    labelValue (String, Required) - The value to change the label to. Can be HTML.
                   
    Return Value:  none       

    Date of Dev:   
    Last Rev Date: 06/10/2024
    Revision Notes:
      06/10/2024 - John Sevilla: Initial creation of the script.
*/
if (typeof labelName !== 'string') {
  throw new Error('Non-string label name passed in.');
}

if (typeof labelValue !== 'string') {
  throw new Error('Non-string label value passed in.');
}

try {
  const labelElem = $(`[vvFieldName="${labelName}"]`)[0];
  labelElem.innerHTML = labelValue;
} catch (error) {
  throw new Error(`Error updating label "${labelName}": ${error.message}`);
}
}
