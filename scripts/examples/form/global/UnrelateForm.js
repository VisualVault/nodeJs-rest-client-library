/* eslint-disable no-undef */
/*
    Script Name:   UnrelateForm
    Customer:      VisualVault
    Purpose:       Unrelate the current (child) form from a parent form and close the
                   child window/tab. This is the inverse of FillinAndRelateForm —
                   designed to be called from the child form's button script.

    Parameters:
      relateToId:       revisionId (GUID) of the parent form to unrelate from.
                        If omitted, queries the related forms list and unrelates
                        from the first (most recently related) parent.

    Returns:       Promise that resolves after unrelating and closing, or rejects with an error.

    Usage (from a child form template button script):
      // Unrelate from a known parent and close
      VV.Form.Global.UnrelateForm('68a3947c-e538-f111-ba23-0e3ceb11fc25');

      // Auto-detect the parent (unrelates from the first related form)
      VV.Form.Global.UnrelateForm();

    Date of Dev: 04/15/2026
    Last Rev Date: 04/16/2026
    Revision Notes:
    04/15/2026 - Emanuel Jofre: Initial creation. API verified on vvdemo Build 20260304.1.
    04/16/2026 - Emanuel Jofre: Add auto-detect parent, close window after unrelate.

    API Reference:
      Endpoint:  PUT /forminstance/{formId}/unrelateForm?relateToId={targetId}
      Response:  { meta: { status: 200, statusMsg: "OK", method: "PUT", href: "..." } }
      Auth:      Bearer token from VV.Form.VV.currentUser.AccessToken
      Variants:  relateToDocId param also accepted (uses document ID instead of revision GUID)
*/

const currentUser = VV.Form.VV.currentUser;
const formId = VV.Form.DataID;
const apiBaseUrl = `${currentUser.ApiUrl}/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}`;

const headers = {
    Authorization: `Bearer ${currentUser.AccessToken}`,
    'Content-Type': 'application/json',
};

function getParentId() {
    if (typeof relateToId !== 'undefined' && relateToId) {
        return Promise.resolve(relateToId);
    }
    return fetch(`${apiBaseUrl}/forminstance/${formId}/forms`, { headers })
        .then(function (resp) {
            if (!resp.ok) {
                throw new Error('Failed to fetch related forms: HTTP ' + resp.status);
            }
            return resp.json();
        })
        .then(function (json) {
            if (!json.data || json.data.length === 0) {
                throw new Error('No related forms found — nothing to unrelate from.');
            }
            return json.data[0].revisionId;
        });
}

return getParentId()
    .then(function (parentId) {
        var url = apiBaseUrl + '/forminstance/' + formId + '/unrelateForm?relateToId=' + encodeURIComponent(parentId);
        return fetch(url, { method: 'PUT', headers: headers });
    })
    .then(function (response) {
        if (!response.ok) {
            throw new Error('Unrelate failed with HTTP ' + response.status + ': ' + response.statusText);
        }
        return response.json();
    })
    .then(function (json) {
        if (json.meta && json.meta.status === 200) {
            window.close();
        } else {
            throw new Error('Unrelate returned unexpected status: ' + (json.meta && json.meta.statusMsg));
        }
    })
    .catch(function (err) {
        VV.Form.Global.DisplayMessaging('UnrelateForm error: ' + err.message, 'Unrelate');
    });
