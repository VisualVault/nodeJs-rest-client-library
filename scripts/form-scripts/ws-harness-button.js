/* global $ */
// DateTest WS Harness — Form Button Script
// Purpose: Calls the DateTestWSHarness web service with test parameters.
// Setup:   Add this as a form button script on the DateTest form (or a dedicated WS test form).
//          The form needs 5 text fields: WSAction, WSConfigs, WSRecordID, WSInputDate, WSResult.
//          WSResult should be a large textarea to display the JSON response.
//          The harness must be registered as a Microservice named "DateTestWSHarness".

const webServiceName = 'DateTestWSHarness';
const formName = 'DateTest WS Harness';
let message;

VV.Form.ShowLoadingPanel();

function CallServerSide() {
    // Get all form fields (includes the date fields the harness reads for WS-2)
    let formData = VV.Form.getFormDataCollection();

    // Inject test control parameters
    formData.push({ name: 'Action', value: VV.Form.GetFieldValue('WSAction') || '' });
    formData.push({ name: 'TargetConfigs', value: VV.Form.GetFieldValue('WSConfigs') || 'ALL' });
    formData.push({ name: 'RecordID', value: VV.Form.GetFieldValue('WSRecordID') || '' });
    formData.push({ name: 'InputDate', value: VV.Form.GetFieldValue('WSInputDate') || '' });
    formData.push({ name: 'InputFormats', value: VV.Form.GetFieldValue('WSInputFormats') || '' });

    return $.ajax({
        type: 'POST',
        url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(formData),
        success: '',
        error: '',
    });
}

$.when(CallServerSide()).always(function (resp) {
    if (typeof resp.status != 'undefined') {
        message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers.`;
    } else if (typeof resp.statusCode != 'undefined') {
        message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.`;
    } else if (resp.meta.status == '200') {
        if (resp.data != undefined) {
            const output = resp.data;

            if (output.status === 'Success' || output.status === 'Warning') {
                message = `${output.status}: ${output.data ? output.data.action : 'No action'} completed.`;

                // Display full JSON response in the result field
                VV.Form.SetFieldValue('WSResult', JSON.stringify(output, null, 2));

                if (output.errors && output.errors.length > 0) {
                    message += ` Warnings: ${output.errors.join('; ')}`;
                }
            } else if (output.status === 'Error') {
                message = `Error: ${output.errors ? output.errors.join('; ') : 'Unknown error'}`;
                VV.Form.SetFieldValue('WSResult', JSON.stringify(output, null, 2));
            } else {
                message = `Unhandled response from ${webServiceName}.`;
                VV.Form.SetFieldValue('WSResult', JSON.stringify(resp, null, 2));
            }
        } else {
            message = 'Response data was undefined.';
            VV.Form.SetFieldValue('WSResult', JSON.stringify(resp, null, 2));
        }
    } else {
        message = `Unhandled response: ${resp.data ? resp.data.error : 'unknown'}`;
        VV.Form.SetFieldValue('WSResult', JSON.stringify(resp, null, 2));
    }

    VV.Form.Global.DisplayMessaging(message, formName);
    VV.Form.HideLoadingPanel();
});
