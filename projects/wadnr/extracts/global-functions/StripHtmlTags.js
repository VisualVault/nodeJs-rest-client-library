/**
 * VV.Form.Global.StripHtmlTags
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (htmlContent) {
if (!htmlContent) return "";

const tempElement = document.createElement("div");
tempElement.innerHTML = htmlContent;

return tempElement.textContent || tempElement.innerText || "";

}
