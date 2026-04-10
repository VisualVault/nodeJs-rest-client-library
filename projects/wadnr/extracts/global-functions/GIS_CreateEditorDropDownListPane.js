/**
 * VV.Form.Global.GIS_CreateEditorDropDownListPane
 * Parameters: 4
 * Extracted: 2026-04-10
 */
function (editorDropDownListPane, editorDiv, modalObject, drawTools) {
  /*
    Function Name: GIS_CreateEditorDropDownListPane.js
    Customer:      Washington DNR
    Purpose:       The purpose of this function is to create the pane for the drop down list
                   for selecting to draw a sub-layer. Example - Buffer - Select Buffers Type 
                   - Displays list (Area Review for unstable slopes, CMZ, WMZ, Leave Tree Area etc...) 
    Parameters:    none
    Date of Dev:   06/23/2025
    Last Rev Date: 06/23/2025
    --/--/----  - - : Function created.
    06/23/2025  -Ross Rhone: Created dropdown list pane
*/
  
  function showEditorDropDownListPane(show, editorDropDownListPane) {
  if (editorDropDownListPane) { editorDropDownListPane.style.display = show ? "block" : "none"; }
}

function showDrawingTools(show, editorDiv, drawTools) {
  drawTools.style.display = show ? "grid" : "none";   // grid when visible
  editorDiv.style.display = show ? "none" : "block";  // opposite for Editor
}
     // If it doesn’t exist, create the pane
  if (!editorDropDownListPane) {
    editorDropDownListPane = document.createElement("div");
    editorDropDownListPane.id = "editorDropDownListPane";
    editorDropDownListPane.style.padding = ".75rem";
    editorDropDownListPane.style.display = "flex";
    editorDropDownListPane.style.flexDirection = "column";
    editorDropDownListPane.style.gap = "1rem";

    // Create header ONCE
    const header = document.createElement("div");
    header.className = "domain-header";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "0.75rem";
    editorDropDownListPane.appendChild(header);

    // -- Back icon (looks like Editor’s) --------------------------------
      const backBtn = document.createElement("calcite-action");
      backBtn.icon = "chevron-left";        // ArcGIS / Calcite icon name
      backBtn.scale = "m";                   // matches Editor header size
      backBtn.id = "editorDropDownListBackBtn";
      backBtn.setAttribute("appearance", "transparent"); // no border, white bg
      backBtn.addEventListener("click", () => {
        showEditorDropDownListPane(false, editorDropDownListPane);
        showDrawingTools(true, editorDiv, drawTools);
      });
      header.appendChild(backBtn);           // sits on the left of the drop downlist

    // Insert once
    editorDiv.parentNode.insertBefore(editorDropDownListPane, editorDiv);
    modalObject.editorDrawPane = editorDropDownListPane;
  }

  return editorDropDownListPane;
}
