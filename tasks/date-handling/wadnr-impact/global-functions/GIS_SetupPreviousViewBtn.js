/**
 * VV.Form.Global.GIS_SetupPreviousViewBtn
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (view) {
/*Function Name:   GIS_SetupPreviousViewBtn
  Customer:       WA FNR: fpOnline
  Purpose:        Build custom calcite btn to return a user back to a previous view.

  Pseudo code: 
                1° Find the built-in zoom widget
                2° Create Custom Previous View "Back Button"
                3° Create History of views array
                4° Back button behavior: go to previous extent
                ...

  Date of Dev:   08/21/2025
  Last Rev Date: 08/21/2025

  Parameters: view (Object) AGOL view of the webmap

*/

// 1° Find the built-in zoom widget
const zoomWidget = view.ui.find("zoom");
if (!zoomWidget) return;

// 2° Create Custom Previous View "Back Button"
const backBtn = document.createElement("calcite-button");
backBtn.classList.add("esri-widget--button");
backBtn.setAttribute("title", "Back");
backBtn.setAttribute("appearance", "solid");
backBtn.setAttribute("kind", "neutral");
backBtn.setAttribute("scale", "m");
backBtn.setAttribute("icon-start", "arrow-left");

// Put it under the "-" button
zoomWidget.container.appendChild(backBtn);

// 3° Create History of views array
const history = [];
let internalNav = false; // suppress history push when we're going "back"

function pushExtentIfNew() {
  if (internalNav) return;
  const ex = view.extent && view.extent.clone();
  if (!ex) return;

  const last = history[history.length - 1];
  if (last && last.equals(ex)) return; // avoid dupes from tiny moves
  history.push(ex);

  // (optional) cap history size
  if (history.length > 50) history.shift();
}

// seed once the map settles initially
if (view.extent) pushExtentIfNew();

// record each time navigation stops
view.watch("stationary", function (stopped) {
  if (stopped) pushExtentIfNew();
});

// 4° Back button behavior: go to previous extent
backBtn.addEventListener("click", function () {
  // need at least two: current + previous
  if (history.length <= 1) return;

  // drop current, then target previous
  history.pop();
  const target = history[history.length - 1];

  internalNav = true;
  view.goTo(target).catch(function () {})
    .then(function () {
      // small defer so the 'stationary' push after goTo is ignored
      internalNav = false;
    });
});

}
