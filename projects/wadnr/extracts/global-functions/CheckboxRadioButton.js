/**
 * VV.Form.Global.CheckboxRadioButton
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (focusedCheckbox, clearCheckboxesArray) {
// params:
//  - focusedCheckbox (String) The selected checkbox
//  - clearCheckboxesArray (Array) The checkboxes not selected

clearCheckboxesArray.forEach(clearCheckboxes => { //Use forEach helper to loop through checkboxes
    VV.Form.SetFieldValue(clearCheckboxes, 'false'); //Set the other checkboxes to false
})
}
