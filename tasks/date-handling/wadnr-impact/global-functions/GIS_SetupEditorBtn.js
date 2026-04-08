/**
 * VV.Form.Global.GIS_SetupEditorBtn
 * Parameters: 7
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (view, calciteDivs, webmap, Editor, reactiveUtils, fpId, modalObject) {
/*Function Name:   GIS_SetupEditorBtn
  Customer:       WA FNR: fpOnline
  Purpose:        Build AGOL's Editor Widget using custom calcite components. This allows for all
                  the functionality of editor widget, which includes selecting, drawing, editing, and deleting features.
                  The following buttons are created from this
                  "Unit Boundary",
                  "Buffers",
                  "Streams",
                  "Water Bodies",
                  "Roads/Utilities",
                  "Water Crossings/Survey Points",
                  "Other Points",
                  "Text",
                  "Arrow"
                  "Update / Delete"

  Date of Dev:   05/20/2025
  Last Rev Date: 05/20/2025

  Parameters: view (Object) AGOL view of the webmap
              divs (object) AGOL's DOM divs to connect to the calicite menu panels

  05/20/2025 - Ross Rhone: First setup of script.
  06/17/2025 - Ross Rhone: Added "Update / Delete" editing of existing features
  09/04/2025 - Ross Rhone: Added css to hide default ESRI update button so we use a custom update button
  12/11/2025 - Ross Rhone: Added Water Crossing Points button and hiding no value from activity type dropdown
               Fixed issue with back button in update/delete mode not working correctly

*/

/* ------------------------------------------------------------------ */
/*  Helper: injectDrawGridStyles                                      */
/* ------------------------------------------------------------------ *
 * Creates a <style> tag on‑the‑fly and pushes all grid / action
 * styles into <head>.  Brand colors can be overridden in one place.
 */
function injectDrawGridStyles(opts = {}) {
  const css = `
    /*  grid wrapper  */
    .draw-grid {
      display: grid;
      grid-template-columns: 1fr;               /* 👈 always one column */
      gap: 3.0rem;
      padding: .75rem;
    }
    /*  make every button fill its grid cell  */
    .draw-grid calcite-button {
      width: 100%;
      height: 48px;             /* consistent vertical rhythm */
      --calcite-color-brand: ${opts.brandColor || "#236d9e"};
      --calcite-color-brand-hover: ${opts.brandHover || "#184d73"};
    }
    /* Hiding the extra update button */
    /*  1‑column stack on narrow screens  */
    @media (max-width: 480px) {
      .draw-grid { grid-template-columns: 1fr; }
    }
  /* =========================================================
       Editor footer overrides — ONLY in Update/Delete mode
       We add .is-select-mode on the editor container (editorDiv)
       ========================================================= */

    /* 1) Hide the Editor's default Update (non-danger) button */
    .is-select-mode .esri-editor__actions > div > calcite-button:not([kind="danger"]) {
      display: none !important;
    }

    /* 2) Flatten the wrapper so spacing is natural */
    .is-select-mode .esri-editor__actions > div {
      display: contents; /* remove wrapper without removing children */
    }

    /* 3) Make the footer a clean, even two-column layout */
    .is-select-mode .esri-editor__actions {
      display: flex;
      gap: 0.5rem;
    }

    /* 4) Make both visible buttons share space evenly */
    .is-select-mode .esri-editor__actions > calcite-button,
    .is-select-mode .esri-editor__actions > div > calcite-button[kind="danger"] {
      flex: 1 1 0;
      min-width: 0;
    }
  `;
  if (!document.getElementById("draw-grid-style")) {
    const style = document.createElement("style");
    style.id = "draw-grid-style";
    style.textContent = css;
    document.head.appendChild(style);
  }
}

function showDrawingTools(show, editorDiv, drawTools) {
  drawTools.style.display = show ? "grid" : "none";   // grid when visible
  editorDiv.style.display = show ? "none" : "block";  // opposite for Editor
}

function getPolyActivityDomain(layer) {

  const fld = layer.fields.find(f => f.name === "activity_type");
  if (!fld || !fld.domain || fld.domain.type !== "coded-value") {
    return null;                               // no domain = exit
  }

  // Remove "No Value" option from the list
  const activityTypes = fld.domain.codedValues.filter(cv => {
    return cv.name && cv.name.toLowerCase() !== "no value";
  });

  return {
    field: fld,
    codedValues: activityTypes       // [{name,value}, …]
  };
}

function showEditorDropDownListPane(show, domainPane) {
  if (domainPane) { domainPane.style.display = show ? "block" : "none"; }
}

