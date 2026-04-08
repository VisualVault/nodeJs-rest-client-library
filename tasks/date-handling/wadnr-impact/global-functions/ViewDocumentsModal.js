/**
 * VV.Form.Global.ViewDocumentsModal
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (options) {
/*
  Script Name:   ViewDocumentsModal
  Customer:      WADNR
  Purpose:       The purpose of this process is to shows documents in a modal and lets us perform several actions based on the passed in options. Requires VV.Form.Global.DisplayModal.

  Parameters:   options (Object, Required):
                  search (Object[], Required) - An array of searchOption objects with the following properties:
                    type (String, Required) - The type of search used to retrieve documents. The valid types are
                      'formRelatedDocs' -> Gets all documents related to targetFormID. If a search option with this type is passed in, all other search options in the array are ignored.
                      'indexFieldEquals' -> Gets documents with an index field (fieldName) = a specific value (fieldValue). If multiple search options with this type are passed in, they are all 'AND'ed to create a search query.
                    targetFormID (String) - The form ID of a form to get related documents from; defaults to the form ID of the current form. Only used when type = 'formRelatedDocs'. 
                    fieldName (String, Required*) - The name of a document's index field, used for searching. Only required when type = 'indexFieldEquals'.
                    fieldValue (String, Required*) - The value of a document's index field, used for searching. Only required when type = 'indexFieldEquals'.
                  instructionsTemplate (String) - The name of an 'instruction template' defined in instructionsTemplateMap for use as the modal's instructions. Shows 'default' instructions if none provided.
                  documentButtons (String[]) - An array of button names to show to the right of each document. Shows no buttons by default.
                    Buttons available for use:
                      'delete' -> Deletes the document from the system. Requires VV.Form.Global.ViewDocumentsModalDelete.
                  showDocumentType (Boolean) - Determines if the "Document Type:" is shown for each document. Defaults to true.

  Example usage: 
                // show documents related to this form and allow document deletion
                VV.Form.Global.ViewDocumentsModal({
                  search: [{
                    type: 'formRelatedDocs', // shows documents related to this form
                  }],
                  instructionsTemplate: 'open and delete',
                  documentButtons: ['delete'],
                });

                // show documents where the index fields 'Provider ID' = 'PROVIDER-000007' AND 'Location ID' = 'LOCATION-00000055', do not allow document deletion, and hide document type
                VV.Form.Global.ViewDocumentsModal({
                  search: [{
                    type: 'indexFieldEquals',
                    fieldName: 'Provider ID',
                    fieldValue: 'PROVIDER-000007',
                  }, {
                    type: 'indexFieldEquals',
                    fieldName: 'Location ID',
                    fieldValue: 'LOCATION-00000055',
                  }],
                  showDocumentType: false,
                });

  Return Value: none

  Date of Dev: 4/25/2023
  Last Rev Date: 09/10/2025
  Revision Notes:
  4/25/2023 - John Sevilla: Script created
  09/12/2023 - Michael Rainey: update so rows are alternating colors
  09/10/2025 - Mauro Rapuano: Set Viewer permissions to proponent for TEMP/FORM ID subfolder
*/

const websvcName = "LibViewDocumentsModal";
const instructionsTemplateMap = {
  default: 'View uploaded documents by clicking the "Open" button',
  "open and delete": 'View uploaded documents by clicking the "Open" button. Remove any unwanted documents by clicking the "Delete" button',
  "valid and invalid": 'Please verify the related documents by clicking the corresponding "Valid" or "Invalid" button',
  "accept and invalid": 'Please verify the related documents by clicking the corresponding "Accept" or "Invalid" button',
};

// Checks required params are set and optional params are set to default. Throws error if required params missing.
checkForParameters();
const { documentButtons, showDocumentType, instructionsTemplate, search } = options;

