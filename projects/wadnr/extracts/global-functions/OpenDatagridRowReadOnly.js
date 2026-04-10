/**
 * VV.Form.Global.OpenDatagridRowReadOnly
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (datagridName) {
// params: datagridName
if(VV.Form.Global.isNullEmptyUndefined(datagridName)) {
    let modalContent = `Datagrid name is missing.`
    VV.Form.Global.DisplayModal({
        Icon: 'error',
        Title: 'Error',
        HtmLContent: modalContent
    })

    return;
}

let href;

let datagrid = $(`[vvfieldname="${datagridName}"]`)[0]
let datagridRows = datagrid.getElementsByTagName("a")

if(datagridRows.length > 0) {
    for(let linkElement of datagridRows) {
        if(linkElement.classList.contains('grid-cell-link')) {
            href = linkElement.getAttribute('href');
            linkElement.setAttribute('href', `${href}&Mode=ReadOnly`)
        }
    }
}
}
