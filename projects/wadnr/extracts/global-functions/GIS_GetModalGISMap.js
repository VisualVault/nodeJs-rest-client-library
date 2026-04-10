/**
 * VV.Form.Global.GIS_GetModalGISMap
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (mapViewManager, portalID, fpId) {
/* eslint-disable no-unused-vars */
/*Function Name:   GIS_GetModalGISMap
  Customer:       WA FNR: fpOnline
  Purpose:        Display a GIS map from ArcGISOnline's APIs / SDKs to allow the user to create a map
                  required on the FPAN permit form.
  Date of Dev:   12/23/2024
                 05/05/2025 Added in server-side authenication via AGOL's "App Authenication" using OAuth 2.0 credentials
                 07/15/2025 Added in savings where the map's view will be shared across all forms that pertain to the activity map
                            This will use the subform to hold the activity map's view.
                 09/12/2025  Ross Rhone - Removing async function to use .then and fixing promise chains
  
  Last Rev Date: 09/12/2025
  Preconditions:  TBD

  Parameters:    The following represents the control that triggered the function:
                 control: esri/WebMap "mapViewManager" - Holds the view of the webMap in order to support client-side saving of what is drawn on the map.
                 portalID - ID of portal to load in web map
                 fpId     - FPAN Id
    
  Return:         modalObject. Returns back the map 
*/

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */
function setMapViewportHeightVar() {
  const viewportHeight = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vv-activity-map-vh", `${viewportHeight}px`);
}

