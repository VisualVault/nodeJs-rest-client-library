/* eslint-disable no-undef */
/*
    Script Name:   UnrelateForm
    Customer:      VisualVault
    Purpose:       Unrelate a previously related form record from the current form
                   via the REST API. This is the inverse of FillinAndRelateForm.

    Parameters:
      relateToId:       revisionId (GUID) of the form instance to unrelate from the current form.

    Returns:       Promise that resolves with the API response object ({ meta: { status, ... } })
                   or rejects with an error.

    Usage (from a form template script):
      // Unrelate a specific form by its revisionId
      VV.Form.Global.UnrelateForm('68a3947c-e538-f111-ba23-0e3ceb11fc25')
          .then((resp) => {
              if (resp.meta.status === 200) {
                  VV.Form.Global.DisplayMessaging('Form unrelated successfully.', 'Unrelate');
              } else {
                  VV.Form.Global.DisplayMessaging('Unrelate failed: ' + resp.meta.statusMsg, 'Unrelate');
              }
          })
          .catch((err) => {
              VV.Form.Global.DisplayMessaging('Error: ' + err.message, 'Unrelate');
          });

    Date of Dev: 04/15/2026
    Last Rev Date: 04/15/2026
    Revision Notes:
    04/15/2026 - Emanuel Jofre: Initial creation. API verified on vvdemo Build 20260304.1.

    API Reference:
      Endpoint:  PUT /forminstance/{formId}/unrelateForm?relateToId={targetId}
      Response:  { meta: { status: 200, statusMsg: "OK", method: "PUT", href: "..." } }
      Auth:      Bearer token from VV.Form.VV.currentUser.AccessToken
      Variants:  relateToDocId param also accepted (uses document ID instead of revision GUID)
*/

const currentUser = VV.Form.VV.currentUser;
const formId = VV.Form.DataID;

const apiBaseUrl = `${currentUser.ApiUrl}/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}`;
const url = `${apiBaseUrl}/forminstance/${formId}/unrelateForm?relateToId=${encodeURIComponent(relateToId)}`;

return fetch(url, {
    method: 'PUT',
    headers: {
        Authorization: `Bearer ${currentUser.AccessToken}`,
        'Content-Type': 'application/json',
    },
}).then((response) => {
    if (!response.ok) {
        throw new Error(`Unrelate failed with HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
});
