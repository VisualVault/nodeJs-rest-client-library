/**
 * VV.Form.Global.RRCGetSelectedItemsfromFormButton
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (rrcName) {
/*
    Script Name:   RRCGetSelectedItemsfromFormButton
    Customer:      VisualVault
    Purpose:       Get list of selected records from an RRC.  This is called from a form button instead of an RRC button  
                   For this to work the RRC needs to be configured to show at least 1 button embedded into the RRC.  Otherwise the selection options are not available.
                   
    Parameters:    The following represent variables passed into the function:  
                   rrcName: Name of the RRC control
                   
    Return Value:  The following represents the value being returned from this function:
                   docIDs:  Array of Form IDs/Instance Names/Dhdocids that represent the forms selected.           
    Date of Dev:   
    Last Rev Date: 12/21/2021
    Revision Notes:
    12/13/2021 - Jason Hatch: Initial creation of the business process. 
*/

var rrcControl = $('[VVFieldName="' + rrcName + '"]')[0];
var rrcRows = rrcControl.childNodes[0].childNodes[4].childNodes[2].childNodes[1].childNodes[0].childNodes[0].childNodes[1].childNodes;
var selectedRows = [];
var docIDs = [];
var context = null;
var keepLooking = false;

// Loop through all the rows
for (var row = 0; row < rrcRows.length; row++) {
    if (rrcRows[row].nodeName == 'TR') {
        // Check if the row is selected
        if (rrcRows[row].getAttribute('class').includes('selected')) {
            // Add the row to the selected rows array
            selectedRows.push(rrcRows[row]);
        }
    }
}

// Loop through all the selected rows
for (var selectedRow = 0; selectedRow < selectedRows.length; selectedRow++) {
    keepLooking = true;
    // Get data context
    context = selectedRows[selectedRow]['__ngContext__'];

    // Loop through all the data context for the selected row
    for (var key = 0; key < context.length && keepLooking; key++) {
        // Check if the key is the document ID
        if (context[key] && typeof context[key] === 'object') {
            if (context[key].docId) {
                // Add the document ID to the docIDs array
                docIDs.push(context[key].docId);
                // Stop looking in this row and move on to the next row
                keepLooking = false;
            }
        }
    }
}

return docIDs;
}
