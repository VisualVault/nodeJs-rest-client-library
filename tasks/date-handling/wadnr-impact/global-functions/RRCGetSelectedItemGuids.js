/**
 * VV.Form.Global.RRCGetSelectedItemGuids
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (rrcConfig) {
/*
       Script Name:   RRCGetSelectedItemGuids
       Customer:      VisualVault
       Purpose:       Get list of selected records from an RRC. Return an array of dataIds.            
       Parameters:    
           rrcConfig: Configuration object that must contain the following properties:
                      RRCName: Name of the RRC control.
                      MaxRows (optional): Maximum number of rows that can be selected. Default value is 20.
       Return Value:  
           docIDs:  Array of data IDs of the selected forms.           
       Date of Dev:   
       Last Rev Date:  3/1/2023
       Revision Notes:
       3/1/2023 - Brian Davis - Initial Creation of Global Script 
   */
var rrcConfig;
var maxRows = 20;
var titleText = "An unknown error occurred.";
var messageText = "";
var rrcControl = {};
var rrcRows = [];
var selectedRows = [];
var formGuids = [];
var context = null;
var keepLooking = false;
var error = new Error();

//Helper Function that checks whether the passed-in parameter is null, undefined, an empty string, the string 'Select Item', or of type undefined.
function isNullOrUndefined(param) {
  if (param == "" || param == null || param == undefined || param == "Select Item" || typeof param === "undefined") {
    return true;
  }
  return false;
}
try {
  // Check if rrcConfig Object is undefined. If so notify user.
  if (isNullOrUndefined(rrcConfig)) {
    messageText = "No rrcConfig Object was passed into the function.";
    titleText = "No rrcConfig Object";
    throw error;
  }
  //Check if the rrcConfig.RRCName was included in the rrcConfig Object.
  if (isNullOrUndefined(rrcConfig.RRCName)) {
    messageText = "No RRCName was included in the rrcConfig Object.";
    titleText = "No RRCName Property";
    throw error;
  } else {
    rrcControl = $('[VVFieldName="' + rrcConfig.RRCName + '"]')[0];
    maxRows = rrcConfig.MaxRows || maxRows; //If rrcConfig.MaxRows is null or empty set to default value.
    rrcRows = rrcControl.childNodes[0].childNodes[4].childNodes[2].childNodes[1].childNodes[0].childNodes[0].childNodes[1].childNodes;
  }
  // Loop through all the rows
  rrcRows.forEach(function (row) {
    if (row.nodeName == "TR") {
      if (row.getAttribute("class").includes("selected")) {
        selectedRows.push(row);
      }
    }   
  });
  //Check if rows were selected.
  if (selectedRows.length == 0) {
    messageText = "No records have been selected. Please select at least 1 record to perform this task.";
    titleText = "No Records Selected";
    throw error;
  }
  // Loop through all the selected rows
  for (var selectedRow = 0; selectedRow < selectedRows.length; selectedRow++) {
    //Check if the selectedRows exceed the maxRows Threshold. If they exceed the threshold notify the user.
    if (selectedRows.length > maxRows) {
      messageText = `Please limit your selection to <b>[${maxRows}]</b> records as this exceeds the maximum threshold allowed.`;
      titleText = "Maximum Rows";
      throw error;
    }
    keepLooking = true;
    // Get data context
    context = selectedRows[selectedRow]["__ngContext__"];
    // Loop through all the data context for the selected row
    for (var key = 0; key < context.length && keepLooking; key++) {
      // Check if the key is the data ID
      if (context[key] && typeof context[key] === "object") {
        if (context[key].dataId) {
          // Add the data ID to the formGuids array
          formGuids.push(context[key].dataId);
          // Stop looking in this row and move on to the next row
          keepLooking = false;
        }
      }
    }
  }
} catch (error) {
  VV.Form.Global.DisplayModal({ Icon: "error", Title: titleText, HtmlContent: messageText });
}

return formGuids;
}