/**
 * An object that stores data from the last time the ViewDocumentsModal was run. Resets every time the function is called.
 * Note: Please ensure this VV namespace is unused.
 * @typedef VV.Form.Global.ViewDocumentsModalLastProperties
 * @property {Object} options - The last 'options' parameter used to call ViewDocumentsModal
 * @property {Map<String, Object>} documentDataMap - A map of the last document data retrieved. Key is the document
 * name (e.g. PROVIDER-DOC-00000010) and the value is data related to that document (e.g. documentGUID, documentID, etc.)
 */
VV.Form.Global.ViewDocumentsModalLastProperties = {
  options,
  documentDataMap: new Map(),
};

function CallServerSide() {
  VV.Form.ShowLoadingPanel();
  let formData = [];

  let FormInfo = {};
  FormInfo.name = "Form ID";
  FormInfo.value = VV.Form.DhDocID;
  formData.push(FormInfo);

  FormInfo = {};
  FormInfo.name = "REVISIONID";
  FormInfo.value = VV.Form.DataID; // Form GUID
  formData.push(FormInfo);

  FormInfo = {};
  FormInfo.name = "SearchOptions";
  FormInfo.value = search;
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
}

// Call webservice
$.when(CallServerSide()).always((resp) => {
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
        if (resp.data[0] == "Success") {
          let documents = resp.data[2];
          if (documents.length > 0) {
            displayDocumentsModal(documents);
          } else {
            displayNoDocsFoundModal();
          }
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
    messageData = `The following unhandled response occurred while attempting to retrieve data from ${websvcName}: ${resp?.data?.error}`;
    displayErrorModalAndThrow(messageData);
  }
});

function checkForParameters() {
  let errorLog = [];
  if (options == null || Object.keys(options).length < 1) {
    errorLog.push("An options parameter object was not passed in, this is a required parameter.");
  } else {
    // check options
    /* search */
    if (Array.isArray(options.search) === false || options.search.length < 1) {
      errorLog.push(`A search option was not passed in, this is a required parameter.`);
    } else {
      // check search options
      options.search.forEach((searchOption) => {
        if (searchOption.type === "formRelatedDocs") {
          if (searchOption.targetFormID == null) {
            searchOption.targetFormID = VV.Form.DhDocID; // by default get docs related to this form
          }

          // error to prevent getting form related documents for an invalid form ID
          if (VV.Form.IsFormSaved === false && searchOption.targetFormID === VV.Form.DhDocID) {
            let title = "Save to View Documents";
            let message = 'Please "Save" in order to view documents uploaded to this form.';
            displayErrorModalAndThrow(message, title);
          }

          /* userID */
          const needsProponentPermissions = 
            VV.Form.GetFieldValue("Status").toLowerCase() === "draft"
            && VV.Form.GetFieldValue("Document Upload Path") != ''
            && VV.Form.FormUserGroups.includes("Proponent");

          if (needsProponentPermissions) {
            searchOption.userID = VV.Form.FormUserID;
            searchOption.folderPath = VV.Form.GetFieldValue("Document Upload Path");
          }

        } else if (searchOption.type === "indexFieldEquals") {
          if (searchOption.fieldName == null) {
            errorLog.push(`A search object fieldName property was not passed in, this is a required parameter.`);
          }
          if (searchOption.fieldValue == null) {
            errorLog.push(`A search object fieldValue property was not passed in, this is a required parameter.`);
          }
        }
      });
    }

    /* instructions template */
    if (options.instructionsTemplate == null) {
      options.instructionsTemplate = "none"; // default
    }

    /* document buttons */
    if (Array.isArray(options.documentButtons) === false) {
      options.documentButtons = []; // default
    }

    /* show document type */
    if (options.showDocumentType == null) {
      options.showDocumentType = true; // default
    }

  }

  if (errorLog.length > 0) {
    const errorTitle = "Missing Required Parameters";
    displayErrorModalAndThrow(errorLog, errorTitle);
  }
}

