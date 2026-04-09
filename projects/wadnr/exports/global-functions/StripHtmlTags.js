/**
 * VV.Form.Global.StripHtmlTags
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (htmlContent) {
if (!htmlContent) return "";

const tempElement = document.createElement("div");
tempElement.innerHTML = htmlContent;

return tempElement.textContent || tempElement.innerText || "";

}
