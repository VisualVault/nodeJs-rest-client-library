/**
 * VV.Form.Global.BuildAjaxFormSaveWithStaleCheck
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (latestGUIDQueryName) {
/*
    Script Name:   BuildAjaxFormSaveWithStaleCheck
    Purpose:       Instantiates a version of DoAjaxFormSave that, on failure, checks if the form revision is the latest,
                   and if it isn't, shows messaging to the user prompting them to refresh the page.

    Parameters:    latestGUIDQueryName (String, Required) - Name of custom query that uses the form template's DhDocID
                   to retrieve the DhID

    Return Value:  The return value (Promise) of DoAjaxFormSave

    Date of Dev:  03/03/2026
    Revision Notes:
    03/03/2026 - John Sevilla: Script created
*/
const originalDoAjaxFormSave = VV.Form.DoAjaxFormSave.bind(VV.Form);
const originalDisplayModal = VV.Form.Global.DisplayModal;
const defaultStaleFormErrorMessage = 'This form could not be saved because it is not the latest version of the record. Please refresh the page and try again your action.';
let formIsStale = false;

/**
 * @returns {Promise<string?>} A string if a newer form revision/GUID is found, null otherwise
 */
function getNewerGUID() {
  return VV.Form.Global.UseCustomQuery(latestGUIDQueryName, VV.Form.DhDocID, null).then((res) => {
    let newerGUID = null;
    if (res?.length > 0 && res[0].dhId) {
      const resultGUID = String(res[0].dhId).toLowerCase();
      if (resultGUID !== VV.Form.DataID.toLowerCase()) {
        newerGUID = resultGUID;
      } // else already on latest
    } else {
      throw new Error(`No GUID returned from ${latestGUIDQueryName}`);
    }

    return newerGUID;
  });
}
/**
 * @param {string} newerGUID 
 */
function displayStaleFormMessage(newerGUID) {
  try {
    // Show messaging
    VV.Form.Global.DisplayModal({
      Icon: 'warning',
      Title: 'Form could not be saved',
      HtmlContent: 'This form could not be saved because it is not the latest version of the record. Please click OK or refresh the page and try again your action.',
      okFunction: () => { VV.Form.Global.OpenURLFromGUID(newerGUID, false, '_self') },
      showCancelButton: false,
    });

    // Temporarily disable DisplayModal to prevent message being pushed out by other modals
    tempDisableDisplayModal(5000);
  } catch (modalError) {
    console.warn(modalError);

    // Fallback to alert
    alert(defaultStaleFormErrorMessage);
  }
}

/**
 * @param {Number} disableTimeMS 
 */
function tempDisableDisplayModal(disableTimeMS) {
  // Disable modal, but report messages in console
  VV.Form.Global.DisplayModal = (modalObject) => {
    console.warn(`Silenced DisplayModal: ${modalObject.Title} - ${modalObject.HtmlContent}`);
  };

  // Re-enable after timeout
  setTimeout(() => {
    VV.Form.Global.DisplayModal = originalDisplayModal;
  }, disableTimeMS);
}

return () => {
  // Main Promise Chain
  return originalDoAjaxFormSave().catch((originalSaveError) => {
    // Inner Promise Chain: If save errors, check for newer revision
    return getNewerGUID()
      .then((newerGUID) => {
        if (newerGUID) {
          displayStaleFormMessage(newerGUID);
          formIsStale = true;
        } // else no need for message
      })
      .catch((innerError) => {
        // If any errors occur within this inner chain, report it as a warning
        console.warn(innerError);
      })
      .finally(() => {
        // Always throw an error (prevents functions awaiting save from resolving)
        if (formIsStale) {
          // Throw stale form error
          throw new Error(defaultStaleFormErrorMessage);
        } else {
          // Throw the original error 
          throw originalSaveError; 
        }
      });
  });
};
}