function displayErrorModalAndThrow(messageData, title = "Error") {
  VV.Form.Global.DisplayModal({
    Title: title,
    Icon: "error",
    HtmlContent: Array.isArray(messageData) ? messageData.join("<br>") : messageData,
  });
  throw new Error(`${title}\n${Array.isArray(messageData) ? messageData.join("\n") : messageData}`);
}


// Modify the displayDocumentsModal function
function displayDocumentsModal(documents) {
  // build document table
  let jQTable = $('<table style="width:100%;">');
  documents.forEach((doc, index) => {
    const jQTableRow = buildTableRow(doc);


    // Apply alternating row colors
    if (index % 2 === 0) {
      jQTableRow.css({
        "background-color": "#f7f7f7", // very Light gray for even rows
      });
    } else {
      jQTableRow.css({
        "background-color": "#b5b5b5", // Light gray for odd rows
      });
    }
    jQTable.append(jQTableRow);
  });
  // build main content - add instructions, insert table, define max height, etc.
  let jQMainContent = $(
    `<div>
<p style="margin-bottom: 1rem;text-align:left;">
          ${getInstructionsTemplate(instructionsTemplate)}.
          ${getSearchCriteriaInstructions(true)}.
</p>
<div style="max-height:32rem;overflow-y:auto;">${
    jQTable[0].outerHTML
    }</div>
</div>`,
  );



  // display modal
  VV.Form.Global.DisplayModal({
    Title: "View Documents",
    HtmlContent: jQMainContent[0].outerHTML,
  });
}

function displayNoDocsFoundModal() {
  let searchCriteriaInstructions = getSearchCriteriaInstructions(false);
  VV.Form.Global.DisplayModal({
    Title: "No Documents Found",
    Icon: "info",
    HtmlContent: `${searchCriteriaInstructions}. If you expected to see documents, please ensure they have been uploaded into the system.`,
  });
}

/**
 * Infers search criteria instructions (e.g. 'The following documents were found related to...') based on the 'search' option
 * @param {Boolean} documentsFound - Determines if the instructions say if documents were found or not
 * @returns search criteria instructions
 */
function getSearchCriteriaInstructions(documentsFound) {
  // infer search criteria from search options
  let formRelatedDocsSearchCriteria = "";
  let indexFieldSearchCriteria = [];
  for (const searchOption of search) {
    if (searchOption.type === "formRelatedDocs") {
      if (searchOption.targetFormID === VV.Form.DhDocID) {
        formRelatedDocsSearchCriteria = "this form";
      } else {
        formRelatedDocsSearchCriteria = `form: ${searchOption.targetFormID}`;
      }
      break; // no need to process further
    } else if (searchOption.type === "indexFieldEquals") {
      indexFieldSearchCriteria.push(`${searchOption.fieldName} = '${searchOption.fieldValue}'`);
    }
  }

  // determine subject of instructions
  let instructionsSubject;
  if (documentsFound) {
    instructionsSubject = "The following documents";
  } else {
    instructionsSubject = "No documents";
  }

  // create instructions based on criteria
  if (formRelatedDocsSearchCriteria) {
    return `${instructionsSubject} were found related to ${formRelatedDocsSearchCriteria}`;
  } else if (indexFieldSearchCriteria.length > 0) {
    return `${instructionsSubject} were found with the index field search criteria: ${indexFieldSearchCriteria.join(" AND ")}`;
  } else {
    let message = `Unable to infer search criteria for instructions.`;
    displayErrorModalAndThrow(message);
  }
}

/**
 * Builds a single jQuery html object from the document data supplied. Also populates ViewDocumentsModalLastProperties
 * with data needed for auxiliary functions (like ViewDocumentsModalDelete)
 * @param {Object} doc - VV document data object
 * @returns {Object} A jQuery object of the built tr element
 */
