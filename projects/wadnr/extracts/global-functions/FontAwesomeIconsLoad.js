/**
 * VV.Form.Global.FontAwesomeIconsLoad
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
// FontAwesomeIconsLoad Global Script
// use in onDataLoad to load Font Awesome Icons

const fontAwesomeLink = document.createElement("link");
fontAwesomeLink.setAttribute("rel", "stylesheet");
fontAwesomeLink.setAttribute("href", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css");
document.head.appendChild(fontAwesomeLink);
}
