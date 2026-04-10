/**
 * VV.Form.Global.VerifySubFormRelationship
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
/*
    Script Name:   VerifySubFormRelationship
    Customer:      WADNR
    Purpose:       The purpose of this function is to verify that the sub-form is correctly
                   related to its Main Application parent. 

    Parameters:    No parameters are passed into this function.

    Return Value:  The promise object that will resolve if the relation is correct or was
                   successfully fixed, or reject with an error message if failed.

    Date of Dev:   04/01/2026
    Last Rev Date: 04/01/2026

    Revision Notes:
                   04/01/2026 - Matías: Initial creation of the function.
*/

const websvcName = "LibVerifySubFormRelationship";
const deferred = $.Deferred();

function getFieldNamesByFormID(formID) {
  const formPrefixMap = [
    { prefix: "Legal-Description-", relatedRecordId: "Related Record ID", formId: "Form ID" },
    { prefix: "Forest R-", relatedRecordId: "Related Record ID", formId: "Forest Roads ID" },
    { prefix: "Stream S-", relatedRecordId: "Related Record ID", formId: "Form ID" },
    { prefix: "WTM-", relatedRecordId: "Parent Record ID", formId: "WTMF ID" },
    { prefix: "Water Se-", relatedRecordId: "Related Record ID", formId: "Form ID" },
    { prefix: "CHAN-CHARAC-", relatedRecordId: "Related Record ID", formId: "Form ID" },
    { prefix: "Water Cr-", relatedRecordId: "FPAN ID", formId: "Water Crossings ID" },
    { prefix: "Typed Wa-", relatedRecordId: "Related Record ID", formId: "Typed Water ID" },
    { prefix: "Wetlands-", relatedRecordId: "Related Record ID", formId: "Form ID" },
    { prefix: "Timber-", relatedRecordId: "Related Record ID", formId: "Form ID" },
    { prefix: "S or F W-", relatedRecordId: "Related Record ID", formId: "S Or F Waters ID" },
    { prefix: "NP-Waters-", relatedRecordId: "Related Record ID", formId: "NP Waters ID" },
    { prefix: "CHEMICAL-INFORMATION-", relatedRecordId: "Related Record ID", formId: "Chemical Information ID" },
    { prefix: "Sensitive-Site-", relatedRecordId: "Related Record ID", formId: "Form ID" },
  ];

  const match = formPrefixMap.find((entry) => formID.startsWith(entry.prefix));

  if (!match) {
    throw new Error(`Form ID '${formID}' is not supported by VerifySubFormRelationship.`);
  }

  return match;
}

function displayErrorModal(messageData) {
  VV.Form.Global.DisplayModal({
    Title: "Error",
    Icon: "error",
    HtmlContent: messageData,
  });
}

try {
  const formID = VV.Form.DhDocID;
  const { relatedRecordId: relatedRecordIdField, formId: formIdField } = getFieldNamesByFormID(formID);

  const relatedRecordId = VV.Form.GetFieldValue(relatedRecordIdField);
  const subFormRevisionId = VV.Form.GetFieldValue(formIdField);

  const CallServerSide = function () {
    VV.Form.ShowLoadingPanel();

    const formData = [
      { name: "Related Record ID", value: relatedRecordId },
      { name: "Sub Form Revision ID", value: subFormRevisionId },
    ];

    const data = JSON.stringify(formData);
    const requestObject = $.ajax({
      type: "POST",
      url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${websvcName}`,
      contentType: "application/json; charset=utf-8",
      data: data,
    });

    return requestObject;
  };

  $.when(CallServerSide()).always(function (resp) {
    VV.Form.HideLoadingPanel();
    let messageData = "";
    let resolvePromise = false;

    if (typeof resp.status != "undefined") {
      messageData = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
      displayErrorModal(messageData);
    } else if (typeof resp.statusCode != "undefined") {
      messageData = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server. This may mean that the servers to run the business logic are not available.`;
      displayErrorModal(messageData);
    } else if (resp.meta.status == "200") {
      if (resp.data[0] !== "undefined") {
        if (resp.data[0] === "Success") {
          VV.Form.SetFieldValue("Relationship Verified", "True", true).then(() => {
            VV.Form.DoAjaxFormSave();
          });
          resolvePromise = true;
        } else if (resp.data[0] === "Error") {
          messageData = `An error was encountered. ${resp.data[1]}`;
          displayErrorModal(messageData);
        } else {
          messageData = `An unhandled response occurred when calling ${websvcName}. The form will not save at this time. Please try again or communicate this issue to support.`;
          displayErrorModal(messageData);
        }
      } else {
        messageData = "The status of the response returned as undefined.";
        displayErrorModal(messageData);
      }
    } else {
      messageData = `The following unhandled response occurred while attempting to retrieve data from ${websvcName}: ${resp?.data?.error}`;
      displayErrorModal(messageData);
    }

    if (resolvePromise) {
      deferred.resolve();
    } else {
      deferred.reject(messageData);
    }
  });
} catch (error) {
  displayErrorModal(error.message);
  deferred.reject(error.message);
}

return deferred.promise();
}