function buildTableRow(doc) {
  let documentID = doc.documentId;
  let documentGUID = doc.id;
  let documentName = doc.name; // e.g. PROVIDER-DOC-00000010
  let documentURL = `${VV.BaseURL}documentviewer?hidemenu=true&dhid=${documentGUID}`;
  let documentAccepted = doc["document accepted"];
  let fileName = doc.fileName ? doc.fileName : "No filename";
  let uploadDate = doc.createDate;
  uploadDate = uploadDate ? new Date(uploadDate).toLocaleDateString() : "No date";

  // document type
  let documentTypeHTML = "";
  if (showDocumentType) {
    let type = doc["document type"];
    type = type ? type : "None";
    documentTypeHTML = `<div><b>Document Type:</b> ${type}</div>`;
  }

  // buttons
  let documentButtonsHTML = "";
  if (documentButtons.includes("delete")) {
    // add to HTML
    documentButtonsHTML += `<button type="button" style="background-color: #f44336;" onclick="VV.Form.Global.ViewDocumentsModalDelete('${documentName}')" class="swal2-confirm swal2-styled">Delete</button>`;
  }
  if (documentButtons.includes("accept")) {
    // Determine the accept button attributes based on documentAccepted value
    let acceptButtonAttributes = documentAccepted === "Yes" ? 'disabled="disabled" style="opacity: 0.5;"' : "";
    // add to HTML
    documentButtonsHTML += `<button type="button" onclick="VV.Form.Global.ViewDocumentsModalAccept('${documentName}')" class="swal2-confirm swal2-styled" ${acceptButtonAttributes}>Accept</button>`;
  }
  if (documentButtons.includes("invalid")) {
    // add to HTML
    documentButtonsHTML += `<button type="button" onclick="VV.Form.Global.ViewDocumentsModalInvalid('${documentName}')" class="swal2-confirm swal2-styled">Invalid</button>`;
  }

  /* verify status */
  let showVerifyStatus = VV.Form.Global.isNullEmptyUndefined(options.showVerifyStatus) ? false : options.showVerifyStatus;

  let verifTextID = "accept" + documentID;
  let verifColor = "#f70606";
  let verifLabel = "Awaiting Acceptance";
  if (doc["document accepted"] == "Yes") {
    verifColor = "green";
    verifLabel = "Accepted";
  }
  let verifyStatusHTML = "";
  if (showVerifyStatus) {
    verifyStatusHTML = `<span id="${verifTextID}" style="color:${verifColor};">${verifLabel}</span><b>  |  </b>`;
  }

  // document metadata
  const rowPaddingBottom = "1rem"; // spacing between each row
  let documentMetadataHTML = `<div style="padding-bottom:${rowPaddingBottom};text-align:left">
      ${documentTypeHTML}
      <div><b>File Name:</b> ${fileName}</div>
      <div>
      ${verifyStatusHTML}
        <span><b>Upload Date:</b> ${uploadDate}</span>
      </div>
    </div>`;

  // build row
  let jQTableRow = $(
    `<tr name=${documentName}>
      <td style="width:17%">
        <div style="padding-bottom:${rowPaddingBottom};">
          <a class="swal2-confirm swal2-styled" style="text-decoration:none;" href="${documentURL}" target="_blank">Open</a>
        </div>
      </td>
      <td>${documentMetadataHTML}</td>
      <td>
        <div style="padding-bottom:${rowPaddingBottom};padding-right:0.5rem;text-align:right;">${documentButtonsHTML}</div>
      </td>
    </tr>`
  );

  // store data in ViewDocumentsModalDataMap for use in document button functions (e.g. ViewDocumentsModalDelete)
  VV.Form.Global.ViewDocumentsModalLastProperties.documentDataMap.set(documentName, {
    documentID,
    documentGUID,
    documentMetadataHTML,
  });

  return jQTableRow;
}

/**
 * Returns an instructions message template to use based on what is available in instructionsTemplateMap
 * @param {string} templateName The name of an instructions message template
 * @returns {string} An instructions message template
 */
function getInstructionsTemplate(templateName) {
  let template;
  if (instructionsTemplateMap[templateName]) {
    template = instructionsTemplateMap[templateName];
  } else {
    template = instructionsTemplateMap["default"];
  }

  return template;
}

}
