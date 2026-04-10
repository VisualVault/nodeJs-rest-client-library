/**
 * VV.Form.Global.CheckboxValidation
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (checkboxValueArray, checkboxArray, requiredNumber) {
const checkboxValidationResult = VV.Form.Global.CentralCheckboxValidation(checkboxValueArray, requiredNumber);

if(checkboxValidationResult){
    checkboxArray.forEach((checkbox) => VV.Form.ClearValidationErrorOnField(`${checkbox}`));
} else {
    checkboxArray.forEach((checkbox) => VV.Form.SetValidationErrorMessageOnField(`${checkbox}`, 'At least one Checkbox needs to be entered.'));
}

return checkboxValidationResult;
}
