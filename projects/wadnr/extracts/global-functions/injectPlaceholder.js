/**
 * VV.Form.Global.injectPlaceholder
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (element) {
/**
 * Function to inject placeholder attribute to an element based on properties

    Script Name:   injectPlaceholder
    Customer:      DNR
    Purpose:       The purpose of this process is to inject placeholder to elements

    Parameters:     
        @param {Object|Array} element - Object containing element properties or Array of such objects
        @param {string} element.name - The name/id of the element to find
        @param {string} element.type - The type of element (e.g., 'textarea', 'input')
        @param {string} element.placeholder - The placeholder text to inject
        
    Return Value:   @returns {boolean|number} - Boolean for single element or count for multiple elements

    Date of Dev:    04/22/2025
    Last Rev Date:  04/22/2025
    Revision Notes:
    04/22/2025 - Moises Savelli: Script created

 */

// Handle array of elements
if (Array.isArray(element)) {
  let successCount = 0;

  element.forEach((singleElement) => {
    // Call this same function with each individual element
    if (VV.Form.Global.injectPlaceholder(singleElement)) {
      successCount++;
    }
  });

  console.log(
    `Successfully injected placeholders for ${successCount} of ${element.length} elements`
  );
  return successCount;
}

// Handle single element
if (!element || !element.name || !element.type || !element.placeholder) {
  console.error(
    "Invalid element object. Required properties: name, type, placeholder"
  );
  return false;
}

// Build a selector to find the element in the DOM
let selectors = [];

// Try to find by id
selectors.push(`#${element.name}`);

// Try to find by vvfieldname attribute
selectors.push(`${element.type}[vvfieldname="${element.name}"]`);

// Try to find by aria-label
selectors.push(`${element.type}[aria-label="${element.name}"]`);

// Join all selectors with comma for OR operation in querySelector
const combinedSelector = selectors.join(", ");

// Find the element in the DOM
const domElement = document.querySelector(combinedSelector);

if (!domElement) {
  console.warn(
    `Element with name "${element.name}" of type "${element.type}" not found in the DOM`
  );
  return false;
}

// Set the placeholder
domElement.setAttribute("placeholder", element.placeholder);

console.log(
  `Placeholder "${element.placeholder}" injected for ${element.type} element: "${element.name}"`
);
return true;

}
