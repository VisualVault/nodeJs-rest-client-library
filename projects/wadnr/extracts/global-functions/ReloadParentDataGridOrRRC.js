/**
 * VV.Form.Global.ReloadParentDataGridOrRRC
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (controlType, controlName) {
//ReloadParentDataGridOrRRC for Global
let parentFormExists = !!(window.opener && window.opener.VV && window.opener.VV.Form.DhDocID);

if (parentFormExists) {
    if (controlType == 'RRC') {
        window.opener.VV.Form.ReloadRepeatingRowControl(controlName);
    } else if (controlType == 'DG') {
        window.opener.VV.Form.RefreshDataGridControl(controlName);
    }
}
}
