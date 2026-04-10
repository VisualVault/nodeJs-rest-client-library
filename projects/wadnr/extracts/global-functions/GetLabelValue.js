/**
 * VV.Form.Global.GetLabelValue
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (labelName) {
/*
    Script Name:   GetLabelValue
    Customer:      VisualVault
    Purpose:       Gets the value of a text label
                    
    Parameters:    The following represent variables passed into the function:  
                    labelName (String, Required) - The field name of the label.
                   
    Return Value:  (String) The value of the label (innerHTML)
    Date of Dev:   
    Last Rev Date: 06/18/2024
    Revision Notes:
      06/18/2024 - John Sevilla: Initial creation of the script.
*/
if (typeof labelName !== 'string') {
  throw new Error('Non-string label name passed in.');
}

let labelValue = '';
try {
  labelValue = $(`[vvFieldName="${labelName}"]`)[0].innerHTML;
} catch (error) {
  throw new Error(`Error reading label "${labelName}": ${error.message}`);
}

return labelValue;
}
