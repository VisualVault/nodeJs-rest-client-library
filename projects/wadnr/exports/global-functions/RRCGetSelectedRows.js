/**
 * VV.Form.Global.RRCGetSelectedRows
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (gridControl, expandRowData) {
// RRGetSelectedRows for Global - Returns an array of dataIds (revisionIds) from all the currently-selected rows.
// Params:
// gridControl: The 'control' parameter from the RRC_onClick event
// expandRowData: Optional. If true then the function returns an array of objects with all the data of each row (including 'docId')
var selectedRows = gridControl.selectedRows;
var returnList;
if (expandRowData) {
    returnList = selectedRows;
} else {
    returnList = selectedRows.map(row => row['dataId']);
}
return returnList;
}
