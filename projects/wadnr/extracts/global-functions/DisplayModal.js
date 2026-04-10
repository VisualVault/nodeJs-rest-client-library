/**
 * VV.Form.Global.DisplayModal
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (modalObject) {
/*
    Script Name:   DisplayModal
    Customer:      PAELS
    Purpose:       The purpose of this script is to display SweetAlert modals.
    Parameters:    modalObject - Object to build the content of the modal. Properties include:
                   - allowOutsideClick (Boolean): Options for the 'select' input type, default false.
                   - ConfirmText (String): Text for the confirmation button.
                   - dismissFunction (Function): Function to execute on dismissing the modal.
                   - HtmlContent (String): HTML content to be displayed in the modal.
                   - HtmlContentStyles (Object): CSS Styles to apply to HTML content. (see: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style)
                   - Icon (String): Icon to display in the modal, e.g., 'info', 'warning'.
                   - input (String): Type of input if the modal requires user input, e.g., 'text', 'select'.
                   - inputOptions (Object): Options for the 'select' input type, structured as {value: 'Display Text'}.
                   - inputPlaceholder (String): Placeholder text for input fields.
                   - okFunction (Function): Function to execute on confirmation.
                   - SecondaryText (String): Text for a secondary action button, if applicable.
                   - secondFunction (Function): Function to execute on a secondary action.
                   - showCancelButton (Boolean): Whether to show a cancel button in the modal.
                   - showConfirmButton (Boolean): Whether to show a confirm button in the modal
                   - showDenyButton (Boolean): Whether to show a deny button in the modal.
                   - Title (String): Title text of the modal.
                   - Width (String): Width of the modal, defaults to '64rem' if not specified.
    Date of Dev:   --/--/----
    Last Rev Date: 05/08/2024
    --/--/----  - - : Script created.
    05/08/2024  - Moises Savelli: Added feature to displayModal to handle "input = select" modals.
    07/16/2024  - Austin Stone: Added feature to DisplayModal to handle text based inputs.
    12/17/2024  - Fernando Chamorro: Added feature to show buttons and deny color
    12/23/2024  - Lucas Herrera: Added feature to default modal (without input) to show confirm button and deny button and functions.
    01/30/2025  - Moises Savelli: Bug fixing about isOkFunction validation.
*/

var errorLog = []; //Logs missing properties.
var defaultWidth = "64rem"; //Default properties here.

function isNull(param) {
  if (
    param == "" ||
    param == null ||
    param == undefined ||
    param == "Select Item"
  ) {
    return true;
  }
  return false;
}

function isObject(obj) {
  return typeof obj === "object" && !Array.isArray(obj) && obj !== null;
}

function missingModalObjectCheck() {
  //Checks if modalObject was passed into function.
  if (typeof modalObject === "undefined") {
    console.warn("No modalObject Was Passed Into Function!");
  } else {
    checkObjectPropertyValues();
  }
}

function checkObjectPropertyValues() {
  if (isNull(modalObject.Icon)) {
    errorLog.push("No Icon is set for the modal!");
  }
  //if (isNull(modalObject.Title)) {
  //    errorLog.push("No Title is set for the modal!")
  //}
  if (isNull(modalObject.HtmlContent)) {
    errorLog.push("No HtmlContent is set for the modal!");
  }
  // if (isNull(modalObject.Width)) {
  //     errorLog.push('No Width is set for the modal! Setting default width.' + ' Modal width has been set to the default value [' + defaultWidth + '].')
  // }
  showErrors();
}

function showErrors() {
  //Outputs console warnings. Modals not displayed for these errors as any issues related to this should not be diplayed to the end-user.
  if (errorLog.length > 0) {
    errorLog.forEach(function (item) {
      console.warn(item);
    });
  }
  displayModal(); //Fire the Swal modal.
}