function safeSetLayerInfos(editor, layerInfos, maxAttempts = 5) {
  let attempts = 0;

  function tryAssign() {
    const state = editor.viewModel?.state;
    const isSafe =
      state === "ready" || state === "disabled" || state === "awaiting-feature-creation";

    if (isSafe) {
      editor.layerInfos = layerInfos;
    } else if (attempts < maxAttempts) {
      attempts++;
      console.log(`[safeSetLayerInfos] Waiting for safe state, attempt ${attempts}`, state);
      setTimeout(tryAssign, 150); // Retry after 150ms
    } else {
      console.warn("safeSetLayerInfos: timed out waiting for safe Editor state");
    }
  }

  tryAssign();
}

/* -------------------------------------------------------------------------- */
/*                                  MAIN CODE                                 */
/* -------------------------------------------------------------------------- */

const editorDiv = document.getElementById("editorDiv");

const editableLayers = webmap.layers.filter(layer =>
  layer.type === "feature" && layer.editingEnabled
);

let inSelectMode = false;   // ➟ “Update / Delete” active?
let featureSelected = false;   // ← NEW  (needed by back-arrow logic)
let lyr = null;
let editorDropDownListPane = null;      // ← will hold the one dropdown pane we create 
let drawTools = null;
let previousState = null;



//--------------------------------------------------------------
//  B. create an Editor widget (minimised UI)
//--------------------------------------------------------------
const editor = new Editor({
  view,
  container: "editorDiv",
  visibleElements: {                     // hide default lists
    heading: false,
    settingsMenu: false,
    featureTemplates: false,
    selectionTools: true,
    snappingControls: true,
    createFeaturesSection: false,
    editFeaturesSection: true,
    undoRedoButtons: false
  },
  layerInfos: []                         // filled when user clicks a button
});

VV.Form.Global.mapState.editor = editor;

/* --------------------------------------------------------------- */
/* 2.  Build ONE custom Save-edits button                          */
/* --------------------------------------------------------------- */
const updateBtn_Select = document.createElement("calcite-button");
Object.assign(updateBtn_Select, {
  innerText: "Update",
  scale: "m",
  appearance: "solid",
  kind: "brand",
  disabled: true          // enabled only while editing
});

// Using the MutationObserver so that we will wait until the DOM
// is fully created so we can remove ESRI's default update btn
// which doesn't work with anuglar 8 (which is what VV is on)
// to create our own custom update button "updateBtn_Select"
let footerObserver;          // holds the current MutationObserver


/* updates existing created features edits to AGOL*/
updateBtn_Select.addEventListener("click", () => {
  const wf = editor.viewModel.activeWorkflow;
  //replicates the functionality of ESRI's update button
  if (wf?.type === "update") wf.commit().catch(console.error);
});

/* --------------------------------------------------------------- */
/*  Removes the old ESRI Update button and creates a custom one    */
/*  for editing existing created features to AGOL                  */
/* --------------------------------------------------------------- */
function addCustomUpdateButton() {

  // try to find the DOM for the ESRI update button footer 
  const footer = document.querySelector(".esri-editor__actions");
  if (!footer) {                              // not there yet → watch once
    if (footerObserver) footerObserver.disconnect();   // clean up old one
    footerObserver = new MutationObserver(() => {
      if (addCustomUpdateButton()) footerObserver.disconnect();
    });
    footerObserver.observe(editorDiv, { childList: true, subtree: true });
    return false;                             // not patched yet
  }

  // ── we have a footer; work only if the active workflow is UPDATE ─
  const wf = editor.viewModel.activeWorkflow;
  if (!wf || wf.type !== "update") {
    // in CREATE or idle: make sure our button is *not* in the footer
    if (footer.contains(updateBtn_Select)) footer.removeChild(updateBtn_Select);
    return false;
  }

  /* ---------- real patch begins ---------------------------------- */

  /* first child is always the default Update button as of arcgis 4.32 and calcite components 3.2.1*/
  const esriUpdateBtn_ToBeDeleted = footer.querySelector(":scope > calcite-button");

  // hide default Update (but keep its space so calcite finishes hydrating)
  if (esriUpdateBtn_ToBeDeleted) esriUpdateBtn_ToBeDeleted.style.display = "none";

  // flex layout once
  if (!footer.dataset.flexified) {
    Object.assign(footer.style, { display: "flex", gap: "0.5rem" });
    footer.dataset.flexified = "yes";
  }

  // add & size our Save button (left half)
  if (!footer.contains(updateBtn_Select)) {
    Object.assign(updateBtn_Select.style, { flex: "0 0 50%", minWidth: "0" });
    footer.prepend(updateBtn_Select);
  }

  // make Delete fill the right half (whether hydrated or not)
  const deleteBtn =
    footer.querySelector('calcite-button[kind="danger"]') ||
    footer.querySelector(':scope > calcite-button:nth-of-type(2)');
  if (deleteBtn) Object.assign(deleteBtn.style, { flex: "0 0 50%", minWidth: "0" });

  //Set to true so that the backbutton returns back to the select option
  featureSelected = true;

  return true;
}


