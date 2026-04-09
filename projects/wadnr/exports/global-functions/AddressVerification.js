/**
 * VV.Form.Global.AddressVerification
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (addressObject, addressFieldNamesObj, addressSet) {
//Address Verification

//Declare Global Variables
let websvcName = "LibAddressVerification";
let addressFieldNames = addressFieldNamesObj;
let CallServerSide = function () {
  VV.Form.ShowLoadingPanel();
  let formData = [];

  FormInfo = {};
  FormInfo.name = "addressObject";
  FormInfo.value = addressObject;
  formData.push(FormInfo); //addressObject passed in as a parameter from the AddressVerificationOnBlur Global

  //Following will prepare the collection and send with call to server side script.
  let data = JSON.stringify(formData);
  let requestObject = $.ajax({
    type: "POST",
    url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${websvcName}`,
    contentType: `application/json; charset=utf-8`,
    data: data,
  });

  return requestObject;
};

$.when(CallServerSide()).always(function (resp) {
  VV.Form.HideLoadingPanel();
  let messageData = "";
  if (typeof resp.status != "undefined") {
    messageData = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
    displayErrorModal(messageData);
  } else if (typeof resp.statusCode != "undefined") {
    messageData = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server. This may mean that the servers to run the business logic are not available.`;
    displayErrorModal(messageData);
  } else if (resp.meta.status == "200") {
    if (resp.data[0] != "undefined") {
      if (resp.data[0] == "Success") {
        //Response Object from LOB.com
        let verifyAddressResult = resp.data[3];

        //Mutated AddressObject returned from webservice. May be modified by Lob.Com or ZipCodes.com circumstantially.
        let returnedAddressObject = resp.data[2];

        //Determines deliverability of addresses returned from LOB.com
        let deliverability = VV.Form.Global.isNullEmptyUndefined(verifyAddressResult.deliverability) ? "" : verifyAddressResult.deliverability;

        //Set vars for returnedAddressObject
        let street = returnedAddressObject.street1 + returnedAddressObject.street2;
        let city = returnedAddressObject.city;
        let state = returnedAddressObject.state;
        let zipCode = returnedAddressObject.zipCode;

        //Set Suggestions Returned from LOB.com API Call if ANY for use in the displaySuggestionsModal.
        let suggestions = !VV.Form.Global.isNullEmptyUndefined(verifyAddressResult.suggestions) && verifyAddressResult.suggestions.length > 0 ? verifyAddressResult.suggestions : [];

        //Set City State Fields
        VV.Form.SetFieldValue(addressFieldNames.city, returnedAddressObject.city);
        VV.Form.ClearValidationErrorOnField(addressFieldNames.city);
        VV.Form.SetFieldValue(addressFieldNames.state, returnedAddressObject.state);
        VV.Form.ClearValidationErrorOnField(addressFieldNames.state);
        //Address was returned as deliverable. Set the field values,
        if (deliverability === "deliverable") {
          const webServiceResponseAddressString = (street + city + state + zipCode).replace(/ /g, "").toUpperCase();
          //Store the last address in session storage.
          window.sessionStorage.setItem("lastResponseAddressString", webServiceResponseAddressString);
          const fieldsToUpdate = {
            city: returnedAddressObject.city,
            state: returnedAddressObject.state,
            county: VV.Form.Global.ToProperCase(returnedAddressObject.county),
            zipCode: returnedAddressObject.zipCode,
            street1: returnedAddressObject.street1,
            street2: returnedAddressObject.street2,
          };
          //Loop through the field map and set the field values
          Object.entries(fieldsToUpdate).forEach(([fieldName, fieldValue]) => {
            if (!VV.Form.Global.isNullEmptyUndefined(addressFieldNames[fieldName])) {
              const currentFieldValue = VV.Form.GetFieldValue(addressFieldNames[fieldName]);
              if (!VV.Form.Global.isNullEmptyUndefined(fieldValue) && fieldValue !== currentFieldValue) {
                VV.Form.SetFieldValue(addressFieldNames[fieldName], fieldValue);
                VV.Form.ClearValidationErrorOnField(addressFieldNames[fieldName]);
              }
            }
          });
        }

        //Suggestions are available display the suggestions modal
        if (suggestions.length > 0) {
          displaySuggestionsModal(suggestions);
        }

        //Missing Unit or Invalid Unit
        if (deliverability === "deliverable_missing_unit" || deliverability === "deliverable_incorrect_unit") {
          const missingOrIncorrectUnitMessage = `<p>Our database indicates that the address you entered is valid, but we were unable to verify the unit information. If you believe the address is correct, you can continue. Otherwise, you can make any necessary corrections and try again.</p>`;
          VV.Form.Global.DisplayModal({
            Title: "Missing or invalid unit information",
            Icon: "warning",
            HtmlContent: missingOrIncorrectUnitMessage,
          });
        }

        //Undeliverable Address
        // Check if the address is potentially undeliverable but still allow user to proceed
        // without displaying the undeliverable message if addressObject.street1 or addressObject.street2 is empty.
        if (
          // Check if "undeliverable" is present in the deliverability value OR
          // Check if either addressObject.street1 or addressObject.street2 is not empty
          (deliverability.includes("undeliverable") || addressObject.street1 !== "" || addressObject.street2 !== "") &&
          // Check if deliverability is empty AND suggestions array is empty
          deliverability === "" &&
          suggestions.length === 0
        ) {
          // If the condition above is true, display the undeliverable message
          const undeliverableModalMessage = `<p>Our database indicates that the address you entered may be undeliverable. However, 
  you may still continue if you believe it is correct, or you can revisit your entry and make corrections.</p>`;
          VV.Form.Global.DisplayModal({
            Title: "Undeliverable Address",
            Icon: "warning",
            HtmlContent: undeliverableModalMessage,
          });
        }
      } else if (resp.data[0] == "Error") {
        messageData = `An error was encountered. ${resp.data[1]}`;
        displayErrorModal(messageData);
      } else {
        messageData = `An unhandled response occurred when calling ${websvcName}. The form will not save at this time. Please try again or communicate this issue to support.`;
        displayErrorModal(messageData);
      }
    } else {
      messageData = "The status of the response returned as undefined.";
      displayErrorModal(messageData);
    }
  } else {
    messageData = `The following unhandled response occurred while attempting to retrieve data from ${websvcName}: ${resp?.data?.error}`;
    displayErrorModal(messageData);
  }
});

function displayErrorModal(messageData) {
  VV.Form.Global.DisplayModal({
    Title: "Error",
    Icon: "error",
    HtmlContent: messageData,
  });
}

function displaySuggestionsModal(suggestions) {
  // Create an array to store HTML strings for each suggestion
  const suggestionHtmlArray = [];

  // Loop through suggestions array and create an HTML string for each suggestion
  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    const addressString = suggestion.primary_line + " " + suggestion.city + " " + suggestion.state + " " + suggestion.zip_code;

    // Create an HTML string for this suggestion with a mousedown event that sets the selected index and highlights the selected item
    const suggestionHtml = `<div class="suggestion" data-index="${i}">${addressString}</div>`;
    suggestionHtmlArray.push(suggestionHtml);
  }

  // Combine all the suggestion HTML strings into one HTML string
  const suggestionsHtml = suggestionHtmlArray.join("");

  const addressSuggestionsMessage = `<p>We were unable to validate the address you entered, but we found some possible suggestions in our database.</p>
  <p>
    Please choose one of the addresses below and click 'Ok' or 'Cancel' to return to the form.
  </p>`;

  // Create the modal object with the HTML content
  let modalObject = {
    Icon: "info",
    Title: `Suggested Addresses`,
    HtmlContent: `${addressSuggestionsMessage}<div class="suggestions-container">${suggestionsHtml}</div>`,
    Width: "50rem",
    okFunction: function () {
      // Get the index of the selected suggestion from the selectedSuggestionIndex variable
      const index = selectedSuggestionIndex;
      const fieldsToUpdate = {
        street1: suggestions[index].primary_line,
        city: suggestions[index].city,
        state: suggestions[index].state,
        zipCode: suggestions[index].zip_code,
      };
      Object.entries(fieldsToUpdate).forEach(([fieldName, fieldValue]) => {
        if (!VV.Form.Global.isNullEmptyUndefined(addressFieldNames[fieldName])) {
          const currentFieldValue = VV.Form.GetFieldValue(addressFieldNames[fieldName]);
          if (!VV.Form.Global.isNullEmptyUndefined(fieldValue) && fieldValue !== currentFieldValue) {
            VV.Form.SetFieldValue(addressFieldNames[fieldName], fieldValue);
            VV.Form.ClearValidationErrorOnField(addressFieldNames[fieldName]);
          }
        }
      });
    },
    cancelFunction: function () {
      //Clear the last address in session storage so the user may update the address or reverify.
      window.sessionStorage.setItem("lastResponseAddressString", "");
    },
  };

  Swal.fire({
    icon: modalObject.Icon,
    title: modalObject.Title,
    html: modalObject.HtmlContent,
    width: modalObject.Width,
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    confirmButtonText: "Ok",
    preConfirm: function () {
      // Check if an item is selected
      if (selectedSuggestionIndex < 0) {
        Swal.showValidationMessage("Please choose one of the addresses in the list, or click cancel to return to the form.");
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      modalObject.okFunction();
    }
    if (result.isDismissed) {
      modalObject.cancelFunction();
    }
  });

  // Style each suggestion element
  $(".suggestion").css({
    padding: "10px",
    "border-bottom": "1px solid #e0e0e0", // Light gray border
    color: "#333",
    "background-color": "transparent",
    cursor: "pointer",
  });

  // Style alternate suggestion elements
  $(".suggestion:nth-child(odd)").css({
    "background-color": "#f9f9f9", // Alternate white and light gray background
  });

  // Add scrollbar to suggestions container if necessary
  const suggestionsContainer = $(".suggestions-container");
  suggestionsContainer.css({
    "max-height": "300px", //This value detemines when to display the scroll bar.
    "overflow-y": "auto",
    "overflow-x": "hidden",
  });

  // Variable to store the index of the selected suggestion
  let selectedSuggestionIndex = -1;

  // Function to handle selection of a suggestion
  const selectSuggestion = (index) => {
    // Remove the selected class from all suggestions
    $(".suggestion").removeClass("selected");

    // Set the selected class on the clicked suggestion
    $(`.suggestion[data-index="${index}"]`).addClass("selected");

    // Set the selectedSuggestionIndex variable to the index of the selected suggestion
    selectedSuggestionIndex = index;
  };

  // Add hover effects to each suggestion element
  $(".suggestion").hover(
    function () {
      $(this).css({
        "background-color": "#eaf5ff", // Subtle blue background
      });
    },
    function () {
      // Check if this suggestion is the selected suggestion
      const index = $(this).data("index");
      if (index !== selectedSuggestionIndex) {
        $(this).css({
          "background-color": "transparent",
        });
      }
    }
  );

  // Add click event to each suggestion element
  $(".suggestion").click(function () {
    const index = $(this).data("index");
    selectSuggestion(index);

    // Set the background color of the clicked suggestion to subtle yellow
    $(this).css({
      "background-color": "#ffffcc",
    });

    // Remove the background color of all other suggestions
    $(".suggestion").not(this).css({
      "background-color": "transparent",
    });
  });
}

VV.Form.Global.DisplayModalRemoveHiddenSweetAlertElements();
}
