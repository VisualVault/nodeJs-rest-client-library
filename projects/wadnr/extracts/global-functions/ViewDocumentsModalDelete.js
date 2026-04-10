/**
 * VV.Form.Global.ViewDocumentsModalDelete
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (documentName) {
/*
  Script Name:   ViewDocumentsModalDelete
  Customer:      WADNR
  Purpose:       The purpose of this process is to delete a document and its row in the View Documents Modal. Is a component of VV.Form.Global.ViewDocumentsModal.

  Parameters:   documentName (String, Required) - The human-readible VV document name (e.g. PROVIDER-DOC-00000010)

  Date of Dev: 5/2/2023
  Last Rev Date: 06/04/2025
  Revision Notes:
  5/2/2023  - John Sevilla: Script created
  06/04/2025 - Alfredo Scilabra: Added formGUID param and a block to refresh file counter on upload buttons
  07/02/2025 - Alfredo Scilabra: Added a block to fix file count not updating
*/
const websvcName = 'LibViewDocumentsModalDelete';
const { documentID, documentGUID, documentMetadataHTML } = getDocumentDataFromMap(documentName);

// build the content that will be shown in the deletion confirmation modal
const jqMainContent = $(
  `<div style="display:flex;align-items:center;flex-flow:column;">
    <p style="margin-bottom:1rem;">Do you want to delete the following document?</p>
    <div>${documentMetadataHTML}</div>
  </div>`
);

// show deletion confirmation modal
VV.Form.Global.DisplayModal({
  Icon: 'question',
  Title: 'Confirm Document Deletion',
  HtmlContent: jqMainContent[0].outerHTML,
  okFunction: callViewDocumentsModalDelete,
});

/**
 * Pulls document data from the last time ViewDocumentsModal ran (see: ViewDocumentsModalLastProperties in VV.Form.Global.ViewDocumentsModal)
 * @param {String} documentName - The human-readible VV document name (e.g. PROVIDER-DOC-00000010)
 * @returns {Object} document data
 */
function getDocumentDataFromMap(documentName) {
  let documentData;
  try {
    documentData =
      VV.Form.Global.ViewDocumentsModalLastProperties.documentDataMap.get(documentName);
  } catch (error) {
    documentData = null;
  }

  // ensure expected data is found
  const errorLog = [];
  if (documentData == null || Object.keys(documentData).length < 1) {
    errorLog.push(
      `Data for ${documentName} not found. Document data map may have not been properly initialized.`
    );
  } else {
    if (documentData.documentID == null) {
      errorLog.push(`A documentID was not found in document data map.`);
    }
    if (documentData.documentGUID == null) {
      errorLog.push(`A documentGUID was not found in document data map.`);
    }
    if (documentData.documentMetadataHTML == null) {
      errorLog.push(`A documentMetadataHTML was not found in document data map.`);
    }
  }

  if (errorLog.length > 0) {
    const errorTitle = 'Document Data Map Error';
    displayErrorModalAndThrow(errorLog, errorTitle);
  }

  return documentData;
}

function displayErrorModalAndThrow(messageData, title = 'Error') {
  VV.Form.Global.DisplayModal({
    Title: title,
    Icon: 'error',
    HtmlContent: Array.isArray(messageData) ? messageData.join('<br>') : messageData,
  });
  throw new Error(`${title}\n${Array.isArray(messageData) ? messageData.join('\n') : messageData}`);
}

function callViewDocumentsModalDelete() {
  const CallServerSide = function () {
    VV.Form.ShowLoadingPanel();
    const formData = [
      {
        name: 'documentID',
        value: documentID,
      },
      {
        name: 'documentGUID',
        value: documentGUID,
      },
      {
        name: 'formGUID',
        value: VV.Form.DataID,
      },
    ];

    //Following will prepare the collection and send with call to server side script.
    const data = JSON.stringify(formData);
    const requestObject = $.ajax({
      type: 'POST',
      url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${websvcName}`,
      contentType: `application/json; charset=utf-8`,
      data: data,
    });

    return requestObject;
  };

  $.when(CallServerSide()).always(function (resp) {
    VV.Form.HideLoadingPanel();
    if (typeof resp.status != 'undefined') {
      displayErrorModalAndThrow(
        `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`
      );
    } else if (typeof resp.statusCode != 'undefined') {
      displayErrorModalAndThrow(
        `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server. This may mean that the servers to run the business logic are not available.`
      );
    } else if (resp.meta.status == '200') {
      if (resp.data[0] != 'undefined') {
        if (resp.data[0] == 'Success') {
            
          // Refresh Datagrids
          VV.Form.Global?.RefreshFormElements?.();
          
          const expectedFileCount = getExpectedFileCount();
          const targetValue = `Upload (${expectedFileCount})`;

          const uploadButtons = document.querySelectorAll('.upload-button');
          uploadButtons.forEach((button) => {
            updateUploadButtonValue(button.id, targetValue);
            startDocumentCountRefresh(button.id, targetValue);
          });

          // if deleted document wasn't the only document in the modal, re-open the document modal
          if (VV.Form.Global.ViewDocumentsModalLastProperties.documentDataMap.size > 1) {
            const lastOptions = VV.Form.Global.ViewDocumentsModalLastProperties.options;
            VV.Form.Global.ViewDocumentsModal(lastOptions);
          }
        } else if (resp.data[0] == 'Error') {
          displayErrorModalAndThrow(`An error was encountered. ${resp.data[1]}`);
        } else {
          displayErrorModalAndThrow(
            `An unhandled response occurred when calling ${websvcName}. The form will not save at this time. Please try again or communicate this issue to support.`
          );
        }
      } else {
        displayErrorModalAndThrow('The status of the response returned as undefined.');
      }
    } else {
      displayErrorModalAndThrow(
        `The following unhandled response occurred while attempting to retrieve data from ${websvcName}: ${resp.data.error}`
      );
    }
  });
}

const getExpectedFileCount = () => {
  return VV.Form.Global.ViewDocumentsModalLastProperties.documentDataMap.size - 1;
};

const updateUploadButtonValue = (buttonId, value) => {
  const button = document.querySelector(`[vvfieldname="${buttonId}"]`);
  if (button) {
    button.value = value;
  }
};

// Starts refreshing the document count until the value matches or timeout occurs
const startDocumentCountRefresh = (buttonId, targetValue) => {
  const interval = setInterval(() => {
    VV.Form.RefreshDocumentCount(buttonId);
    const currentValue = document.querySelector(`[vvfieldname="${buttonId}"]`)?.value || '';

    if (currentValue.trim() === targetValue) {
      clearInterval(interval);
    }
  }, 2000);

  // Safety timeout to stop the interval after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
  }, 30000);
};

}
