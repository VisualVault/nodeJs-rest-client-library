/**
 * VV.Form.Global.GetCurrentIndividual
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
let websvcName = "LibFormGetCurrentIndividual";

let deferred = $.Deferred();
let CallServerSide = function () {
  VV.Form.ShowLoadingPanel();
  let formData = [];

  let formInfo = {};
  formInfo.name = "USERID";
  formInfo.value = VV.Form.FormUserID;
  formData.push(formInfo);

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
  let resolvePromise = false;
  if (typeof resp.status != "undefined") {
    messageData = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
    displayErrorModal(messageData);
  } else if (typeof resp.statusCode != "undefined") {
    messageData = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server. This may mean that the servers to run the business logic are not available.`;
    displayErrorModal(messageData);
  } else if (resp.meta.status == "200") {
    if (resp.data[0] != "undefined") {
      if (resp.data[0] == "Success") {
        resolvePromise = true;
        let individualData = resp.data[2];
        window.sessionStorage.setItem('Current Individual', JSON.stringify(individualData))
        deferred.resolve(individualData)
      } else if (resp.data[0] == "Error") {
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
   // reject promise
   if (resolvePromise === false) {
    deferred.reject(messageData);
  }
});

return deferred;

function displayErrorModal(messageData) {
  VV.Form.Global.DisplayModal({
    Title: "Error",
    Icon: "error",
    HtmlContent: messageData,
  });
}

}
