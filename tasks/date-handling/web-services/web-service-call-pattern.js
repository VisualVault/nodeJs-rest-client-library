/* global VV, $ */
// PROCESS NAME for TEMPLATE NAME

const webServiceName = 'SCRIPTNAMEHERE';
const formName = 'Name of the form';
let message; // the message is set below

VV.Form.ShowLoadingPanel();

function CallServerSide() {
    // IF THE FORM IS TOO LARGE DON'T USE THE FOLLOWING LINE AND SEND ONLY DE DATA YOU NEED
    let formData = VV.Form.getFormDataCollection(); // Get all the form fields data

    // Uncomment the following to add more data to the formData object.
    // const moreData = {
    //    name: 'This is the name you will use on getFieldValueByName',
    //    value: "Here goes the value"
    // };
    // formData.push(moreData);

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
    if (typeof resp.status != 'undefined') {
        message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
    } else if (typeof resp.statusCode != 'undefined') {
        message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
    } else if (resp.meta.status == '200') {
        if (resp.data[0] != undefined) {
            if (resp.data[0] == 'Success') {
                message = `${formName} has been saved successfully.`;

                // HANDLE SUCCESS RESPONSE HERE

                // Alway use .then for waiting for the form to save before running another function
                VV.Form.DoAjaxFormSave().then(() => {
                    VV.Form.Global.DisplayMessaging(message, formName);
                    VV.Form.HideLoadingPanel();
                });
            } else if (resp.data[0] == 'Error') {
                message = `An error was encountered. ${resp.data[1]}`;
                VV.Form.Global.DisplayMessaging(message, formName);
                VV.Form.HideLoadingPanel();
            } else {
                message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
                VV.Form.Global.DisplayMessaging(message, formName);
                VV.Form.HideLoadingPanel();
            }
        } else {
            message = 'The status of the response returned as undefined.';
            VV.Form.Global.DisplayMessaging(message, formName);
            VV.Form.HideLoadingPanel();
        }
    } else {
        message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data.error} <br>`;
        VV.Form.Global.DisplayMessaging(message, formName);
        VV.Form.HideLoadingPanel();
    }
});
