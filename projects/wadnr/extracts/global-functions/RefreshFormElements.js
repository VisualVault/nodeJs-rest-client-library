/**
 * VV.Form.Global.RefreshFormElements
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (optionObj) {
/*
    Script Name:   RefreshFormElement
    Purpose:       The purpose of this script is to refresh all form elements on a form and the parent form it has been launched from if it exists.
                   This is meant to be a zero config script that as forms are changed or can be opened from different forms this script will automatically
                   detect elements and refresh them.
                   Using optional parameters should only be used in edge cases.

    Parameters:    optionObj parameter. See example object below.

{
  //array of elements to refresh.Defaults to all.Options are RRC, Datagrid, Dropdown.Case insensitive matching.
  elementArr: [],
  // Refresh parent window elements. Defaults to true.
  refreshParent: false
}

    Date of Dev:   
    Last Rev Date: 04/16/2024
    Revision Notes:
    5/17/2023  - Rocky: Script created.
    5/24/2023  - Rocky: Code comments updated. 
    04/16/2024 - Kiefer Jackson: Fixed bug where optional parameters were not recognized, and fixed error with logic for checking parent form
    22/04/204  - Moises Savelli: Fixed bug Cross-Origin Resource Sharing errors (CORS).

*/

// Script variables.
let refreshParent = true;
let elementArr;
let refreshDatagrid = true;
let refreshRRC = true;
let refreshDropdown = true;

// Evaluate if the `optionObj` parameter has been passed in and assign values if so.
if (optionObj) {
  // REFRESH PARENT
  refreshParent = optionObj.hasOwnProperty('refreshParent') ? optionObj.refreshParent : refreshParent;

  // ELEMENT ARRAY
  elementArr = optionObj.hasOwnProperty('elementArr') && Array.isArray(optionObj.elementArr) ? optionObj.elementArr : null;
}

// If optional elements have been passed check which elements should be refreshed.
if (elementArr) {
  // Datagrid Check
  let includesDatagrid = elementArr.some((elem) => {
    return elem.toLowerCase() === "datagrid";
  });

  if (!includesDatagrid) {
    refreshDatagrid = false;
  }

  // RRC Check
  let includesRRC = elementArr.some((elem) => {
    return elem.toLowerCase() === "rrc";
  });

  if (!includesRRC) {
    refreshRRC = false;
  }

  // Dropdown Check
  let includesDropdown = elementArr.some((elem) => {
    return elem.toLowerCase() === "dropdown";
  });

  if (!includesDropdown) {
    refreshDropdown = false;
  }
}

//Refresh all Datagrids
let datagridNodeList = document.querySelectorAll('[vvfftype="26"]');

if (datagridNodeList.length && refreshDatagrid) {
  datagridNodeList.forEach((node) => {
    VV.Form.RefreshDataGridControl(node.getAttribute("vvfieldnamewrapper"));
  });
}

// Refresh all RRC
let rrcNodeList = document.querySelectorAll('[vvfftype="24"]');

if (rrcNodeList.length && refreshRRC) {
  rrcNodeList.forEach((node) => {
    VV.Form.ReloadRepeatingRowControl(node.getAttribute("vvfieldnamewrapper"));
  });
}

// Refresh all Dropdowns
let dropdownNodeList = document.querySelectorAll('[vvfftype="5"]');

if (dropdownNodeList.length && refreshDropdown) {
  dropdownNodeList.forEach((node) => {
    VV.Form.RefreshDropDownListControl(node.getAttribute("vvfieldnamewrapper"));
  });
}

// Check if a parent form exists and if it does call this global script without refreshing the parent to prevent a recursive loop.
let parentFormExists;

// check if a parent form exists and if it doesn't avoid Cross-Origin Resource Sharing errors (CORS)
try {
  parentFormExists = !!(window.opener?.VV?.Form?.DhDocID);
} catch (error) {
  parentFormExists = false;
}

if (parentFormExists && refreshParent) {
  window.opener.VV.Form.Global.RefreshFormElements({ refreshParent: false });
}
}
