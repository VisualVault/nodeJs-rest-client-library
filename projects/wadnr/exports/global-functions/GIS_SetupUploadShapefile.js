/**
 * VV.Form.Global.GIS_SetupUploadShapefile
 * Parameters: 4
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (view, calciteDivs, webmap, fpId) {
/*Function Name:   GIS_SetupUploadShapefile
  Customer:       WA FNR: fpOnline
  Purpose:        Build upload shapefiles using custom calcite components. This allows for all
                  the functionality of uploading shapefiles to create feature layers on the map.
                  The following buttons are created from this
                  "Unit Boundary",
                  "Buffers",
                  "Streams",
                  "Water Bodies",
                  "Roads/Utilities",
                  "Water Crossings Points",
                  "WTM Survey Points",
                  "Other Points"

  Date of Dev:   12/05/2025
  Last Rev Date: 12/05/2025

  Parameters: view (Object) AGOL view of the webmap
              calciteDivs (object) AGOL's DOM divs to connect to the calicite menu panels
              webmap (Object) AGOL webmap object
              fpId (String) Form Id / Application Id on AGOL
            
  Puesdo Code:
  1° Create upload buttons for each editable layer wanted
  2° Handle clicks on any upload button
  3° validate the shapefile that was uploaded
  4° call webservice ActivityMapCreateFeatureFromShapefile to POST to AGOL to create the feautre(s) 
     from the shapefile
  5° zoom to the newly created feature(s) using the returned IDs

  12/05/2025 - Ross Rhone: First setup of script.

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

function ensureZipFileInput() {
  let input = document.getElementById("shapefileZipInput");
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.id = "shapefileZipInput";
    input.accept = ".zip,application/zip,application/x-zip-compressed";
    input.style.position = "fixed";
    input.style.left = "-9999px"; // keep it off-screen
    input.style.width = "1px";
    input.style.height = "1px";
    document.body.appendChild(input);
  }
  return input;
}

// Validate filename + quick size check (adjust limit for your environment)
function validateZipFile(file, { maxBytes = 2 * 1024 * 1024 } = {}) {
  if (!file) {
    VV.Form.Global.GIS_ShowDangerAlert(view, "An error occurred on the upload shapefile : no file selected for upload.");
    return false;
  }
  const name = (file.name || "").toLowerCase().trim();
  if (!name.endsWith(".zip")) {
    VV.Form.Global.GIS_ShowDangerAlert(view, "An error occurred on the upload shapefile : Please select a .zip file containing your shapefile.");
    return false;
  }
  if (file.size <= 0) {
    VV.Form.Global.GIS_ShowDangerAlert(view, "An error occurred on the upload shapefile : The selected file is empty.");
    return false;
  }
  if (file.size > maxBytes) {
    VV.Form.Global.GIS_ShowDangerAlert(view, "An error occurred on the upload shapefile : File too too large. Max allowed is " + (maxBytes / 1024 / 1024).toFixed(0) + " MB.");
    return false;
  }
  return true;
}


async function getFolderId(folderPath) {
  const shortDescription = `Get folder ${folderPath}`;
  // Status code 403 must be ignored (not throwing error) because it means that the folder doesn't exist
  const ignoreStatusCode = 403;
  const getFolderParams = {
    folderPath,
  };

  return vvClient.library
    .getFolders(getFolderParams)
    .then((res) => parseRes(res))
    .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
    .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
    .then((res) => checkDataIsNotEmpty(res, shortDescription, ignoreStatusCode))
    .then((res) => (res.data ? res.data.id : null));
}

async function putUpdatedFormDataInVVDocLib(docName, folderId, shapefile) {
  const docData = await postDoc(docName, folderId);

  const fileBuffer = Buffer.from(shapefile, 'base64');

  const fileData = await postFile(docData, fileBuffer);
  return fileData;
}

async function postDoc(docName, folderId) {
  const shortDescription = `DOR FPAN Permit(s) '${docName}'`;
  const docParams = {
    documentState: 1,
    name: `${docName}`,
    description: `DOR FPAN Permit(s) ${docName}`,
    revision: '0',
    allowNoFile: true,
    fileLength: 0,
    fileName: `${docName}.csv`,
    indexFields: '{}',
    folderId: folderId,
  };

  return vvClient.documents
    .postDoc(docParams)
    .then((res) => parseRes(res))
    .then((res) => checkMetaAndStatus(res, shortDescription))
    .then((res) => checkDataPropertyExists(res, shortDescription))
    .then((res) => checkDataIsNotEmpty(res, shortDescription))
    .then((res) => res.data);
}

async function postFile(docData, fileBuffer) {
  const shortDescription = `Post file for '${docData.name}'`;
  const fileParams = {
    documentId: `${docData.id}`,
    name: `${docData.name}`,
    revision: '1',
    changeReason: 'DOR permit POSTED',
    checkInDocumentState: 'Released',
    fileName: `${docData.fileName}`,
    indexFields: '{}',
  };

  return vvClient.files
    .postFile(fileParams, fileBuffer)
    .then((res) => parseRes(res))
    .then((res) => checkMetaAndStatus(res, shortDescription))
    .then((res) => checkDataPropertyExists(res, shortDescription))
    .then((res) => checkDataIsNotEmpty(res, shortDescription));
}

function createDocName(formName, currentDate) {
  const currentDateTime = currentDate.toISOString();
  let docName = formName + "_" + currentDateTime;
  // Create document in the VV Document Library
  return docName;
}

function fileToBase64DataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);       // "data:application/zip;base64,AAAA..."
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// if you need only the base64 part:
function fileToBase64(file) {
  return fileToBase64DataURL(file).then(s => String(s).split(',')[1]);
}

function handleShapefileZipUpload(file, layer) {
  console.log("✅ Valid shapefile .zip received for layer:", layer?.title, layer);
  console.log("   File:", file.name, `${(file.size / 1024 / 1024).toFixed(2)} MB`, file);
  const webServiceName = 'ActivityMapCreateFeatureFromShapefile';

  return fileToBase64(file)
    .then((base64file) => {
      VV.Form.ShowLoadingPanel();

      if (!layer?.portalItem?.title) {
        throw new Error("Layer missing portalItem/title");
      }

      const data = JSON.stringify([
        { name: 'ShapeFile', value: base64file },
        { name: 'Layer', value: layer },
        { name: 'LayerTitle', value: layer.portalItem.title },
        { name: 'ApplicationId', value: fpId }
      ]);

      return $.ajax({
        type: 'POST',
        url: `${VV.BaseAppUrl}/api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data
      })
        .then(handleCreateShapefileResponse)
    });
}


function handleCreateShapefileResponse(resp) {
  VV.Form.HideLoadingPanel();
  if (typeof resp.status != 'undefined') {
    message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
  } else if (typeof resp.statusCode != 'undefined') {
    message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
  } else if (resp.meta.status == '200') {
    if (resp.data[0] != undefined) {
      const responseStatus = resp.data[0];
      switch (responseStatus) {
        case 'Success':
          console.log("Success");
          mapLocationIds = resp.data[1];
          return mapLocationIds;
        case 'Error':
          if (resp?.data[2]) {
            console.error("Error:", resp.data[2]);
            throw new Error(resp.data[2]);
          } else {
            console.error("Error:", resp.data[1]);
            throw new Error(resp.data[1]);
          }
          break;
        default:
          throw new Error("Unknown response from server.");
      }
    } else {
      console.log("No response data returned from microservice");
      return null;
    }
  } else {
    console.log("Failed uploading shapefile");
    throw new Error("Unknown error occurred during shapefile upload.");
  }
}


// Utility: get layer object by id
function getLayerById(id) {
  return editableLayers.find(l => l.id === id);
}



/* -------------------------------------------------------------------------- */
/*                                  MAIN CODE                                 */
/* -------------------------------------------------------------------------- */

