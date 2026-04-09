/**
 * VV.Form.Global.SignatoryDisableButtonByFieldName
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (fieldName) {
/**
 * Disables a VisualVault form button by its `vvfieldname` attribute
 * Used for signatories.
 *
 * This function locates an input element using the `vvfieldname`
 * attribute value, disables the control, and applies the
 * `k-state-disabled` CSS class to visually indicate the disabled state.
 *
 * If `fieldName` is null, undefined, or an empty string,
 * it defaults to "btnUploadDocumentation".
 *
 * @param {string|null|undefined} fieldName - The value of the `vvfieldname`
 *        attribute of the button to disable. Falls back to the default value
 *        when not provided.
 * @returns {void}
 */

// Default value if null/undefined/empty
const effectiveFieldName = fieldName || 'btnUploadDocumentation';

$('[vvfieldname="' + effectiveFieldName + '"]')
  .prop('disabled', true)
  .addClass('k-state-disabled');

}
