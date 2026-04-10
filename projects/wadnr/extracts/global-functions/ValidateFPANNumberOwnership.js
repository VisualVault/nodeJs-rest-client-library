/**
 * VV.Form.Global.ValidateFPANNumberOwnership
 * Parameters: 4
 * Extracted: 2026-04-10
 */
function (fpanNumber, individualId, formId, isOfficeStaff, templateName = '') {
/*
    Script Name:    ValidateFPANNumberOwnership
    Customer:       WADNR
    Purpose:        Calls LibVerifyFPANNumberOwnership to validate the FPAN Number entered
                    and load the related data into the form if valid.

    Instructions:   This function is intended to be called from EnterValidFPANNumber after the user enters a valid FPAN Number.

    Parameters:     The following represent variables passed into the function:
                    fpanNumber - The FPAN Number entered by the user
                    individualId - The Individual ID of the person the FPAN Number is being validated for
                    formId - The Form ID of the child form (new form being filled out)
                    isOfficeStaff - Optional value to indicate if the user is office staff (true/false). Default is false.

    Return Value:   The following represents the value being returned from this function:
                    No data returned

    Date of Dev:    09/03/2025
    Last Rev Date:  03/30/2026

    Revision Notes:
                    09/03/2025 - Mauro Rapuano : First setup of the script.
                    01/16/2026 - Federico Cuelho: Update save and async behavior.
                    02/18/2026 - Zharich Barona: Setting Expiration Date of Approved FPAN for FPAN Renewal template.
                    03/30/2026 - Alfredo Scilabra: Update error handling message shown in displayInvalidFPANModal
*/

const webServiceName = 'LibVerifyFPANNumberOwnership';
let message; // the message is set below
const backToModal = () => VV.Form.Global.EnterValidFPANNumber();

function displayErrorModal(messageData) {
    VV.Form.Global.DisplayModal({
        Title: "Error",
        Icon: "error",
        HtmlContent: messageData,
    });
}

function displayInvalidFPANModal(title, messageData) {
    VV.Form.Global.DisplayModal({
        Title: title,
        Icon: "warning",
        HtmlContent: messageData,
        showCancelButton: false,
        ConfirmText: "Ok",
        okFunction: backToModal
    });
}

function CallServerSide() {
    VV.Form.ShowLoadingPanel();

    // IF THE FORM IS TOO LARGE DON'T USE THE FOLLOWING LINE AND SEND ONLY DE DATA YOU NEED
    let formData = [];//VV.Form.getFormDataCollection(); // Get all the form fields data

    // Uncomment the following to add more data to the formData object.
    let moreData = {
        name: 'FPAN_Number',
        value: fpanNumber
    };
    formData.push(moreData);
    moreData = {
        name: 'IndividualId',
        value: individualId
    };
    formData.push(moreData);

    moreData = {
        name: 'ChildFormID',
        value: formId
    };
    formData.push(moreData);

    moreData = {
        name: 'IsOfficeStaff',
        value: isOfficeStaff
    };
    formData.push(moreData);

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

return $.when(CallServerSide())
.always(function (resp) {
    VV.Form.HideLoadingPanel();

    if (typeof resp.status != 'undefined') {
        message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
    } else if (typeof resp.statusCode != 'undefined') {
        message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
    } else if (resp.meta.status == '200') {
        if (resp.data[0] != undefined) {
            if (resp.data[0] == 'Success') {
                const promiseArr = [
                    VV.Form.SetFieldValue("Relations Loaded In", "True"),
                    VV.Form.SetFieldValue("Region Project Information", resp.data[2]["Region"]),
                    VV.Form.SetFieldValue("Region", resp.data[2]["Region"], true, true),
                    VV.Form.SetFieldValue("Project Name", resp.data[2]["Project Name"]),
                    VV.Form.SetFieldValue("Related Record ID", resp.data[2]["relatedRecordId"])
                ];

                // HANDLE SUCCESS RESPONSE HERE
                Promise.all(promiseArr)
                .then(() => {
                    VV.Form.SetFieldValue("FPAN Number", resp.data[2]["fpanNumber"]);

                    // let DGControls = [
                    //     "DG Landowner Businesses",
                    //     "DG Original Landowner Businesses",
                    //     "DG Landowners",
                    //     "DG Timber Owner Businesses",
                    //     "DG Timber Owners",
                    //     "DG Original Landowner Business Signers",
                    //     "DG Original Landowners",
                    //     "DG Operator Businesses",
                    //     "DG Operators",
                    //     "Business Signers",
                    //     "DG Legal Description",
                    // ];
                    // DGControls.forEach((item) => {
                    //     VV.Form.RefreshDataGridControl(item);
                    // });
                })
                // If the template name of the root app is the FPAN, then populate the Long Term FPA Number (Step 2 requirement)
                .then(() => templateName === 'Forest Practices Application Notification' ? Promise.all([VV.Form.SetFieldValue('Long Term FPA Number', resp.data[2]["fpanNumber"])]) : Promise.resolve())
                .then(() => templateName === 'FPAN Renewal' ? Promise.all([VV.Form.SetFieldValue("Expiration Date Of Approved FPAN", resp.data[2]["Expiration Date"])]) : Promise.resolve())
                .then(() => VV.Form.DoAjaxFormSave())
                .then(() => {
                    VV.Form.Global.RefreshFormElements();
                });

            } else if (resp.data[0] == 'Error') {
                const title = 'The FPAN Number provided does not belong to the specified Proponent.';
                message = ` <div style="display: flex; align-items: center; justify-content: flex-start; text-align: left;">
                                <div>
                                    If you received this message after entering a valid FPA/N number, contact the applicable Region office to ensure the FPA/N is accessible from your user account.
                                </div>
                            </div>
                            `;
                displayInvalidFPANModal(title, message);
                VV.Form.HideLoadingPanel();
            } else {
                message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
                displayErrorModal(message);
                VV.Form.HideLoadingPanel();
            }
        } else {
            message = 'The status of the response returned as undefined.';
            displayErrorModal(message);
            VV.Form.HideLoadingPanel();
        }
    } else {
        message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data.error} <br>`;
        displayErrorModal(message);
        VV.Form.HideLoadingPanel();
    }
});

}