const editorDiv = document.getElementById("shapefileDiv");

const editableLayers = webmap.layers.filter(layer =>
  layer.type === "feature" && layer.editingEnabled
);

let inSelectMode = false;   // ➟ “Update / Delete” active?
let featureSelected = false;   // ← NEW  (needed by back-arrow logic)
let lyr = null;
let editorDropDownListPane = null;      // ← will hold the one dropdown pane we create 
let drawTools = null;
let previousState = null;


//This is the main div that will hold the upload shapefile buttons
//This div is created in the GIS_BuildCalciteLayout.js file
uploadShapeFileTools = document.getElementById("uploadShapeFileTools");
uploadShapeFileTools.classList.add("draw-grid");          // <‑‑- grid layout (CSS next)

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
  "Other Points"
];

//1° Create upload buttons for each editable layer wanted
wanted.forEach(name => {
  lyr = editableLayers.find(l => l.title.includes(name));
  if (!lyr) return;                  // layer absent in this WebMap
  const btn = document.createElement("calcite-button");
  btn.appearance = "outline-fill";    // gives a subtle border + fill on hover
  btn.kind = "neutral";         // or "brand" if you want colored fill
  btn.scale = "m";               // S / M / L  (M = 48 px tall)
  btn.innerText = "Upload " + lyr.title;   // e.g. “Draw Unit Boundary”
  btn.dataset.layerId = lyr.id;                // keep the ID for lookup
  uploadShapeFileTools.appendChild(btn);
});

//2° Handle clicks on any upload button
uploadShapeFileTools.addEventListener("click", function (evt) {
  const btn = evt.target && evt.target.closest && evt.target.closest("calcite-button");
  if (!btn) return;

  const layerId = btn.dataset.layerId;
  const layer = getLayerById(layerId);

  //3° validate the shapefile that was uploaded
  if (!layer) {
    VV.Form.Global.GIS_ShowDangerAlert(view, "Layer not found for upload");
    return;
  }

  const fileInput = ensureZipFileInput();
  fileInput.value = "";

  const onChange = function (e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) { fileInput.removeEventListener("change", onChange); return; }

    if (!validateZipFile(file)) {
      fileInput.removeEventListener("change", onChange);
      return;
    }

    //4° call webservice ActivityMapCreateFeatureFromShapefile to POST to AGOL to create the feautre(s) 
    // from the shapefile
    return handleShapefileZipUpload(file, layer)
      .then((mapLocationIds) => {
        //5° zoom to the newly created feature(s) using the returned IDs
        // e.g., await featureLayer.queryExtent({ objectIds: mapLocationIds }); view.goTo(...)
        if (mapLocationIds && mapLocationIds.length > 0) {
          layer.refresh();
          layer.load().then(() => {
            layer.queryExtent({ objectIds: mapLocationIds }).then(function (result) {
              if (result && result.extent) {
                view.goTo(result.extent.expand(1.2));
              }
            });
          });
        } else {
          console.log("No map location IDs returned from shapefile upload.");
          throw new Error("No features were created from the uploaded shapefile.");
        }
      })
      .then(function () {
        console.log("Shapefile upload handling complete.");
        //refresh the webmap to get the latest features after upload
        layer.refresh();
      })
      .catch(function (err) {
        VV.Form.Global.GIS_ShowDangerAlert(view, "Upload failed: " + (err && err.message ? err.message : String(err)));
      })
      .finally(function () {
        fileInput.removeEventListener("change", onChange);
      });
  };



  fileInput.addEventListener("change", onChange, { once: true });
  fileInput.click(); // must be synchronous in this click handler
});

}
