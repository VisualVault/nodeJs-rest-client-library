/**
 * VV.Form.Global.SaveBeforeUpload
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (buttonName) {
/*
    Script Name:   SaveBeforeUpload
    Customer:      VisualVault
    Purpose:       Makes it so a form save occurs when you click on an upload button before the form is saved
                    
    Parameters:    The following represent variables passed into the function:  
                    buttonName (String, Required) - The name of the button
                   
    Return Value:  none
    Date of Dev:   
    Last Rev Date: 03/08/2022
    Revision Notes:
      03/01/2022 - Tod Olsen: Initial creation of the script.
      03/08/2022 - John Sevilla: Add error handling when button not available
*/
try {
  $(`[vvfieldname="${buttonName}"]`)[0].parentNode.addEventListener("click", async e => {
    if (!VV.Form.IsFormSaved) {
      e.stopImmediatePropagation();
      e.preventDefault();
      await VV.Form.DoAjaxFormSave();
      $(`[vvfieldname="${buttonName}"]`).click();
      return false;
    }
  }, true);
} catch (error) {
  // button may not always exist due to G&C
  console.warn(`Unable to find upload button "${buttonName}"`);
}
}
