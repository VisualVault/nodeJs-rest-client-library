/**
 * VV.Form.Global.DatagridFindSelectedRows
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (datagridName) {
// datagridName is a string that is the name of the datagrid to setup selectable rows for.

// Array that will hold all GUID of selected rows in the datagrid.
var selectedRows = []

// Select all rows in the passed in datagrid that have a class that shows they are selected.
$(`[vvfieldnamewrapper="${datagridName}"] .selected`).each(function () {

  // Find the GUID.
  var strMatch = "DataID="
  var indexStart = $(this).prop("innerHTML").indexOf("DataID=")
  
  //If DataID not found, also validate for formid as new dashboards use this field
  if(indexStart === -1){        
    indexStart = $(this).prop("innerHTML").indexOf("formid=");
  }

  if (indexStart !== -1) {
    var guid = $(this).prop("innerHTML").slice(indexStart + strMatch.length, indexStart + strMatch.length + 36)
    // Push GUID into array.
    selectedRows.push(guid)
  }
});

return selectedRows
}
