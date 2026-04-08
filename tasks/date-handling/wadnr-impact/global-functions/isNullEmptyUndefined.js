/**
 * VV.Form.Global.isNullEmptyUndefined
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (param) {
/**
 * Checks whether the given parameter is null, empty, or undefined. If the parameter is a string, it is
 * checked for specific empty values. If the parameter is an array or object, it is checked for empty values.
 * @param {*} param - The parameter to check for null, empty, or undefined values.
 * @returns {boolean} Returns true if the parameter is null, empty, or undefined, otherwise returns false.
 */
    if (param === null || param === undefined) {
      return true;
    }
    const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //Slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
    switch (dataType) {
      case "string":
        if (param.trim().toLowerCase() === "select item" || param.trim().toLowerCase() === "null" || param.trim().toLowerCase() === "undefined" || param.trim() === "") {
          return true;
        }
        break;
      case "array":
        if (param.length === 0) {
          return true;
        }
        break;
      case "object":
        if (Object.keys(param).length === 0) {
          return true;
        }
        break;
      default:
        return false;
    }
    return false;
}