/* Watch for when the user is going to edit an existing feature.
Create the custom update button and delete the default ESRI update button */
reactiveUtils.watch(
  () => editor.viewModel.state,                   // dependency
  state => {
    VV.Form.Global.mapState.stateBeforeClose = state;
    const wf = editor.viewModel.activeWorkflow;
    if (wf &&                                        // still in a workflow
      wf.type === "update" &&                      // ...and it’s Update
      state === "editing-attributes") {            // form is now visible
      addCustomUpdateButton();
    }

    // keep the enable/disable toggle exactly as you had it:
    updateBtn_Select.disabled = !(state === "editing-existing-feature" ||
      state === "editing-attributes");
  }
);


editor.on("apply-edits", (evt) => {
  console.log("apply-edits");
  const { updateFeatureResults } = evt.results;
  if (!updateFeatureResults || !updateFeatureResults.length) { return; }

  updateFeatureResults.forEach((r) => {
    if (!r.success) {
      /*  <-- This is the part you never saw                         */
      console.error("⚠️  Update failed for OBJECTID", r.objectId, r.error);
      /*  Optional: show a toast/modal to the user                   */
      SwalAlert.fire({
        icon: "error",
        title: "Feature could not be updated",
        text: r.error?.message || "See console for details"
      });
    }
  });
});


/* back-arrow – static, added once */
const backArrow = (() => {
  if (document.getElementById("editorBackBtn")) {
    return document.getElementById("editorBackBtn");
  }
  const a = document.createElement("calcite-action");
  a.id = "editorBackBtn";
  a.icon = "chevron-left";
  a.scale = "m";
  a.setAttribute("appearance", "transparent");
  a.style.cssText =
    "position:absolute;top:0rem;left:0rem;background:#fff;border-radius:4px;" +
    "box-shadow:0 0 4px rgba(0,0,0,.15);display:none;z-index:1000;min-width: 32px;";
  editorDiv.style.position = "relative";
  editorDiv.appendChild(a);
  return a;
})();


/* back-arrow behaviour (two-stage) */
backArrow.addEventListener("click", () => {
  if (inSelectMode && featureSelected) {
    /* inside the form  ➟  cancel edit, remain in select mode           */
    editor.cancelWorkflow();
    featureSelected = false;
    editor.startUpdateWorkflowAtFeatureSelection();
  } else if (inSelectMode) {
    // leaving Update/Delete mode entirely ➟ back to Drawing Tools grid
    editor.cancelWorkflow();

    inSelectMode = false;
    featureSelected = false;
    editorDiv.classList.remove("is-select-mode");   // 🔑 turn off select-mode CSS
    backArrow.style.display = "none";
    showDrawingTools(true, editorDiv, drawTools);
  } else {
    /* fallback – hide arrow, show grid                                 */
    editorDiv.classList.remove("is-select-mode");   // 🔑 safety
    backArrow.style.display = "none";
    showDrawingTools(true, editorDiv, drawTools);
  }
});

/* watch the editor state so we know if a feature is selected           */
reactiveUtils.watch(
  () => editor.viewModel.state,
  state => {
    if (state !== "disabled") {
      previousState = state;
    }

    featureSelected = (state === "editing-existing-feature");

    if (state === "disabled") {
      if (editor?.viewModel?.activeWorkflow) {
        editor.cancelWorkflow();
      }
      editor.container = null;
    }
    VV.Form.Global.mapState.stateBeforeClose = previousState;
  }
);


drawTools = document.getElementById("drawTools");
drawTools.classList.add("draw-grid");          // <‑‑- grid layout (CSS next)

