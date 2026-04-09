/**
 * VV.Form.Global.GetSelectRows
 * Parameters: 1
 * Extracted: 2026-04-09
 */
function (rccName) {
var rrcRows = $('[VVFieldName="' + rccName + '"]')[0].childNodes[0].childNodes[4].childNodes[2].childNodes[1].childNodes[0].childNodes[0].childNodes[1]
    .childNodes;

var selectedRows = [];

for (var row = 0; row < rrcRows.length; row++) {
    if (rrcRows[row].nodeName == 'TR') {
        if (rrcRows[row].getAttribute('class').includes('selected')) {
            selectedRows.push(rrcRows[row]);
        }
    }
}

var context;
var docIDs = [];
var keepLooking;

for (var selectedRow = 0; selectedRow < selectedRows.length; selectedRow++) {
    context = selectedRows[selectedRow]['__ngContext__'];
    keepLooking = true;

    for (var key = 0; key < context.length && keepLooking; key++) {
        if (context[key] && typeof context[key] === 'object') {
            if (context[key].docId) {
                docIDs.push(context[key].docId);
                keepLooking = false;
            }
        }
    }
}

return docIDs;
}
