/**
 * VV.Form.Global.CallLibStatusHistoryCreate
 * Parameters: 8
 * Extracted: 2026-04-10
 */
function (formType,fpanNumber,relatedRecordId,beforeStatusValue,statusChange,statusModifiedBy,statusModifiedDate,applicationReviewPageId) {
/**
 * CallLibStatusHistoryCreate global function
 * Calls LibStatusHistoryCreate to create a history record.
 *
 * @param {string} formType - The type of form being processed.
 * @param {string} fpanNumber - The FPAN Number associated with the form.
 * @param {string} relatedRecordId - Related Record ID.
 * @param {string} beforeStatusValue - The status value of the record before the change occurred.
 * @param {string} statusChange - The updated status or change applied to the record.
 * @param {string} statusModifiedBy - The user or system that modified the status.
 * @param {string} statusModifiedDate - The date and time when the status was modified.
 * @param {string|null} [applicationReviewPageId] - (Optional) ARP Form ID. Can be null.
 *
 * @returns {Promise} The promise object that will resolve with the response data if successful, or reject with an error message if failed.
 *
 * @throws {Error} Throws an error if any of the params is undefined.
 */

// Validate required params
const requiredParams = [
  formType,
  fpanNumber,
  relatedRecordId,
  beforeStatusValue,
  statusChange,
  statusModifiedBy,
  statusModifiedDate,
];

if (
  requiredParams.some((param) => typeof param === 'undefined' || param === null || param === '')
) {
  throw new Error('Required param missing.');
}

const webServiceName = 'LibStatusHistoryCreate';
const deferred = $.Deferred();

function CallServerSide() {
  VV.Form.ShowLoadingPanel();
  const formData = [
    { name: 'Form Type', value: formType },
    { name: 'FPAN Number', value: fpanNumber },
    { name: 'Related Record ID', value: relatedRecordId },
    { name: 'Before Status Value', value: beforeStatusValue },
    { name: 'Status Change', value: statusChange },
    { name: 'Status Modified By', value: statusModifiedBy },
    { name: 'Status Modified Date', value: statusModifiedDate },
  ];

  if (applicationReviewPageId) {
    formData.push({ name: 'Application Review Page ID', value: applicationReviewPageId });
  }

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
        VV.Form.Global.RefreshFormElements();
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