/* B. inject the styles (do this once) */
injectDrawGridStyles({
  brandColor: "#236d9e",   // ← optional overrides
  brandHover: "#184d73"
});

  const wanted = [
    "Unit Boundary",
    "Buffers",
    "Streams",
    "Water Bodies",
    "Roads/Utilities",
    "Water Crossing Points",
    "WTM Survey Points",
    "Other Points",
    "Text",
    "Arrow"
  ];

  wanted.forEach(name => {
  lyr = editableLayers.find(l => l.title.includes(name));
    if (!lyr) return;                  // layer absent in this WebMap
    const btn = document.createElement("calcite-button");
    btn.appearance = "outline-fill";    // gives a subtle border + fill on hover
    btn.kind = "neutral";         // or "brand" if you want colored fill
    btn.scale = "m";               // S / M / L  (M = 48 px tall)
    btn.innerText = "Draw " + lyr.title;   // e.g. “Draw Unit Boundary”
    btn.dataset.layerId = lyr.id;                // keep the ID for lookup
    drawTools.appendChild(btn);
  });

//--------------------------------------------------------------
//  D. when a button is pressed -> switch Editor to that layer
//--------------------------------------------------------------

function getCalciteButton(evt) {
  return evt.composedPath().find(el => el.tagName === "CALCITE-BUTTON");
}

const selectBtn = document.createElement("calcite-button");
selectBtn.appearance = "outline-fill";
selectBtn.kind = "neutral";
selectBtn.scale = "m";
selectBtn.innerText = "Update / Delete";
selectBtn.id = "updateDelete";
drawTools.appendChild(selectBtn);

selectBtn.addEventListener("click", (event) => {
  event.stopPropagation();          //  Won't call drawTools eventListener 

  /* ------------------------------------------
* refresh layerInfos so UPDATE knows all layers
* ------------------------------------------ */
 
  
  safeSetLayerInfos(
    editor,
    editableLayers.map(lyr => ({
      layer: lyr,
      formTemplate: {
        elements: VV.Form.Global.GIS_BuildFormElementsForLayer(lyr)
      }
    }))
  );

  if (editor.viewModel.state !== "ready") {
    editor.cancelWorkflow();               // ← NEW
  }
  inSelectMode = true;       // ← NEW  we are entering select mode
  featureSelected = false;      // ← NEW  nothing picked yet

  //Used for hiding the default esri update button
  editorDiv.classList.add("is-select-mode");

  showDrawingTools(false, editorDiv, drawTools);                // show the Editor pane
  backArrow.style.display = "block";
  editor.allowedWorkflows = ["update"];
  editor.visibleElements.selectionTools = true;

  editor.startUpdateWorkflowAtFeatureSelection(); // wait for a feature click
});


