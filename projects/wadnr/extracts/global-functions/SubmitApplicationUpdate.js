/**
 * VV.Form.Global.SubmitApplicationUpdate
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
// LibUpdateApplicationReviewPage for FPAN Renewal

const webServiceName = "LibUpdateApplicationReviewPage";
let message; // the message is set below
let deferred = $.Deferred();

VV.Form.ShowLoadingPanel();

function CallServerSide() {
  // Get application type from FPAN Number
  let applicationType;

  return VV.Form.CustomQuery(
    "zLookup Application Type By FPAN",
    VV.Form.GetFieldValue("FPAN Number")
  ).then((res) => {
    if (
      !Array.isArray(res) ||
      res.length === 0 ||
      !res[0]["application Type"]
    ) {
      throw new Error("No Application Type found for the given FPAN Number.");
    }

    applicationType = res[0]["application Type"];

    let formData = [
      { name: "Form ID", value: VV.Form.GetFieldValue("Form ID") },
      {
        name: "Region",
        value: !VV.Form.GetFieldValue("Form ID").startsWith("LT-5DN")
          ? VV.Form.GetFieldValue("Region")
          : VV.Form.GetFieldValue("Region Project Information"),
      },
      { name: "FPAN Number", value: VV.Form.GetFieldValue("FPAN Number") },
      { name: "Application Type", value: applicationType },
      { name: "Update Client Side", value: "yes" },
    ];

    // Parse the data as a JSON string
    const data = JSON.stringify(formData);

    // Return the AJAX request's promise
    return $.ajax({
      type: "POST",
      url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
      contentType: "application/json; charset=utf-8",
      data: data,
    });
  });
}

$.when(CallServerSide())
  .always(function (resp) {
    let resolvePromise = false;
    let data = {};

    if (typeof resp.status != "undefined") {
      message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
    } else if (typeof resp.statusCode != "undefined") {
      message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
    } else if (resp.meta.status == "200") {
      if (resp.data[0] != undefined) {
        if (resp.data[0] == "Success") {
          message = `The application has been saved successfully.`;

          // HANDLE SUCCESS RESPONSE HERE
          resolvePromise = true;

          data = resp.data[2];

        } else if (resp.data[0] == "Error") {
          message = `An error was encountered. ${resp.data[1]}`;
          VV.Form.HideLoadingPanel();
          VV.Form.Global.DisplayModal({
            Title: "Error",
            Icon: "error",
            HtmlContent: message,
          });
        } else {
          message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
          VV.Form.HideLoadingPanel();
          VV.Form.Global.DisplayModal({
            Title: "Error",
            Icon: "error",
            HtmlContent: message,
          });
        }
      } else {
        message = "The status of the response returned as undefined.";
        VV.Form.HideLoadingPanel();
        VV.Form.Global.DisplayModal({
          Title: "Error",
          Icon: "error",
          HtmlContent: message,
        });
      }
    } else {
      message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data.error} <br>`;
      VV.Form.HideLoadingPanel();
      VV.Form.Global.DisplayModal({
        Title: "Error",
        Icon: "error",
        HtmlContent: message,
      });
    }

    // resolve/reject promise
    if (resolvePromise) {
      Promise.all([
        VV.Form.SetFieldValue("Status", "Received", true, false),
        VV.Form.SetFieldValue("Date of Receipt", data["Date of Receipt"]),
        VV.Form.SetFieldValue("Received Date", data["Date of Receipt"]),
      ]).then(() => {
        VV.Form.DoAjaxFormSave()
        .then(() => {
          VV.Form.HideLoadingPanel();
          VV.Form.Global.DisplayModal({
            Title: "Form Submitted",
            Icon: "success",
            HtmlContent: message,
          });
        });
      })
      .then(() => deferred.resolve(message));
    } else {
      deferred.reject(message);
    }
  })
  .fail(function (error) {
    VV.Form.HideLoadingPanel();
    VV.Form.Global.DisplayModal({
      Title: "Lookup Failed",
      Icon: "error",
      HtmlContent: `There was a problem retrieving the Application Type based on the FPAN Number.<br><br><b>Details:</b> ${
        error.message || error.statusText || error
      }`,
    });
  });

  return deferred.promise();
}
