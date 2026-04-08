/**
 * VV.Form.Global.DatagridFindRows
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (datagridName) {
// datagridName is a string that is the name of the datagrid to setup selectable rows for.

// Array that will hold all GUID of selected rows in the datagrid.
var selectedRows = [];

// Select all rows in the passed in datagrid that have a class that shows they are selected.
$(`[vvfieldnamewrapper="${datagridName}"]`).each(function () {
  // Find the GUID.
  var strMatch = "DataID=";
  var indexStart = $(this).prop("innerHTML").indexOf("DataID=");
  
  //If DataID not found, also validate for formid as new dashboards use this field
  if(indexStart === -1){        
    indexStart = $(this).prop("innerHTML").indexOf("formid=");
  }

  if (indexStart !== -1) {
    var guid = $(this)
      .prop("innerHTML")
      .slice(indexStart + strMatch.length, indexStart + strMatch.length + 36);
    // Push GUID into array.
    selectedRows.push(guid);
  }
});

// Return the array of selected rows' GUIDs.
return selectedRows;
}
