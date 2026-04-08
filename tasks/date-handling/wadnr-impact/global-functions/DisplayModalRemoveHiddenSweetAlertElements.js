/**
 * VV.Form.Global.DisplayModalRemoveHiddenSweetAlertElements
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
/*
    Script Name:   DisplayModalRemoveHiddenSweetAlertElements
    Customer:      PAELS
    Purpose:       The purpose of this process is to Removes hidden elements from SweetAlert2 modals.This            function targets specific SweetAlert2 classes that could be hidden and removes them.
                   It's designed to keep the modal content clean and relevant by removing any elements 
                   that are not displayed to the user.
                   Also, it’s for accessibility reasons; elements that are hidden pose accessibility issues. WAVE detects them as errors.
    Parameters:   None
    Date of Dev:   
    Last Rev Date: 4/10/2024
    Revision Notes:
    4/10/2024  - Moises Savelli: Script created.
*/

/**
 * Removes elements of a given class that are hidden.
 * @param {string} className - The class name to target elements that might be hidden.
*/

  /* -------------------------------------------------------------------------- */
  /*                              Helper Functions                              */
  /* -------------------------------------------------------------------------- */
  
  function markAndModifyHiddenElementsByClass(className) {
    const elements = document.querySelectorAll(`.${className}[style*="display: none"]`);
  
    if (elements.length > 0) {
      elements.forEach(element => {
        // For missing alternative text
        if (className === 'swal2-image') {
          element.setAttribute('alt', 'Image');
        }
  
        // For missing form labels
        if (className.startsWith('swal2-') && ['input', 'textarea', 'select', 'range'].includes(element.tagName.toLowerCase())) {
          element.setAttribute('aria-label', `Label for ${element.type || element.tagName.toLowerCase()} element`);
        }
  
        // For empty form labels
        if (className === 'swal2-checkbox') {
          const labelElement = element.querySelector('label');
          if (labelElement && labelElement.textContent.trim() === '') {
            labelElement.remove(); // Remove the empty label element
            const inputElement = element.querySelector('input[type="checkbox"]');
            if (inputElement) {
              inputElement.setAttribute('aria-label', 'Checkbox label');
            }
          }
        }
  
        // Set a data attribute to indicate the element was initially hidden
        element.setAttribute('data-hidden', 'true');
  
        // Instead of removing the element, set the display to an appropriate value
        element.style.display = 'none'; // or any other appropriate value
      });
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  MAIN CODE                                 */
  /* -------------------------------------------------------------------------- */
 
  const sweetAlertClasses = [
    'swal2-input',
    'swal2-file',
    'swal2-range',
    'swal2-select',
    'swal2-radio',
    'swal2-checkbox',
    'swal2-textarea',
    'swal2-validation-message',
    'swal2-image'
  ];
  
  sweetAlertClasses.forEach(markAndModifyHiddenElementsByClass);
}
