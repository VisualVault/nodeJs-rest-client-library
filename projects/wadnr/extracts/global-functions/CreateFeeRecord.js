/**
 * VV.Form.Global.CreateFeeRecord
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (createFeeObj, openNewTab) {
/*
  Script Name:   CreateFeeRecord
  Customer:      PAELS
  Purpose:       Creates a Fee record from the system based on the field data provided

  Parameters:   createFeeObj (Object, required) - Object structured as a map, where each property is the 
                    source field name and the value is the destination field name for the Fee
                openNewTab (boolean) - Option to open the created Fee in a new tab or the same window. Defaults to true.

  Example usage: 
                VV.Form.Global.CreateFeeRecord({
                    "Provider ID": 'PROVIDER-######',
                    "Related Record ID": 'SOME-FORM-######',
                    "Related Record GUID": ''00000000-0000-0000-0000-000000000000',
                    "Status": 'Unpaid'
                }, true);

  Return Value:  NONE

  Date of Dev: 4/12/2024
  Last Rev Date: 4/12/2024
  Revision Notes:
  4/12/2024  - Kiefer Jackson: Script created
*/

const FEE_TEMPLATE_NAME = 'Fee';

const requiredFields = [
    "Provider ID",
    "Related Record ID",
    "Related Record GUID",
    "Status"
];

// Check that the create object for the Fee contains all of the required fields, and that they are all defined
const missingFields = requiredFields.filter((fieldName) => {
    const fieldProvided = createFeeObj.hasOwnProperty(fieldName);
    // Verify that the field value is defined, and otherwise return `true` to indicate the missing field
    const fieldIsUndefined = fieldProvided ? VV.Form.Global.isNullEmptyUndefined(createFeeObj[fieldName]) : true;
    return fieldIsUndefined;
});

if (missingFields.length > 0) {
    // Log the error to the console for debugging
    console.error(new Error(`${missingFields.join('/')} missing for ${FEE_TEMPLATE_NAME}:\n\t${JSON.stringify(createFeeObj)}`));

    // Display a modal listing the missing fields
    let missingFieldsHTML = `<p>Unable to create the ${FEE_TEMPLATE_NAME} because the following field${missingFields.length > 1 ? 's are' : ' is'} missing:</p><br/>`;
    missingFieldsHTML += ('<ul><li>' + missingFields.join('</li><li>') + '</li></ul>');
    displayErrorModal(missingFieldsHTML);

    // Return out of the function
    return;
}

VV.Form.ShowLoadingPanel();

// Create the Fee record, and set the callback function depending on whether the response was successful
let callbackFunction;
VV.Form.CreateFormInstance(FEE_TEMPLATE_NAME, createFeeObj).then((res) => {
    // If the record was successfully created, open it in a new tab
    // NOTE: `formId` is the newly created Fee's revision ID (GUID)
    if (res && res.formId) {
        callbackFunction = () => {
            // Get `xcid` and `xcdid` from this page's search parameters
            const pageParams = new URLSearchParams(window.location.search);

            // Define the URL for the created Fee record
            const openFeeURL = new URL(VV.BaseAppUrl + 'FormViewer/app');
            openFeeURL.searchParams.set('DataID', res.formId);
            openFeeURL.searchParams.set('hidemenu', true);
            openFeeURL.searchParams.set('xcid', pageParams.get('xcid'));
            openFeeURL.searchParams.set('xcdid', pageParams.get('xcdid'));

            // Determine whether the newly created Fee in a new tab is opened in a new tab or not, and then redirect to it
            // NOTE: Open in a new (blank) tab by default if no argument provided
            const launchTarget = (openNewTab == true || openNewTab == undefined) ? '_blank' : '_self';
            window.open(openFeeURL, launchTarget);
        }
    }
    else {
        throw new Error(`An error occurred while attemting to create the <strong>${FEE_TEMPLATE_NAME}</strong> record. Please try again or contact support if the issue persists.`);
    }
}).catch((error) => {
    // Create the error message, and display error to the user
    let messageData = error ? (error.message || JSON.stringify(error)) : `An unexpected error was returned when creating the <strong>${FEE_TEMPLATE_NAME}</strong> record.`;
    callbackFunction = () => displayErrorModal(messageData);
}).finally(() => {
    // Hide the loading panel, and pass it the callback function depending on the success/failure of the response
    VV.Form.HideLoadingPanel(callbackFunction);
});

function displayErrorModal(messageData) {
    VV.Form.Global.DisplayModal({
        Title: "Error",
        Icon: "error",
        HtmlContent: messageData,
    });
}
}
