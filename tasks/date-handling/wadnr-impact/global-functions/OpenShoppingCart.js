/**
 * VV.Form.Global.OpenShoppingCart
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (settings) {
/* OpenShoppingCart - Opens the cart for an individual to pay their outstanding items and passes over contextual data 
  via sessionStorage.
  NOTE: The use of sessionStorage is leveraged instead of fill-in and relate due to the unique onLoad behavior of the cart

   Parameters: settings (Object, Required) - An object that contains several properties:
    individualID (String, Required) - ID used to locate (or create) the individual's shopping cart
    openInNewWindow (Boolean) - Defaults as falsy (opens in same window)
    contextualData (Object) - Data that is passed to the shopping cart via sessionStorage. Data must be serializable.

   Return Value: none
*/
const cartTemplateId = '5016e94b-59d7-ef11-aa78-af9225d6a1b2';
const { individualID, openInNewWindow, contextualData } = settings;

if (!individualID) {
  throw new Error(`An individual ID must be defined to open a shopping cart`);
}

// create cart URL
let cartURL = new URL(`${VV.BaseURL}form_details`);
cartURL.searchParams.set('formid', cartTemplateId);
cartURL.searchParams.set('Individual ID', individualID); // passed in so hidden field is populated
cartURL.searchParams.set('hidemenu', true);
cartURL = cartURL.toString();

// define default data always passed through to cart via sessionStorage
const contextualDataFinal = {
  'Context Form ID': VV.Form.DhDocID,
  'Context Form GUID': VV.Form.DataID,
  'Individual ID': individualID,
};

// define additional data or default overrides passed through to cart via sessionStorage
if (contextualData) {
  for (const key in contextualData) {
    contextualDataFinal[key] = contextualData[key];
  }
}

// open the cart
const cartWindow = window.open(cartURL, (openInNewWindow ? '_blank' : '_self'));

// load in contextualData to the cart window's sessionStorage
for (const key in contextualDataFinal) {
  cartWindow.sessionStorage.setItem(key, contextualDataFinal[key]);
}
}