drawTools.addEventListener("click", function (evt) {

  modalObject.editorDrawPaneActive = editor.viewModel.state;

  const btn = getCalciteButton(evt);
  if (!btn || !btn.dataset.layerId) { return; }

  lyr = editableLayers.find(function (l) {
    return l.id === btn.dataset.layerId;
  });
  if (!lyr) { console.warn("Layer not found for button"); return; }

  // (optional) remove earlier dropdown if user switches layers
  let domainSelect = document.getElementById("activityTypeSelect");
  if (domainSelect) { domainSelect.remove(); domainSelect = null; }

  //------------------------------------------------------------------
  // 3. UI choreography:  decide whether we need the domain dropdown
  //------------------------------------------------------------------

  editorDropDownListPane = VV.Form.Global.GIS_CreateEditorDropDownListPane(editorDropDownListPane, editorDiv, modalObject, drawTools);


  // always start by hiding Editor  buttons
  showDrawingTools(false, editorDiv, drawTools);       // hide the grid
  showEditorDropDownListPane(false, editorDropDownListPane);    // hide old pane (if any)
  editorDiv.style.display = "none";

  // --------------------------------------------------------------
  // 4A. Layer HAS activity_type  ⇒ show dropdown first
  // --------------------------------------------------------------
  const codedValues = getPolyActivityDomain(lyr);
  if (codedValues) {
    // keep Back button, remove old selects only
    Array.from(editorDropDownListPane.querySelectorAll("calcite-select"))
      .forEach(sel => sel.remove());

    const sel = document.createElement("calcite-select");

    // 1. apply placeholder BEFORE adding options
    //sel.setAttribute("placeholder", "Select buffer type…");

    let dropDownTitle = document.createElement("calcite-option");
    dropDownTitle.value = "-1";
    /* Use the button text *after* the word “Draw …” so
    “Draw Unit Boundary” → “Select Unit Boundary Type”          */
    const LayerType = btn.innerText.replace(/^Draw\s+/, "").trim();
    dropDownTitle.label = "Select " + LayerType + " Type";

    sel.appendChild(dropDownTitle);


    // 2. now add the options (none selected) – plain ES5 loop
    for (var i = 0, len = codedValues.codedValues.length; i < len; i++) {
      var cv = codedValues.codedValues[i];                 // { code, name }
      var opt = document.createElement("calcite-option");
      opt.value = cv.code;                      // attribute value
      opt.label = cv.name;                      // user‑friendly text
      sel.appendChild(opt);                     // keep .selected = false
    }

    header = editorDropDownListPane.querySelector(".domain-header"); // first match

    header.appendChild(sel);              // ✅ dropdown to the right of arrow
    showEditorDropDownListPane(true, editorDropDownListPane);

    // when the user picks a value, launch Editor
    sel.addEventListener("calciteSelectChange", function onPick(evt) {
      modalObject.editorDrawPaneActive = true;

      sel.removeEventListener("calciteSelectChange", onPick);

      const pickedActivityType = sel.value;         // remember it

      showEditorDropDownListPane(false, editorDropDownListPane);
      editorDiv.style.display = "block";
      proceedWithTemplates(pickedActivityType);               // ⬅ step 5
    });
  } else {
    // --------------------------------------------------------------
    // 4B. No domain ⇒ skip dropdown, go straight to Editor
    // --------------------------------------------------------------
    editorDiv.style.display = "block";
    proceedWithTemplates();                          // ⬅ step 5
  }

  //------------------------------------------------------------------
  // 5. Everything you already had to load templates & start workflow
  //------------------------------------------------------------------
  function proceedWithTemplates(selectedActivityType) {

    /* build a formTemplate on demand so fields are hidden /
     * shown according to your helper */

    lyr.renderer.field = 'activity_type';
    safeSetLayerInfos(editor, [{
      layer: lyr,
      formTemplate: {
        elements: VV.Form.Global.GIS_BuildFormElementsForLayer(lyr)
      }
    }]);

    const ftVM = editor.viewModel.featureTemplatesViewModel;

    function launchSketch() {
      const templates = editor.viewModel.getTemplatesForLayer(lyr);
      if (!templates.length) { console.warn("No templates"); return; }

      const template = templates[0];
      if (selectedActivityType) {
        template.prototype.attributes.activity_type = selectedActivityType;
      }

      editor.startCreateFeaturesWorkflowAtFeatureCreation({
        layer: lyr,
        template
      });
    }

    if (ftVM.state === "ready") {
      launchSketch();
    } else {
      const h = ftVM.watch("state", v => {
        if (v === "ready") { h.remove(); launchSketch(); }
      });
      if (ftVM.state === "disabled") { ftVM.refresh(); }
    }
  }
});

/* ---------- hide the Editor when user is done ------------------ */
editor.on("workflow-cancel", () => {
  modalObject.editorDrawPaneActive = false;
  if (inSelectMode) {
    featureSelected = false;                  // step back in select flow
    //editor.startUpdateWorkflowAtFeatureSelection();
  } else if (editor.viewModel.state !== "disabled") {
    editorDiv.classList.remove("is-select-mode");   // 🔑 ensure normal footer
    showDrawingTools(true, editorDiv, drawTools);
    showEditorDropDownListPane(false, editorDropDownListPane);
  }
});
editor.on("workflow-complete", () => {
  if (inSelectMode) {
    featureSelected = false;                  // back to waiting
    editor.startUpdateWorkflowAtFeatureSelection();
  } else {
    console.log("workflow-completed");
    editorDiv.classList.remove("is-select-mode");   // 🔑 ensure normal footer
    lyr.refresh();
    showDrawingTools(true, editorDiv, drawTools);
    showEditorDropDownListPane(false, editorDropDownListPane);
  }
});

reactiveUtils.when(
  () => editor.viewModel.syncing === false,
  () => {
    // all pending edits are now applied on the server
    console.log("Edits committed!");

    view.map.layers.forEach(function (layer) {
      console.log("Layer:", layer.title, layer.id);
      layer.definitionExpression = `fp_id = '${fpId}'`;  // use your variable here
      // your logic here…
    });
  }
)


editor.on("sketch-create", function (event) {

  if (event.detail.state === "complete") {

    if (!event.detail.graphic) {
      console.log("Draw Status : " + event.detail.state);
      console.log("Graphics is null!");
    } else {
      const attributes = event.detail.graphic.attributes;
      attributes["fp_id"] = fpId;


      // copy selected poly_activity code if the dropdown exists
      const sel = document.getElementById("activityTypeSelect");
      if (sel && sel.value) {
        attributes["activity_type"] = sel.value;
      }
    }
  }
});

}
