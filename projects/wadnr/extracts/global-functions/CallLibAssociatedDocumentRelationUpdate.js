/**
 * VV.Form.Global.CallLibAssociatedDocumentRelationUpdate
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (formID, formTemplateType, sensitiveSite) {
/**
 * CallLibAssociatedDocumentRelationUpdate global function
 * Calls LibAssociatedDocumentRelationUpdate to update document status.
 *
 * @param {string} formID  - This is the Form ID of the application where the status was updated.
 * @param {string} formTemplateType - This will be the name of the form template of the application.
 * @param {bool} sensitiveSite - Is a sensitive site.
 * @returns {Promise} The promise object that will resolve with the response data if successful, or reject with an error message if failed.
 *
 * @throws {Error} Throws an error if any of the params is undefined.
 */

const requiredParams = [formID, formTemplateType, sensitiveSite];

if (
  requiredParams.some((param) => typeof param === 'undefined' || param === null || param === '')
) {
  throw new Error('Required param missing.');
}

const webServiceName = 'LibAssociatedDocumentRelationUpdate';
const deferred = $.Deferred();

function CallServerSide() {
  VV.Form.ShowLoadingPanel();
  const formData = [
    { name: 'Form ID', value: formID },
    { name: 'Form Template Type', value: formTemplateType },
    { name: 'Sensitive Site', value: sensitiveSite ? 'True' : 'False' },
  ];

  // Parse the data as a JSON string
  const data = JSON.stringify(formData);

  const requestObject = $.ajax({
    type: 'POST',
    url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
    contentType: 'application/json; charset=utf-8',
    data: data,
    success: '',
    error: '',
  });

  return requestObject;
}

$.when(CallServerSide()).always(function (resp) {
  let message;
  VV.Form.HideLoadingPanel();
  if (typeof resp.status != 'undefined') {
    message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
  } else if (typeof resp.statusCode != 'undefined') {
    message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
  } else if (resp.meta.status == '200') {
    if (resp.data[0] != undefined) {
      if (resp.data[0] === 'Success') {
        deferred.resolve(resp.data);
      } else {
        message = `Some errors ocurred while attempting to retrieve data on the server side get data logic. ${resp.data[2]} <br>`;
      }
    } else {
      message = 'The status of the response returned as undefined.';
    }
  } else {
    message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data.error} <br>`;
  }
  deferred.reject(message);
});

return deferred.promise();

}
