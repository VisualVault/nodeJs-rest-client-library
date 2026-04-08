/**
 * VV.Form.Global.GetIndividualIdByUserId
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
//GetIndividualIdByUserId

function isNull(controlValue) {
    if (controlValue == '' || controlValue == null || controlValue == undefined || controlValue == 'Select Item') {
        return true;
    }
    return false;
}
// making it asynchronous
var deferred = $.Deferred();

var CallServerSide = function () {

    VV.Form.ShowLoadingPanel();
    //This gets all of the form fields.
    var formData = [];

    var FormInfo = {};
    FormInfo.name = 'REVISIONID';
    FormInfo.value = VV.Form.DataID;
    formData.push(FormInfo);

    var FormInfo = {};
    FormInfo.name = 'USERID';
    FormInfo.value = VV.Form.FormUserID;
    formData.push(FormInfo);

    //Following will prepare the collection and send with call to server side script.
    var data = JSON.stringify(formData);
    var requestObject = $.ajax({
        type: "POST",
        url: VV.BaseAppUrl + 'api/v1/' + VV.CustomerAlias + '/' + VV.CustomerDatabaseAlias + '/scripts?name=GetIndividualRecordId',
        contentType: "application/json; charset=utf-8",
        data: data,
        success: '',
        error: ''
    });

    return requestObject;
};

//VV.Form.ShowLoadingPanel();
$.when(
    CallServerSide()
).always(function (resp) {
    VV.Form.HideLoadingPanel();
    var messageData = '';
    if (typeof (resp.status) != 'undefined') {
        messageData = "A status code of " + resp.status + " returned from the server.  There is a communication problem with the  web servers.  If this continues, please contact the administrator and communicate to them this message and where it occurred.";
        VV.Form.HideLoadingPanel();
        VV.Form.Global.DisplayModal({ Icon: 'warning', HtmlContent: messageData });
    }
    else if (typeof (resp.statusCode) != 'undefined') {
        messageData = "A status code of " + resp.statusCode + " with a message of '" + resp.errorMessages[0].message + "' returned from the server.  This may mean that the servers to run the business logic are not available.";
        VV.Form.HideLoadingPanel();
        VV.Form.Global.DisplayModal({ Icon: 'warning', HtmlContent: messageData });
    }
    else if (resp.meta.status == '200') {
        if (resp.data[0] != 'undefined') {
            if (resp.data[0] == 'Success') {
                if (resp.data[1]) {
                    var individualId = resp.data[1];
                    if (individualId) {
                        VV.Form.SetFieldValue('Individual ID', individualId)
                    }
                } else {
                    messageData = 'The Individual ID returned was undefined.';
                    VV.Form.HideLoadingPanel();
                    VV.Form.Global.DisplayModal({ Icon: 'error', HtmlContent: messageData });
                }
                VV.Form.HideLoadingPanel();
                deferred.resolve(individualId)
            }
            else if (resp.data[0] == 'Error') {
                messageData = 'Individual Record not found for ' + VV.Form.FormUserID;
                VV.Form.HideLoadingPanel();
                VV.Form.Global.DisplayModal({ Icon: 'error', HtmlContent: messageData });
                deferred.reject(messageData);
            }
            else {
                messageData = 'An unhandled response occurred when calling GetIndividualRecordId. The form will not save at this time.  Please try again or communicate this issue to support.';
                VV.Form.HideLoadingPanel();
                VV.Form.Global.DisplayModal({ Icon: 'error', HtmlContent: messageData });
                deferred.reject(messageData);
            }
        }
        else {
            messageData = 'The status of the response returned as undefined.';
            VV.Form.HideLoadingPanel();
            VV.Form.Global.DisplayModal({ Icon: 'error', HtmlContent: messageData });
            deferred.reject(messageData);
        }
    }
    else {
        messageData = "The following unhandled response occurred while attempting to retrieve data on the the server side get data logic." + resp.data.error + '<br>';
        VV.Form.HideLoadingPanel();
        VV.Form.Global.DisplayModal({ Icon: 'error', HtmlContent: messageData });
        deferred.reject(messageData);
    }
})
return deferred.promise();
}
