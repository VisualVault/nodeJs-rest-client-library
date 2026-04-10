/**
 * VV.Form.Global.GIS_CancelActiveEditing
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
 /*Function Name:   GIS_CancelActiveEditing
  Customer:       WA FNR: fpOnline
  Purpose:        When a user is drawing on the activty map and
                  they don't finish drawing and click on "Zoom To Legal",
                  "Layers", "Drawing Tools", "Print" then it will cancel
                  the drawing state.
                  
  Date of Dev:   09/09/2025
  Last Rev Date: 09/09/2025

  Parameters: none
  
  09/09/2025 - Ross Rhone: First setup of script.
*/

 const editor = VV.Form.Global.mapState?.editor;
  const editorDiv = document.getElementById("editorDiv");
  const drawTools = document.getElementById("drawTools");
  const backArrow = document.getElementById("editorBackBtn");

  if (!editor) return;

  try {
    // Cancel workflow if one is active
    if (editor.viewModel?.activeWorkflow) {
      editor.cancelWorkflow();
    }

    // Cancel sketch if in progress
    const svm = editor.viewModel?.sketchViewModel;
    if (svm && (svm.state === "active" || svm.state === "creating")) {
      svm.cancel();
    }
  } catch (e) {
    console.warn("GIS_CancelActiveEditing error:", e);
  }

  // Reset UI state
  window.inSelectMode = false;
  window.featureSelected = false;
  if (editorDiv) editorDiv.classList.remove("is-select-mode");
  if (backArrow) backArrow.style.display = "none";
  if (drawTools) {
    drawTools.style.display = "grid";
    editorDiv.style.display = "none";
  }
}