function injectActivityMapResponsiveStyles() {
  if (document.getElementById("activity-map-responsive-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "activity-map-responsive-style";
  style.textContent = `
    .activity-map-shell-panel {
      height: 100%;
    }

    .activity-map-shell-panel calcite-panel::part(content),
    .activity-map-shell-panel calcite-panel::part(content-container) {
      min-height: 0;
      overflow: hidden;
    }

    .activity-map-widget-panel,
    .activity-map-scroll-region,
    .activity-map-widget-panel .esri-layer-list,
    .activity-map-widget-panel .esri-layer-list__list,
    .activity-map-widget-panel .esri-basemap-gallery,
    .activity-map-widget-panel .esri-basemap-gallery__items {
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }

    .activity-map-shell-panel .draw-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 0.75rem;
      align-content: start;
    }

    .activity-map-shell-panel .draw-grid calcite-button {
      width: 100%;
      min-height: 44px;
    }

    @media (pointer: coarse) and (orientation: portrait) and (min-width: 641px) {
      .swal2-popup {
        width: min(94vw, 52rem) !important;
        max-width: min(94vw, 52rem) !important;
      }

      .activity-map-scroll-region {
        max-height: calc(var(--vv-activity-map-vh, 1vh) * 100 - 12rem);
      }

      .activity-map-shell-panel .draw-grid {
        gap: 0.35rem;
        padding: 0.35rem;
      }

      .activity-map-shell-panel .draw-grid calcite-button {
        min-height: 32px;
        height: 32px;
        font-size: 0.85rem;
      }
    }

    @media (pointer: coarse) and (orientation: landscape) and (max-width: 1400px) {
      .swal2-popup {
        width: min(96vw, 64rem) !important;
        max-width: min(96vw, 64rem) !important;
      }

      .activity-map-scroll-region,
      .activity-map-widget-panel,
      .activity-map-widget-panel .esri-layer-list,
      .activity-map-widget-panel .esri-layer-list__list,
      .activity-map-widget-panel .esri-basemap-gallery,
      .activity-map-widget-panel .esri-basemap-gallery__items {
        max-height: calc(var(--vv-activity-map-vh, 1vh) * 100 - 11rem);
      }

      .activity-map-shell-panel .draw-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
        padding: 0.75rem;
      }

      .activity-map-shell-panel .draw-grid calcite-button {
        min-height: 44px;
        height: 44px;
        font-size: 1rem;
      }
    }

    @media (max-width: 640px) {
      .swal2-popup {
        width: min(96vw, 32rem) !important;
        max-width: min(96vw, 32rem) !important;
      }

      .activity-map-shell-panel {
        --calcite-shell-panel-width: min(18rem, 82vw);
        --calcite-shell-panel-min-width: min(18rem, 82vw);
      }

      .activity-map-scroll-region,
      .activity-map-widget-panel,
      .activity-map-widget-panel .esri-layer-list,
      .activity-map-widget-panel .esri-layer-list__list,
      .activity-map-widget-panel .esri-basemap-gallery,
      .activity-map-widget-panel .esri-basemap-gallery__items {
        max-height: calc(var(--vv-activity-map-vh, 1vh) * 100 - 11rem);
      }

      .esri-search {
        max-width: min(10.5rem, calc(100vw - 7rem));
        min-width: 0 !important;
      }

      .esri-search,
      .esri-search__container,
      .esri-search__input-container {
        width: min(10.5rem, calc(100vw - 7rem)) !important;
        max-width: min(10.5rem, calc(100vw - 7rem)) !important;
      }

      .esri-scale-bar {
        transform: scale(0.78);
        transform-origin: left bottom;
      }
    }
  `;
  document.head.appendChild(style);
}

function enforceMapModalHeight() {
  setMapViewportHeightVar();
  injectActivityMapResponsiveStyles();

  const selectors = [
    ".swal2-container",
    ".swal2-popup",
    ".swal2-content",
    "#swal2-content",
    "#calcite-shell-map",
    "#calcite-shell-map-container"
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      Object.assign(el.style, {
        height: "calc(var(--vv-activity-map-vh, 1vh) * 100)",
        maxHeight: "calc(var(--vv-activity-map-vh, 1vh) * 100)",
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        overflow: "hidden"
      });
    }
  }
}

function getPolyActivityDomain(layer) {

  const fld = layer.fields.find(f => f.name === "activity_type");
  if (!fld || !fld.domain || fld.domain.type !== "coded-value") {
    return null;                               // no domain = exit
  }
  return {
    field: fld,
    codedValues: fld.domain.codedValues        // [{name,value}, …]
  };
}

function showEditorDropDownListPane(show, editorDrawPane, backArrow) {
  if (editorDrawPane) { editorDrawPane.style.display = show ? "block" : "none"; }

  // Move back arrow into active calcite-flow-item
  function moveBackArrowIntoEditorUI() {
    const flowItem = editorDiv.querySelector("calcite-flow-item[selected]");
    const flowHeader = flowItem?.shadowRoot?.querySelector(".header") ||
      flowItem?.querySelector(".esri-editor__panel-content");

    if (flowHeader && !flowHeader.contains(backArrow)) {
      flowHeader.prepend(backArrow);
      backArrow.style.display = "block"; // ✅ Ensure it shows
    }
  }

  if (editorDiv.querySelector("calcite-flow-item[selected]")) {
    moveBackArrowIntoEditorUI();
  } else {
    const observer = new MutationObserver(() => {
      const readyItem = editorDiv.querySelector("calcite-flow-item[selected]");
      if (readyItem) {
        observer.disconnect();
        moveBackArrowIntoEditorUI();
      }
    });
    observer.observe(editorDiv, { childList: true, subtree: true });
  }
}
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
    /*  1‑column stack on narrow screens  */
    @media (max-width: 480px) {
      .draw-grid { grid-template-columns: 1fr; }
    }
  `;
  if (!document.getElementById("draw-grid-style")) {
    const style = document.createElement("style");
    style.id = "draw-grid-style";
    style.textContent = css;
    document.head.appendChild(style);
  }
}

function loadSavedMap(viewpoint, view) {
   const viewpointJSON = JSON.parse(viewpoint);

          require(["esri/Viewpoint"], function (Viewpoint) {
            const vp = Viewpoint.fromJSON(viewpointJSON);
            view.goTo(vp).catch(console.warn);
          });
}

function createMapView(mapViewManager, portalID, fpId, token, calciteDivs) {
  /* ── retry settings ─────────────────────────── */
  const MAX_TRIES  = 3;     // total attempts (1 initial + 2 retries)
  const BASE_DELAY = 500;   // ms; back-off = BASE_DELAY × 2^(attempt-1)
  let attempt    = 1;
  let savedMapView = "";
  let lastError = null;
  let guid; // used when reading saved map view

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // One full run: create view, optionally load saved view, filter layers, setup widgets
  function run() {
    return VV.Form.Global.GIS_CreateMapView(portalID, token)
      .then(function (result) {
        let view   = result.view;
        let webmap = result.webmap;

        const doesActivity = VV.Form.GetFieldValue("ActivityMapViewSubFormCreated");
        if (doesActivity === "True") {
          // Fetch saved map view
          return VV.Form.CustomQuery("zClientSideGetActivityMapView", fpId, null, false)
            .then(function (res) {
              if (res && res.length) {
                guid = res[0].dhid;
                savedMapView = res[0].activityMapView;
                if (savedMapView) {
                  try { loadSavedMap(savedMapView, view); } catch (e) { console.warn("loadSavedMap failed:", e); }
                }
              } else {
                VV.Form.Global.DisplayModal({
                  Title: "Activity Map View",
                  Icon: "error",
                  HtmlContent: "Activity Map View Sub Form Not Found. Failed zClientSideGetActivityMapView."
                });
              }
              return { view: view, webmap: webmap };
            })
            .catch(function (err) {
              // Non-fatal: proceed without saved view, but log it
              console.error("Failed to load ActivityMapView:", err);
              return { view: view, webmap: webmap };
            });
        }

        // No saved view path
        return { view: view, webmap: webmap };
      })
      .then(function (webmapContext) {
        let view   = webmapContext.view;
        let webmap = webmapContext.webmap;

        // expose map + view on manager
        mapViewManager.map  = webmap;
        mapViewManager.view = view;

        const layerPromises = [];

        // Filtering the user's view by their application ID
        mapViewManager.map.layers.forEach(layer => {
          if (layer.type === "feature") {
            const promise = layer.when(() => {
              const hasField = layer.fields.some(field => field.name === "fp_id");
              if (hasField) {
                // Apply a filter
                layer.definitionExpression = `fp_id = '${fpId}'`;
              } else {
                // Instead of removing here, mark it to remove later
                layer.__shouldRemove = true;
              }
            });
            layerPromises.push(promise);              // collect the promise
          }
        });
        // wait for every layer Promise to resolve 
        return Promise.all(layerPromises).then(function () {
          // now the map is ready for widgets
          return { view: view, webmap: webmap };
        });
      })
      .then(function (webmapContext) {
        // Map is ready for widgets
        VV.Form.Global.GIS_SetupUIWidgets(webmapContext.view, calciteDivs, webmapContext.webmap, fpId, modalObject, token);
        return webmapContext; // keep returning { view, webmap } in case caller wants it
      });
  }

  // Retry wrapper with exponential backoff
  function attemptRun() {
    return run().catch(function (err) {
      lastError = err;
      console.error("❌ Attempt " + attempt + " failed", err);

      if (attempt < MAX_TRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        attempt += 1;
        return wait(delay).then(attemptRun);
      }

      VV.Form.Global.DisplayModal({
        HtmlContent: "Unable to load webmap from ArcGIS Online. Please try again.",
        Icon: "Error",
        Title: "Error",
        ConfirmText: "Retry",
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        okFunction: function () {
          // 🎯 Retry entrypoint (your onLoad handler)
          VV.Form.Global.GIS_onLoad(event);
        }
      });

      return Promise.reject(lastError || new Error("Failed to create map view"));
    });
  }

  // kick things off
  return attemptRun();
}


let zoomInBtn, zoomOutBtn;
function onZoomIn() { mapViewManager.view.goTo({ zoom: mapViewManager.view.zoom + 1 }); }
function onZoomOut() { mapViewManager.view.goTo({ zoom: mapViewManager.view.zoom - 1 }); }

/* -------------------------------------------------------------------------- */
/*                              Config Variables                              */
/* -------------------------------------------------------------------------- */

// Globally available SweetAlert2 toast mixin
const SwalAlert = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

let layerListEl;
let editorDropDownListPane;                         // one pane reused for each layer
let pickedActivityType;
let guid;
const webServiceName = "ActivityMapUpdateMapView";

/* -------------------------------------------------------------------------- */
/*                                  MAIN CODE                                 */
/* -------------------------------------------------------------------------- */

const modalObject = {
  Title: '',
  HtmlContent: '<calcite-shell id="calcite-shell-map" style="width: 100%; height: 100%"></calcite-shell>',
  Width: '80%',
  didOpen: function () {
    if (!window.__activityMapResizeBound) {
      window.addEventListener("resize", setMapViewportHeightVar);
      window.__activityMapResizeBound = true;
    }

    enforceMapModalHeight();
    modalObject.initializeMap();
  },
  initializeMap: function () {

    if (mapViewManager.map && mapViewManager.view) {
      mapViewManager.view.container = "calcite-shell-map";

      const shell = document.querySelector('calcite-shell');
      shell.appendChild(mapViewManager.calciteAppNav);
      shell.appendChild(mapViewManager.calciteAppPanel);

      // ✅ Check if UI's pane (or other layout elements) were lost after modal close
      if (mapViewManager.editor) {

        const editorDiv = document.getElementById("editorDiv");
        let editor = mapViewManager.editor;
        if (mapViewManager.stateBeforeClose === "creating-features") {
          editor.startCreateFeaturesWorkflowAtFeatureCreation({
            layer: editor.layerInfos[0]["layer"],
            template: editor.layerInfos[0]["formTemplate"]
          });
        }
      }
      return;
    }

    //No pre-existing view so create from scratch
    const webmapResponse = this._webMapResponse;
    if (!webmapResponse) {
      console.error("No webMapResponse found on modalObject!");
      return;
    }

    //Build the UI icons for all the buttons "layers", "drawing tools" etc
    const calciteDivs = VV.Form.Global.GIS_BuildCalciteLayout();

    const token = webmapResponse[0].value;

    createMapView(mapViewManager, portalID, fpId, token, calciteDivs);
  },
  okFunction: function () {

    const viewpoint = mapViewManager.view.viewpoint.toJSON();
    const viewpointStr = JSON.stringify(viewpoint);


    //need to get the revision id of the form we want to update
    // we will do this by getting the FPAN number and then getting the DhDocID
    // from the sub form since it will be related to the FPAN.


        VV.Form.ShowLoadingPanel();

    async function UpdateMapViewSubForm() {
        // IF THE FORM IS TOO LARGE DON'T USE THE FOLLOWING LINE AND SEND ONLY DE DATA YOU NEED
        let formData = [];//VV.Form.getFormDataCollection(); // Get all the form fields data

        if(guid === undefined) {
            const res = await VV.Form.CustomQuery('zClientSideGetActivityMapView', fpId, null, false);
            if (res.length != 0) {
              guid = res[0].dhid;
            }
        }

        formData.push({
          name: 'RelatedRecordId',
          value: fpId
        })
    
        // Uncomment the following to add more data to the formData object.
        formData.push({
          name: 'RevisionId',
          value: guid
        })

        formData.push({
          name: 'ActivityMapView',
          value: viewpointStr
        })
    
        const data = JSON.stringify(formData);
    
        const requestObject = $.ajax({
            type: 'POST',
            url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
            contentType: 'application/json; charset=utf-8',
            data: data,
            success: '',
            error: '',
        });
    
        return requestObject;
    }
    
    $.when(UpdateMapViewSubForm())
        .always(function (resp) {
            if (typeof resp.status != 'undefined') {
                message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
            } else if (typeof resp.statusCode != 'undefined') {
                message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
            } else if (resp.meta.status == '200') {
                if (resp.data[0] != undefined) {
                    if (resp.data[0] == 'Success') {
                        VV.Form.HideLoadingPanel();
                    } else {
                        message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
                        displayErrorModal('Error', message);
                        VV.Form.HideLoadingPanel();
                    }
                } else {
                    message = 'The status of the response returned as undefined.';
                    displayErrorModal('Error', message);
                    VV.Form.HideLoadingPanel();
                }
            } else {
                if (resp.data && resp.data.error) {
                  message = `An error was returned from the server when calling ${webServiceName}. The error message is: ${resp.data.error} <br>`;
                }
                if (resp.meta && resp.meta.errors) {
                  message = `Errors were returned from the server when calling ${webServiceName}. The error messages are: ${resp.meta.errors[0].message}`;
                }
                displayErrorModal('Error', message);
                VV.Form.HideLoadingPanel();
            }
        });
    
    function displayErrorModal(title, messageData) {
        VV.Form.Global.DisplayModal({
            Title: title,
            Icon: "error",
            HtmlContent: messageData,
        });
    }

    if (mapViewManager.view) {
      mapViewManager.view.container = null;

      const nav = document.querySelector('calcite-navigation')
      const panel = document.querySelector('calcite-shell-panel')
      const previousState = mapViewManager.editor.viewModel.state;

      mapViewManager.calciteAppNav = nav;
      mapViewManager.calciteAppPanel = panel;
      mapViewManager.stateBeforeClose = previousState;
    }

    // Triggering download of features if needed
    //downloadFeatures(); turning off for now

    function downloadFeatures() {
      const webmap = mapViewManager.map;
      const collectedFeatures = [];

      const layers = webmap.layers.items;
      const promises = [];

      if (mapViewManager.map) {
        mapViewManager.map = null;
      }

      layers.forEach(function (layer) {
        // Check if the layer's title starts with "edit"
        if (/^edit/i.test(layer.title) || (layer.type === 'feature' && layer.userUploaded)) {
          const query = layer.createQuery();
          query.returnGeometry = true;
          query.outFields = ['*'];
          const promise = layer.queryFeatures(query).then(function (result) {
            collectedFeatures.push(...result.features);
          });
          promises.push(promise);
        }
      });

      Promise.all(promises).then(function () {
        if (collectedFeatures.length === 0) {
          SwalAlert.fire({
            icon: "error",
            title: "No features to download."
          });
        } else {
          const esriJSON = modalObject.getEsriJSON(collectedFeatures);
          VV.Form.SetFieldValue('JSONTextBox', JSON.stringify(esriJSON), false);
        }
      }).catch(function (error) {
        console.error("Error querying features:", error);
        SwalAlert.fire({
          icon: "error",
          title: "Error downloading features."
        });
      });


      // Remove listeners to avoid leaks / duplicate zooms next time
      if (zoomInBtn) zoomInBtn.removeEventListener("click", onZoomIn);
      if (zoomOutBtn) zoomOutBtn.removeEventListener("click", onZoomOut);

      zoomInBtn = zoomOutBtn = null;   // free references
    }
  },
  getEsriJSON: function (features) {
    const esriJSONFeatures = features.map(function (feature) {
      return feature.toJSON();
    });
    return { features: esriJSONFeatures };
  },
  downloadEsriJSON: function (esriJSON) {
    const dataStr = JSON.stringify(esriJSON);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "drawn_polygons_esri.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

return modalObject;

}
