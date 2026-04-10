/**
 * VV.Form.Global.ViewDocumentsModalAccept
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (documentName) {
/*
  Script Name:   ViewDocumentsModalAccept
  Customer:      WADNR
  Purpose:       The purpose of this process is to accept a document and its row in the View Documents Modal. Is a component of VV.Form.Global.ViewDocumentsModal.

  Parameters:   documentName (String, Required) - The human-readible VV document name (e.g. PROVIDER-DOC-00000010)

  Date of Dev: 6/2/2023
  Last Rev Date: 6/2/2023
  Revision Notes:
  6/2/2023  - Brian Davis: Script created
  4/10/2024 - Moises Savelli: Add DisplayModalRemoveHiddenSweetAlertElements() for non-used elements - Accessibility Feature.
*/
const websvcName = "LibViewDocumentsModalAccept";
const { documentID, documentGUID, documentMetadataHTML } = getDocumentDataFromMap(documentName);

// build the content that will be shown in the deletion confirmation modal
let jqMainContent = $(
  `<div style="display:flex;align-items:center;flex-flow:column;">
    <p style="margin-bottom:1rem;">Do you want to accept the following document?</p>
    <div>${documentMetadataHTML}</div>
  </div>`
);

// show accept confirmation modal
Swal.fire({
  icon: "question",
  title: "Confirm Document Acceptance",
  html: jqMainContent[0].outerHTML,
  showCancelButton: true,
  showConfirmButton: true,
  confirmButtonText: "OK",
  cancelButtonText: "Cancel",
  customClass: {
    container: 'swal2-container',
    content: 'swal2-content',
  },
  width: '64rem'
}).then((result) => {
  if (result.dismiss === Swal.DismissReason.cancel) {
    VV.Form.Global.ViewDocumentsModal(VV.Form.Global.ViewDocumentsModalLastProperties.options);
  } else if (result.isConfirmed) {
    // Call the accept function when the OK button is clicked
    callViewDocumentsModalAccept();
  }
});

/**
 * Pulls document data from the last time ViewDocumentsModal ran (see: ViewDocumentsModalLastProperties in VV.Form.Global.ViewDocumentsModal)
 * @param {String} documentName - The human-readible VV document name (e.g. PROVIDER-DOC-00000010)
 * @returns {Object} document data
 */
function getDocumentDataFromMap(documentName) {
  let documentData;
  try {
    documentData = VV.Form.Global.ViewDocumentsModalLastProperties.documentDataMap.get(documentName);
  } catch (error) {
    documentData = null;
  }

  // ensure expected data is found
  let errorLog = [];
  if (documentData == null || Object.keys(documentData).length < 1) {
    errorLog.push(`Data for ${documentName} not found. Document data map may have not been properly initialized.`);
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
    const errorTitle = "Document Data Map Error";
    displayErrorModalAndThrow(errorLog, errorTitle);
  }

  return documentData;
}

function displayErrorModalAndThrow(messageData, title = "Error") {
  VV.Form.Global.DisplayModal({
    Title: title,
    Icon: "error",
    HtmlContent: Array.isArray(messageData) ? messageData.join("<br>") : messageData,
  });
  throw new Error(`${title}\n${Array.isArray(messageData) ? messageData.join("\n") : messageData}`);
}

function callViewDocumentsModalAccept() {
  let CallServerSide = function () {
    VV.Form.ShowLoadingPanel();
    let formData = [];

    let FormInfo = {};
    FormInfo.name = "documentID";
    FormInfo.value = documentID;
    formData.push(FormInfo);

    //Following will prepare the collection and send with call to server side script.
    let data = JSON.stringify(formData);
    let requestObject = $.ajax({
      type: "POST",
      url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${websvcName}`,
      contentType: `application/json; charset=utf-8`,
      data: data,
    });

    return requestObject;
  };

  $.when(CallServerSide()).always(function (resp) {
    VV.Form.HideLoadingPanel();
    let messageData = "";
    if (typeof resp.status != "undefined") {
      messageData = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
      displayErrorModalAndThrow(messageData);
    } else if (typeof resp.statusCode != "undefined") {
      messageData = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server. This may mean that the servers to run the business logic are not available.`;
      displayErrorModalAndThrow(messageData);
    } else if (resp.meta.status == "200") {
      if (resp.data[0] != "undefined") {
        if (resp.data[0] == "Success") {
          // if deleted document wasn't the only document in the modal, re-open the document modal
          if (VV.Form.Global.ViewDocumentsModalLastProperties.documentDataMap.size > 1) {
            let lastOptions = VV.Form.Global.ViewDocumentsModalLastProperties.options;
            VV.Form.Global.ViewDocumentsModal(lastOptions);
          }
        } else if (resp.data[0] == "Error") {
          messageData = `An error was encountered. ${resp.data[1]}`;
          displayErrorModalAndThrow(messageData);
        } else {
          messageData = `An unhandled response occurred when calling ${websvcName}. The form will not save at this time. Please try again or communicate this issue to support.`;
          displayErrorModalAndThrow(messageData);
        }
      } else {
        messageData = "The status of the response returned as undefined.";
        displayErrorModalAndThrow(messageData);
      }
    } else {
      messageData = `The following unhandled response occurred while attempting to retrieve data from ${websvcName}: ${resp.data.error}`;
      displayErrorModalAndThrow(messageData);
    }
  });
}

VV.Form.Global.DisplayModalRemoveHiddenSweetAlertElements();
}
