/**
 * VV.Form.Global.DatagridCountRows
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (datagridName) {
// datagridName is a string that is the name of the datagrid to setup selectable rows for.

// Return the number of rows in a datagrid (Not includes GUID)
// If a datagird is readonly we dont have the GUID but sometimes we need to count elements
const selectedRows = [];

// Select all rows in the passed in datagrid that have a class that shows they are selected.
$(`[vvfieldnamewrapper="${datagridName}"]`).each(function () {
  const indexStart = $(this).prop("innerHTML").indexOf("kendogridcell");

  if (indexStart !== -1) {
    selectedRows.push('element');
  }
});

// Return the count of the datagrids elements
return selectedRows.length;
}
