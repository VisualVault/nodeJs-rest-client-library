/**
 * VV.Form.Global.SetLabelTokenValue
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (labelName, tokenName, tokenValue) {
/*
    Script Name:   SetLabelTokenValue
    Customer:      VisualVault
    Purpose:        Sets the value of a text label's tokens. Uses span elements to store token position once replaced. 
                    Note: The value is NOT stored, so on reload the label element will revert back to its original content
                    
    Parameters:    The following represent variables passed into the function:  
                    labelName (String, Required) - The field name of the label.
                    tokenName (String, Required) - The name of the token. If using square brackets to delimit tokens, should be in the form "[Token Name Here]"
                    tokenValue (String, Required) - The value to change the token to. Can be HTML.
                   
    Return Value:  none
    Date of Dev:   
    Last Rev Date: 06/18/2024
    Revision Notes:
      06/18/2024 - John Sevilla: Initial creation of the script.
*/
// Get label element
const labelElem = $(`[vvFieldName="${labelName}"]`);
if (labelElem.length !== 1) {
  throw new Error(`Unable to find unique element for label "${labelName}"`);
}

// Try to find token span if previously created
let tokenSpan = labelElem.find(`span[tokenName="${tokenName}"]`);
if (tokenSpan.length > 1) {
  throw new Error(`Unable to find unique element for token "${tokenName}"`)
} else if (tokenSpan.length === 1) {
  // If found, replace the content of token span with the new value
  tokenSpan.html(tokenValue)
} else {
  // If not, token probably still exists. Replace with token with span element that has a special attribute for subsequent searches
  const currentLabelInnerHTML = labelElem.html();
  const newLabelInnerHTML = currentLabelInnerHTML.replace(tokenName, `<span tokenName="${tokenName}">${tokenValue}</span>`);
  labelElem.html(newLabelInnerHTML);
}
}
