/**
 * VV.Form.Global.AddressVerificationOnBlur
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (addressSet) {
/*
  This function validates the user's entered address when they navigate away from the address field (i.e. when the "blur" event is triggered).
  It compares the user's entered address string to the last response address string stored in session storage.
  If the two strings don't match and all required fields are filled out, it triggers a call to the global AddressVerification function.
  The last response address string is stored in session storage to avoid adding unnecessary fields to the form.
  Address validation is performed adhoc during entry or modification of address values, so we don't need to store this information in form fields.

  Function name: AddressVerificationOnBlur

  Parameter: - addressSet: Represents the set of address fields that need validation. An AddresFieldNamesMap template script must exist on the calling form for this function to execute.

  Example address object:
 {
    street1: 'Street 1 Field Name',
    street2: 'Street 2 Field Name',
    street3: 'Street 3 Field Name',
    city: 'City Field Name',
    state: 'State Field Name',
    zipCode: 'Zip Code Field Name',
    country: 'Country Field Name',
    hasCountry: true/false
  }
*/

// This is the address set you will be performing address validation on. This template must exist on your form.
let addressFieldNamesObj;
try {
  addressFieldNamesObj = VV.Form.Template.AddressFieldNamesMap(
    addressSet,
    false,
  );
  if (VV.Form.Global.isNullEmptyUndefined(addressFieldNamesObj)) {
    throw new Error(
      "No data was returned from the AddressFieldNamesMap template script.",
    );
  } else {
    // Get the values of the street, city, state, zip, country, and address string fields from the address object
    const street1 = VV.Form.Global.isNullEmptyUndefined(
      addressFieldNamesObj.street1,
    )
      ? ""
      : VV.Form.GetFieldValue(addressFieldNamesObj.street1).trim();
    const street2 = VV.Form.Global.isNullEmptyUndefined(
      addressFieldNamesObj.street2,
    )
      ? ""
      : VV.Form.GetFieldValue(addressFieldNamesObj.street2).trim();
    //Address verifications are not performed for street 3 fields
    const street = street1 + street2;
    const city = VV.Form.Global.isNullEmptyUndefined(addressFieldNamesObj.city)
      ? ""
      : VV.Form.GetFieldValue(addressFieldNamesObj.city).trim();
    const state = VV.Form.Global.isNullEmptyUndefined(
      addressFieldNamesObj.state,
    )
      ? ""
      : VV.Form.GetFieldValue(addressFieldNamesObj.state).trim();
    const zipCode = VV.Form.Global.isNullEmptyUndefined(
      addressFieldNamesObj.zipCode,
    )
      ? ""
      : VV.Form.GetFieldValue(addressFieldNamesObj.zipCode).trim();
    // If the address field names object has a 'hasCountry' property set to true, get the value of the corresponding 'country' field from the form using VV.Form.GetFieldValue,
    // otherwise set a default value of 'US'
    const country = addressFieldNamesObj.hasCountry
      ? VV.Form.GetFieldValue(addressFieldNamesObj.country).trim()
      : "US";
    const deliverableSuggestionsOnly = VV.Form.Global.isNullEmptyUndefined(
      addressFieldNamesObj.deliverableSuggestionsOnly,
    )
      ? "True"
      : addressFieldNamesObj.deliverableSuggestionsOnly;
    // Set the userFormAddressString to a session variable.

    window.sessionStorage.setItem(
      "userFormAddressString",
      (street + city + state + zipCode).replace(/ /g, "").toUpperCase(),
    );

    const userFormAddressString = VV.Form.Global.isNullEmptyUndefined(
      window.sessionStorage.getItem("userFormAddressString"),
    )
      ? ""
      : window.sessionStorage.getItem("userFormAddressString");
    // Retrieve the last response address string from session storage, or set it to an empty string if not found
    const lastResponseAddressString = VV.Form.Global.isNullEmptyUndefined(
      window.sessionStorage.getItem("lastResponseAddressString"),
    )
      ? ""
      : window.sessionStorage.getItem("lastResponseAddressString");

    // Check if the user-entered address string is different from the last response address string, and if all required fields are filled out
    if (
      (lastResponseAddressString === "" ||
        lastResponseAddressString !== userFormAddressString) &&
      zipCode !== ""
    ) {
      // If the address strings don't match and all required fields are filled out, trigger a call to the global AddressVerification function
      if (country === "US") {
        /*NOTE: Current implementation of forms do not have the required fields to support 
        CANADIAN address validation. CANADIAN Address verification requires street addresses, postal code, city, and province fields. 
        The API should return valid addresses when / if this is configured.*/
        const addressObject = {
          country,
          street1,
          street2,
          city,
          state,
          zipCode,
          deliverableSuggestionsOnly,
        };
        VV.Form.Global.AddressVerification(
          addressObject,
          addressFieldNamesObj,
          addressSet,
        );
      }
    }
    //Store the last address in session storage.
    window.sessionStorage.setItem(
      "lastResponseAddressString",
      userFormAddressString,
    );
  }
} catch (error) {
  displayErrorModal(
    "Something went wrong when attempting to build the addressFieldNamesObj. Make sure you have created an AddressFieldNamesMap template for your form, or check your template for errors." +
      error.message,
  );
}

//Display Error Modal
function displayErrorModal(messageData) {
  VV.Form.Global.DisplayModal({
    Title: "Error",
    Icon: "error",
    HtmlContent: messageData,
  });
}

}
