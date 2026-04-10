/**
 * VV.Form.Global.GetFormPrefix
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (formID) {
/*
    Script Name:   GetFormPrefix
    Customer:      VisualVault
    Purpose:       Gets the prefix of the form (e.g. 'EDUCATION-HISTORY' in 'EDUCATION-HISTORY-00000125')
                    
    Parameters:    The following represent variables passed into the function:  
                    formID (String, Required) - VV Form DhDocID
                   
    Return Value:  (String) The prefix WITHOUT a trailing dash        

    Date of Dev:   
    Last Rev Date: 06/04/2024
    Revision Notes:
      06/04/2024 - John Sevilla: Initial creation of the script.
*/
const prefixReg = /^([A-Za-z-]+)-\d+$/;
let formPrefix = "";
try {
  formPrefix = prefixReg.exec(formID)[1];
} catch (error) {
  throw new Error(`Unable to parse form prefix for: "${formID}". ${error.message}`,);
}

return formPrefix;
}
