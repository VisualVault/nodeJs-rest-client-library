/**
 * VV.Form.Global.DisplayMapDynamically
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (modalObject) {
  /*
    Function Name: DisplayMapDynamically
    Customer:      Washington DNR
    Purpose:       The purpose of this function is to display SweetAlert modals.
    Parameters:    modalObject - Object to build the content of the modal. 
                    Properties of modalObject include:
                   - Icon (String): Icon to display in the modal, e.g., 'info', 'warning'.
                   - Title (String): Title text of the modal.
                   - HtmlContent (String): HTML content to be displayed in the modal.
                   - Width (String): Width of the modal, defaults to '64rem' if not specified.
                   - input (String): Type of input if the modal requires user input, e.g., 'text', 'select'.
                   - inputOptions (Object): Options for the 'select' input type, structured as {value: 'Display Text'}.
                   - inputPlaceholder (String): Placeholder text for input fields.
                   - showCancelButton (Boolean): Whether to show a cancel button in the modal.
                   - allowOutsideClick (Boolean): Options for the 'select' input type, default false.
                   - ConfirmText (String): Text for the confirmation button.
                   - SecondaryText (String): Text for a secondary action button, if applicable.
                   - okFunction (Function): Function to execute on confirmation.
                   - secondFunction (Function): Function to execute on a secondary action.
                   - didOpenFunction (Function): Function to execute on if the modal opened.

    Date of Dev:   12/23/2024
    Last Rev Date: 12/23/2024
    --/--/----  - - : Function created.
    12/23/2024  - Ross Rhone: Created dynamic view modal for GIS Map added didOpen.
    */
  
  // Validation checks
  const errorLog = [];

  if (isNull(modalObject.HtmlContent)) {
    errorLog.push('No HtmlContent is set for the modal!');
  }

  if (errorLog.length > 0) {
    errorLog.forEach(function (item) {
      console.warn(item);
    });
    // Optionally, you can stop execution here
    return;
  }

  // Base configuration object with default values
  let swalConfig = {
    icon: modalObject.Icon || '',
    title: modalObject.Title || '',
    html: modalObject.HtmlContent || '',
    width: modalObject.Width || defaultWidth,
    allowOutsideClick:
      modalObject.allowOutsideClick !== undefined
        ? modalObject.allowOutsideClick
        : false,
    allowEscapeKey: false,
    allowEnterKey:  false,
    showCancelButton:
      modalObject.showCancelButton !== undefined
        ? modalObject.showCancelButton
        : false,
    confirmButtonColor: modalObject.confirmButtonColor || '#235A95',
    confirmButtonText: modalObject.ConfirmText || 'Save & Close',
  };

  // Include didOpen function if provided
  if (typeof modalObject.didOpen === 'function') {
    swalConfig.didOpen = modalObject.didOpen;
  }

  // Call Swal.fire with the dynamic configuration
  Swal.fire(swalConfig).then((result) => {
    if (
      result.isConfirmed &&
      typeof modalObject.okFunction === 'function'
    ) {
      modalObject.okFunction(result.value); // Pass the input value if any
    } else if (
      result.isDenied &&
      typeof modalObject.secondFunction === 'function'
    ) {
      modalObject.secondFunction();
    } 
  });

function isNull(param) {
  return (
    param === '' ||
    param === null ||
    param === undefined ||
    param === 'Select Item'
  );
}


}
