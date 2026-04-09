/**
 * VV.Form.Global.GIS_ShowDangerAlert
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (view, message) {
 
/*Function Name:   GIS_DisplayDangerAlert
  Customer:       WA FNR: fpOnline
  Purpose:        Creates a pop-up alert that won't close the modal
                  to display an error on the activity map.
                  
  Date of Dev:   09/10/2025
  Last Rev Date: 09/10/2025

  Parameters: view (Object) AGOL view of the webmap
              message (String) Error message that will be displayed


  09/10/2025 - Ross Rhone: First setup of script.
  12/11/2025 - Ross Rhone: Added ability to show new lines in the message.
  04/08/2026 - Ross Rhone: Making this UI mobile friendly                         


*/

  // Create a wrapper div that ArcGIS UI knows how to place
  const host = document.createElement("div");
  host.className = "esri-component activity-map-alert";     // gets ArcGIS widget padding/margins
  host.style.maxWidth = "min(24rem, calc(100vw - 2rem))";

  // Build the calcite-alert
  const alert = document.createElement("calcite-alert");
  alert.setAttribute("open", "");
  alert.setAttribute("kind", "danger");  // red error styling
  alert.setAttribute("icon", "");        // show the danger icon
  alert.setAttribute("closable", "");    // allow dismiss
  alert.setAttribute("placement", "top");

  const title = document.createElement("div");
  title.setAttribute("slot", "title");
  title.style.whiteSpace = "pre-line"; //Used to show new lines in the message
  title.textContent = message || "Something went wrong";

  alert.appendChild(title);
  host.appendChild(alert);

  // it doesn't matter where we add this, the alert will position via placement attribute
  view.ui.add(host, "top-left");

  // Optional: clean up when the alert is closed
  alert.addEventListener("calciteAlertClose", () => {
    view.ui.remove(host);
    host.remove();
  });

}
