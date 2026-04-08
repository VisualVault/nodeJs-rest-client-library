/**
 * VV.Form.Global.LoadInFPANRelations
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
/*
    Script Name:   LoadInFPANRelations for FPAN/FPAN-related Forms
    Purpose:       Use Related Record ID from FPAN-related forms to relate contact information to child forms

    Parameters:    none

    Return Value:  A promise that resolves when standard header information is set and the form is saved*

    Date of Dev:   --/--/----
    Revision Notes:
    --/--/---- - Previous contributors: Initial revision
    03/25/2026 - John Sevilla: Make the global return a promise. Fix sequencing of success promise chain
*/
const webServiceName = "LibFPANGetRelatedData";
const deferred = $.Deferred();
let message;

function CallServerSide() {
  VV.Form.ShowLoadingPanel();
  // IF THE FORM IS TOO LARGE DON'T USE THE FOLLOWING LINE AND SEND ONLY DE DATA YOU NEED
  let formData = VV.Form.getFormDataCollection(); // Get all the form fields data

  // Uncomment the following to add more data to the formData object.
  let moreData = {
    name: "relatedRecordID",
    value: VV.Form.GetFieldValue("FPAN Number"),
  };
  formData.push(moreData);

  moreData = {
    name: "Form ID",
    value: VV.Form.GetFieldValue("Top Form ID"),
  };
  formData.push(moreData);

  // Parse the data as a JSON string
  const data = JSON.stringify(formData);

  const requestObject = $.ajax({
    type: "POST",
    url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
    contentType: "application/json; charset=utf-8",
    data: data,
    success: "",
    error: "",
  });

  return requestObject;
}

$.when(CallServerSide()).always(function (resp) {
  VV.Form.HideLoadingPanel();
  let rejectPromiseImmediately = true;
  if (typeof resp.status != "undefined") {
    message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
  } else if (typeof resp.statusCode != "undefined") {
    message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
  } else if (resp.meta.status == "200") {
    if (resp.data[0] != undefined) {
      if (resp.data[0] == "Success") {
        // HANDLE SUCCESS RESPONSE HERE
        message = "Form has been saved successfully.";
        rejectPromiseImmediately = false;

        // Alway use .then for waiting for the form to save before running another function
        Promise.all([
          VV.Form.SetFieldValue("Relations Loaded In", "True"),
          VV.Form.SetFieldValue(
            "Region Project Information",
            resp.data[2]["Region"]
          ),
          VV.Form.SetFieldValue("Region", resp.data[2]["Region"]),
          VV.Form.SetFieldValue("Project Name", resp.data[2]["Project Name"]),
          VV.Form.SetFieldValue("Class of Forest Practice", resp.data[2]["FPAN Classification"]),
        ]).then(() => {
          VV.Form.Global.RefreshFormElements();
          return VV.Form.DoAjaxFormSave();
        }).then(() => {
          deferred.resolve();
        }).catch((error) => {
          deferred.reject(error);
        });
      } else if (resp.data[0] == "Error") {
        message = `An error was encountered. ${resp.data[1]}`;
        displayErrorModal(message);
      } else {
        message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
        displayErrorModal(message);
      }
    } else {
      message = "The status of the response returned as undefined.";
      displayErrorModal(message);
    }
  } else {
    message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data.error} <br>`;
    displayErrorModal(message);
  }

  // reject promise if not handled elsewhere
  if (rejectPromiseImmediately) {
    deferred.reject(message);
  }
});

function displayErrorModal(messageData) {
  VV.Form.Global.DisplayModal({
    Title: "Error",
    Icon: "error",
    HtmlContent: messageData,
  });
}

return deferred.promise();
}
