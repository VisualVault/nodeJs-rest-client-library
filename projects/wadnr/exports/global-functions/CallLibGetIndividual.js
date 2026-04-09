/**
 * VV.Form.Global.CallLibGetIndividual
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (userID) {
/**
 * CallLibGetIndividual global function
 * Calls LibGetIndividual to retrieve individual data based on the provided user ID.
 *
 * @param {string} userID - The user ID to send to the server for retrieving individual data. This is a required parameter.
 * @returns {Promise} The promise object that will resolve with the response data if successful, or reject with an error message if failed.
 *
 * @throws {Error} Throws an error if the userID is undefined or not a valid string.
 */

if (typeof userID !== 'string' || userID.trim() === '') {
  throw new Error('The userID must be a non-empty string.');
}

const websvcName = 'LibGetIndividual';
const deferred = $.Deferred();
const CallServerSide = function () {
  VV.Form.ShowLoadingPanel();

  // Create the form data to send to the microservice
  const formData = [
    {
      name: 'User ID',
      value: userID,
    },
  ];

  // Convert form data to JSON and prepare the server-side call
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
  let messageData = '';
  let resolvePromise = false;
  let callData = {};
  if (typeof resp.status != 'undefined') {
    messageData = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
    displayErrorModal(messageData);
  } else if (typeof resp.statusCode != 'undefined') {
    messageData = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server. This may mean that the servers to run the business logic are not available.`;
    displayErrorModal(messageData);
  } else if (resp.meta.status == '200') {
    if (resp.data[0] !== 'undefined') {
      if (resp.data[0] === 'Success') {
        resolvePromise = true;
        callData = resp.data[2];
      } else if (resp.data[0] === 'Error') {
        messageData = `An error was encountered. ${resp.data[1]}`;
        displayErrorModal(messageData);
      } else {
        messageData = `An unhandled response occurred when calling ${websvcName}. The form will not save at this time. Please try again or communicate this issue to support.`;
        displayErrorModal(messageData);
      }
    } else {
      messageData = 'The status of the response returned as undefined.';
      displayErrorModal(messageData);
    }
  } else {
    messageData = `The following unhandled response occurred while attempting to retrieve data from ${websvcName}: ${resp?.data?.error}`;
    displayErrorModal(messageData);
  }
  // resolve/reject promise
  if (resolvePromise) {
    deferred.resolve(callData);
  } else {
    deferred.reject(messageData);
  }
});

function displayErrorModal(messageData) {
  VV.Form.Global.DisplayModal({
    Title: 'Error',
    Icon: 'error',
    HtmlContent: messageData,
  });
}

return deferred.promise();

}
