/**
 * VV.Form.Global.GetInstructions
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (process) {
// GetInstructions Global Function
// params: 
//   process: String OR 
//   process: Array - [{name: param, value: param}]

const webServiceName = 'LibInstructionTemplateGetInstructions';

VV.Form.ShowLoadingPanel();

function CallServerSide() {
    // IF THE FORM IS TOO LARGE DON'T USE THE FOLLOWING LINE AND SEND ONLY DE DATA YOU NEED
    let formData = []
    let moreData = {}

    if(Array.isArray(process)) {
        formData = process;
    } else { 
      formData = VV.Form.getFormDataCollection(); // Get all the form fields data
      moreData = {
        name: 'Process',
        value: process
     };
     formData.push(moreData);
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

$.when(CallServerSide())
    .always(function (resp) {
        let message = ''; // the message is set below
        let icon = ''; // this icon appears on the popup message. The icon is set below
        let title = ''; // the title is set below

        if (typeof resp.status != 'undefined') {
            message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
        } else if (typeof resp.statusCode != 'undefined') {
            message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
        } else if (resp.meta.status == '200') {
            if (resp.data[0] != undefined) {
                if (resp.data[0] == 'Success') {

                    // HANDLE SUCCESS RESPONSE HERE
                    
                    for (const instruction of resp.data[2]) {
                        VV.Form.SetFieldValue(instruction["Field Name"], instruction["Instruction Text"], false);                            
                    }
                    
                    // Alway use .then for waiting for the form to save before running another function

                } else if (resp.data[0] == 'Error') {
                    title = resp.data[1];
                    icon = 'error';
                    message = `
                        An error was encountered.<br><br>
                        ${resp.data[2]}`;
                } else {
                    title = resp.data[1];
                    icon = 'error';
                    message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
                }
            } else {
                message = 'The status of the response returned as undefined.';
            }
        } else {
            message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data.error} <br>`;
        }

    if (message !== "") {
        VV.Form.Global.DisplayModal({
            Title: title,
            Icon: icon,
            HtmlContent: message,
          });
    }
        VV.Form.HideLoadingPanel();

    });

}
