/**
 * VV.Form.Global.GIS_DisplayDangerAlert
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (view, message) {
 // Create a wrapper div that ArcGIS UI knows how to place
  const host = document.createElement("div");
  host.className = "esri-component";     // gets ArcGIS widget padding/margins
  host.style.maxWidth = "320px";

  // Build the calcite-alert
  const alert = document.createElement("calcite-alert");
  alert.setAttribute("open", "");
  alert.setAttribute("kind", "danger");  // red error styling
  alert.setAttribute("icon", "");        // show the danger icon
  alert.setAttribute("closable", "");    // allow dismiss

  const title = document.createElement("div");
  title.setAttribute("slot", "title");
  title.textContent = message || "Something went wrong";

  alert.appendChild(title);
  host.appendChild(alert);

  // Add to the map’s UI in the top-right corner
  view.ui.add(host, "top-right");

  // Optional: clean up when the alert is closed
  alert.addEventListener("calciteAlertClose", () => {
    view.ui.remove(host);
  });
}
