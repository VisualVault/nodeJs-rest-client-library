/**
 * VV.Form.Global.SetRadioCheckbox
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (checkboxName, radioCheckboxNames) {
/* SetRadioCheckbox - Sets a checkbox and unchecks all other checkboxes in its group. Ideally used in a template function 
  with a single definition for the radio checkbox names

  Parameters: 
    checkboxName (String, Required)
    radioCheckboxNames (String[], Required) - Names of checkboxes in group. Should include the original checkboxName

  Return Value: (Promise) Resolves when the checkboxes in the group are set
*/

if (radioCheckboxNames.includes(checkboxName) === false) {
  throw new Error(`Checkbox ${checkboxName} not included in radio checkbox group`);
}

// uncheck other checkboxes in group only if the current one is being checked
const checkboxValue = VV.Form.GetFieldValue(checkboxName);
const setFieldValuePromises = [];
if (checkboxValue.toLowerCase() === 'true') {
  const evaluateGroupConditions = true;
  const raiseChangeEvents = false;
  radioCheckboxNames.forEach((radioCheckboxName) => {
    if (radioCheckboxName !== checkboxName) {
      setFieldValuePromises.push(VV.Form.SetFieldValue(radioCheckboxName, false, evaluateGroupConditions, raiseChangeEvents));
    }
  });
}

return Promise.all(setFieldValuePromises);
}