function displayModal() {
  // Set up a wrapping div to facilitate applying styles to html content
  const HtmlContentWrapper = document.createElement("div");
  if (!isNull(modalObject.HtmlContent)) {
    HtmlContentWrapper.innerHTML = modalObject.HtmlContent;
  }

  if (isObject(modalObject.HtmlContentStyles)) {
    for (const styleName in modalObject.HtmlContentStyles) {
      const styleValue = modalObject.HtmlContentStyles[styleName];
      HtmlContentWrapper.style[styleName] = styleValue;
    }
  }

  if (modalObject.hasOwnProperty("input") && modalObject.input === "select") {
    // Initialize inputOptions to ensure it's an object and not empty
    let inputOptionsValid =
      modalObject.hasOwnProperty("inputOptions") &&
      typeof modalObject.inputOptions === "object" &&
      Object.keys(modalObject.inputOptions).length > 0;

    Swal.fire({
      title: modalObject.Title || "Select validation",
      icon: isNull(modalObject.Icon) ? "" : modalObject.Icon,
      html: HtmlContentWrapper,
      width: isNull(modalObject.Width) ? defaultWidth : modalObject.Width,
      input: modalObject.input,
      inputOptions: inputOptionsValid
        ? modalObject.inputOptions
        : { default: "No available values" },
      inputPlaceholder: inputOptionsValid
        ? modalObject.inputPlaceholder || "Select an option"
        : "No available values",
      showCancelButton:
        modalObject.showCancelButton !== undefined
          ? modalObject.showCancelButton
          : true,
      allowOutsideClick:
        modalObject.allowOutsideClick !== undefined
          ? modalObject.allowOutsideClick
          : false,
      confirmButtonColor:
        modalObject.confirmButtonColor !== undefined
          ? modalObject.confirmButtonColor
          : "#235A95",
      confirmButtonText: modalObject.ConfirmText || "OK",
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value !== "" && value !== "No available values") {
            if (
              modalObject.okFunction &&
              typeof modalObject.okFunction === "function"
            ) {
              resolve(modalObject.okFunction(value));
            } else {
              resolve();
            }
          } else {
            resolve(
              modalObject.validationMessage || "You need to select an option"
            );
          }
        });
      },
    });
  }

  if (modalObject.hasOwnProperty("input") && modalObject.input === "text") {
    Swal.fire({
      title: modalObject.Title || "Select validation",
      icon: isNull(modalObject.Icon) ? "" : modalObject.Icon,
      html: HtmlContentWrapper,
      width: isNull(modalObject.Width) ? defaultWidth : modalObject.Width,
      input: modalObject.input,
      showCancelButton:
        modalObject.showCancelButton !== undefined
          ? modalObject.showCancelButton
          : true,
      allowOutsideClick:
        modalObject.allowOutsideClick !== undefined
          ? modalObject.allowOutsideClick
          : false,
      confirmButtonColor:
        modalObject.confirmButtonColor !== undefined
          ? modalObject.confirmButtonColor
          : "#235A95",
      confirmButtonText: modalObject.ConfirmText || "OK",
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value !== "") {
            if (
              modalObject.okFunction &&
              typeof modalObject.okFunction === "function"
            ) {
              resolve(modalObject.okFunction(value));
            } else {
              resolve();
            }
          } else {
            resolve(modalObject.validationMessage || "A value must be entered");
          }
        });
      },
    }).then((result) => {
      // 01/31/2025 Moises Savelli: It's causing issues because DisplayModal.input === "Text" is being triggered twice.
      //if (result.isConfirmed) {
      //modalObject?.okFunction?.();
      //}
      //else
      if (
        result.isDismissed &&
        modalObject.hasOwnProperty("dismissFunction") &&
        typeof modalObject.dismissFunction == "function"
      ) {
        modalObject.dismissFunction();
      }
    });
  }

  if (
    !modalObject.hasOwnProperty("input") &&
    modalObject.hasOwnProperty("okFunction") &&
    typeof modalObject.okFunction == "function" &&
    modalObject.hasOwnProperty("secondFunction") &&
    typeof modalObject.secondFunction == "function"
  ) {
    Swal.fire({
      icon: isNull(modalObject.Icon) ? "" : modalObject.Icon,
      title: isNull(modalObject.Title) ? "" : modalObject.Title,
      html: HtmlContentWrapper,
      width: isNull(modalObject.Width) ? defaultWidth : modalObject.Width,
      showConfirmButton:
        modalObject.showConfirmButton !== undefined
          ? modalObject.showConfirmButton
          : true,
      showDenyButton:
        modalObject.showDenyButton !== undefined
          ? modalObject.showDenyButton
          : true,
      showCancelButton:
        modalObject.showCancelButton !== undefined
          ? modalObject.showCancelButton
          : true,
      allowOutsideClick:
        modalObject.allowOutsideClick !== undefined
          ? modalObject.allowOutsideClick
          : true,
      confirmButtonColor: "#235A95",
      denyButtonColor: "#235A95",
      confirmButtonText: isNull(modalObject.ConfirmText)
        ? "Ok"
        : modalObject.ConfirmText,
      denyButtonText: isNull(modalObject.SecondaryText)
        ? "Denied"
        : modalObject.SecondaryText,
    }).then((result) => {
      if (result.isConfirmed) {
        modalObject?.okFunction?.();
      } else if (result.isDenied) {
        modalObject.secondFunction();
      } else if (
        result.isDismissed &&
        modalObject.hasOwnProperty("dismissFunction") &&
        typeof modalObject.dismissFunction == "function"
      ) {
        modalObject.dismissFunction();
      }
    });
  } else if (
    !modalObject.hasOwnProperty("input") &&
    modalObject.hasOwnProperty("okFunction") &&
    typeof modalObject.okFunction == "function"
  ) {
    Swal.fire({
      icon: isNull(modalObject.Icon) ? "" : modalObject.Icon,
      title: isNull(modalObject.Title) ? "" : modalObject.Title,
      html: HtmlContentWrapper,
      width: isNull(modalObject.Width) ? defaultWidth : modalObject.Width,
      showCancelButton:
        modalObject.showCancelButton !== undefined
          ? modalObject.showCancelButton
          : true,
      allowOutsideClick:
        modalObject.allowOutsideClick !== undefined
          ? modalObject.allowOutsideClick
          : true,
      confirmButtonColor: "#235A95",
      confirmButtonText: isNull(modalObject.ConfirmText)
        ? "Ok"
        : modalObject.ConfirmText,
    }).then((result) => {
      if (result.isConfirmed) {
        modalObject?.okFunction?.();
      } else if (
        result.isDismissed &&
        modalObject.hasOwnProperty("dismissFunction") &&
        typeof modalObject.dismissFunction == "function"
      ) {
        modalObject.dismissFunction();
      }
    });
  } else if (!modalObject.hasOwnProperty("input")) {
    Swal.fire({
      icon: isNull(modalObject.Icon) ? "" : modalObject.Icon,
      title: isNull(modalObject.Title) ? "" : modalObject.Title,
      html: HtmlContentWrapper,
      width: isNull(modalObject.Width) ? defaultWidth : modalObject.Width,
      allowOutsideClick:
        modalObject.allowOutsideClick !== undefined
          ? modalObject.allowOutsideClick
          : true,
      showConfirmButton:
        modalObject.showConfirmButton !== undefined
          ? modalObject.showConfirmButton
          : true,
      showDenyButton:
        modalObject.showDenyButton !== undefined
          ? modalObject.showDenyButton
          : false,
      showCancelButton:
        modalObject.showCancelButton !== undefined
          ? modalObject.showCancelButton
          : false,
      confirmButtonColor: "#235A95",
      denyButtonColor: "#235A95",
      confirmButtonText: isNull(modalObject.ConfirmText)
        ? "Ok"
        : modalObject.ConfirmText,
      denyButtonText: isNull(modalObject.SecondaryText)
        ? "Denied"
        : modalObject.SecondaryText,
    }).then((result) => {
      if (result.isConfirmed) {
        modalObject?.okFunction?.();
      } else if (
        result.isDismissed &&
        modalObject.hasOwnProperty("dismissFunction") &&
        typeof modalObject.dismissFunction == "function"
      ) {
        modalObject.dismissFunction();
      }
    });
  }
}

missingModalObjectCheck();
VV.Form.Global.DisplayModalRemoveHiddenSweetAlertElements();

}
