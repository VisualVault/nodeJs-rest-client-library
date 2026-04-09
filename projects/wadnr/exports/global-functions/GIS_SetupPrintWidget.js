/**
 * VV.Form.Global.GIS_SetupPrintWidget
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (view, token, webmap) {

/*Function Name:   GIS_SetupPrintWidget
  Customer:       WA FNR: fpOnline
  Purpose:        Creates a print menu that allows you to select the
                  file format (pdf/tiff), enter in additional information,
                  and finds the township, range, and section of where
                  you are printing.
                  
  Date of Dev:   08/22/2025
  Last Rev Date: 09/12/2025

  Parameters: view (Object) AGOL view of the webmap
              token (String) JWT Token for VV's AGOL
              webmap (Object) VV's AGOL's webmap that contains the features / layers

  08/22/2025 - Ross Rhone: First setup of script.
  09/10/2025 - Ross Rhone: Added print scale options to determine the size of the PDF
               or TIF being downloaded. Added better error handling alerts with calcite-alerts,
               loading bubble when printing, and renaming of the files when downloaded.
  09/12/2025 - Ross Rhone: Added print theme dropdown so a use can select the type of
               template that they wish to print out via pdf/tif.
  12/11/2025 - Ross Rhone: Added validation to check for "No Value" records before allowing
                the user to print. If "No Value" records are found, the user is alerted and
                zoomed to the first record with "No Value".
  04/08/2026 - Ross Rhone: Making this UI mobile friendly                         


*/


/* -------------------------------------------------------------------------- */
/*                              Global Variables                              */
/* -------------------------------------------------------------------------- */
const now = new Date();

// Format mm-dd-yyyy
const mm = String(now.getMonth() + 1).padStart(2, "0");
const dd = String(now.getDate()).padStart(2, "0");
const yyyy = now.getFullYear();

// Unix timestamp
const unixTimestamp = now.getTime(); // in milliseconds

let theme = "activity"

const PRINT_SERVER_URL = "https://gis-dev.dnr.wa.gov/geoprocess/rest/services/FP_Online/FPOnlinePrint/GPServer/FPOnlinePrint";

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

// GET https://.../parameters?f=json  -> find "themeName" -> return choiceList
function fetchThemeChoices() {
  const url = PRINT_SERVER_URL + "/parameters?f=json";

  return fetch(url, { method: "GET", credentials: "omit" })
    .then(function (resp) {
      if (!resp.ok) {
        throw new Error("HTTP " + resp.status + " when fetching parameters");
      }
      return resp.json();
    })
    .then(function (json) {
      if (!json || !Array.isArray(json.parameters)) {
        throw new Error("Unexpected parameters payload");
      }

      var themeParam = json.parameters.find(function (p) { return p.name === "themeName"; });
      if (!themeParam) {
        throw new Error("Parameter 'themeName' not found");
      }

      var choices = Array.isArray(themeParam.choiceList) ? themeParam.choiceList.slice() : [];
      if (!choices.length) {
        // Fallback: if a choice list isn't present, at least return the default if any
        if (typeof themeParam.defaultValue === "string" && themeParam.defaultValue.trim()) {
          choices = [themeParam.defaultValue.trim()];
        }
      }

      return choices;
    });
}

function findNoValueRecords(webmap) {
  const results = [];

  const layersToCheck = webmap.layers.items.filter(lyr => lyr.type === "feature");

  function processLayer(index) {
    if (index >= layersToCheck.length) {
      console.log("FINAL SUMMARY:", results);
      return Promise.resolve(results);
    }

    const layer = layersToCheck[index];

    return layer.load().then(() => {
    
    let checkField;

    switch (layer.title) {
      case "Unit Boundary":
        checkField = "unit_id";
        break;

      case "Text":
        checkField = "text_to_display"; // ← use actual field name
        break;

      case "Arrow":
        checkField = "fp_id"; // ← Arrow only needs App ID
        break;

      default:
        checkField = "activity_type";
    }

      console.info(`Checking layer: ${layer.title} (field: ${checkField})`);

      const query = layer.createQuery();
      query.outFields = ["*"];
      query.returnGeometry = false;

      return layer.queryFeatures(query).then(featureSet => {
        const noValueRecords = featureSet.features.filter(f => {
          const value = f.attributes[checkField];
          return value === "No Value" || value == null || value === "";
        });

        if (noValueRecords.length > 0) {
          console.warn(`⚠ ${layer.title}: ${noValueRecords.length} records have No Value.`);

          results.push({
            layerTitle: layer.title,
            layerId: layer.id,
            fieldChecked: checkField,
            count: noValueRecords.length,
            objectIds: noValueRecords.map(f => f.attributes[layer.objectIdField])
          });
        } else {
          console.log(`✓ ${layer.title}: All good!`);
        }

        return processLayer(index + 1);
      });
    });
  }

  return processLayer(0);
}


function createWhiteBox(view) {
  // Create animation
  if (!document.getElementById("activity-map-print-animation-style")) {
    const style = document.createElement("style");
    style.id = "activity-map-print-animation-style";
    style.innerHTML = `
      @keyframes floatAnimation {
        0% { transform: translateX(10px); opacity: 0; }
        100% { transform: translateX(0px); opacity: 1; }
      }
      .white-box-floating {
        animation: floatAnimation 0.3s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }

  // White box container
  const whiteBox = document.createElement("div");
  whiteBox.id = 'printWhitebox';
  whiteBox.classList.add("activity-map-whitebox", "white-box-floating");
  whiteBox.style.display = 'flex';
  whiteBox.style.flexDirection = 'column';
  whiteBox.style.justifyContent = 'flex-start';
  whiteBox.style.backgroundColor = "white";
  whiteBox.style.padding = '20px';

  // Create a form
  const form = document.createElement("form");
  form.id = "printForm";
  form.classList.add("activity-map-print-form");
  form.noValidate = true;

  // --- Theme select (replaces the calcite-dropdown) ---
  const themeLabel = document.createElement("calcite-label");
  themeLabel.layout = "inline";        // matches your other label + control rows
  themeLabel.scale = "m";

  const themeText = document.createElement("span");
  themeText.textContent = "Select theme ";
  const themeReq = document.createElement("span");
  themeReq.textContent = "*";
  themeReq.style.color = "red";

  const themeSelect = document.createElement("calcite-select");
  themeSelect.id = "themeSelect";
  themeSelect.name = "themeName";       // so FormData picks it up
  themeSelect.required = true;
  themeSelect.scale = "m";
  themeSelect.width = "full";           // full row, left-aligned like the others
  themeSelect.style.paddingBottom = "10px";

  themeLabel.appendChild(themeText);
  themeLabel.appendChild(themeReq);
  //themeLabel.appendChild(themeSelect);
  form.appendChild(themeLabel);
  form.appendChild(themeSelect);

  // Populate options from the print server
  fetchThemeChoices()
    .then(function (choices) {
      const def = choices.includes("activity") ? "activity" : choices[0];
      choices.forEach(function (t) {
        const opt = document.createElement("calcite-option");
        opt.value = t;
        opt.label = t.replace(/_/g, " ");
        if (t === def) opt.selected = true;
        themeSelect.appendChild(opt);
      });
    })
    .catch(function (err) {
      console.error("Failed to load themeName choices:", err);
      const opt = document.createElement("calcite-option");
      opt.value = "";
      opt.label = "Unable to load themes";
      opt.disabled = true;
      opt.selected = true;
      themeSelect.appendChild(opt);
      VV.Form.Global.GIS_ShowDangerAlert(view, "Print themes unavailable. Try again.");
    });


  // PDF TIFF Label
  const pdftifButtonsLabel = document.createElement("calcite-label");
  pdftifButtonsLabel.layout = "inline"; // keeps things in one line

  // Create a span for the main text
  const labelText = document.createElement("span");
  labelText.textContent = "Select file format ";

  // Create a span for the red asterisk
  const requiredMark = document.createElement("span");
  requiredMark.textContent = "*";
  requiredMark.style.color = "red";

  // Append both spans into the label
  pdftifButtonsLabel.appendChild(labelText);
  pdftifButtonsLabel.appendChild(requiredMark);

  const tooltipsPdfTiff = document.createElement("calcite-tooltip");
  tooltipsPdfTiff.textContent = "Select PDF if you are creating a map to submit with a Forest Practices application. The TIFF option is provided as a courtesy if you wish to export a TIFF -format map for your own use.";

  form.appendChild(pdftifButtonsLabel);
  form.appendChild(tooltipsPdfTiff);

  tooltipsPdfTiff.referenceElement = pdftifButtonsLabel;

  //Add group radio buttons
  const pdftifButtons = document.createElement("calcite-radio-button-group");
  pdftifButtons.name = "pdftifbtns";
  pdftifButtons.layout = "horizontal";
  pdftifButtons.required = true;

  // Helper to add one option
  function addFileFormatOption(value, text) {
    const label = document.createElement("calcite-label"); // <-- fixed typo
    label.layout = "inline";
    label.textContent = text;

    const radio = document.createElement("calcite-radio-button");
    radio.value = value;

    //set default value to PDF
    if (text === "PDF") {
      radio.checked = true;
    }

    label.appendChild(radio);
    pdftifButtons.appendChild(label);
  }

  // Add options
  addFileFormatOption("pdf", "PDF");
  addFileFormatOption("tif", "TIFF");

  // show custom inline message when invalid
  function showGroupError(msg) {
    pdftifButtons.validationMessage = msg; // text under the group
    pdftifButtons.status = "invalid";      // makes it visible
  }

  // clear the inline message
  function clearGroupError() {
    pdftifButtons.validationMessage = "";
    pdftifButtons.status = "idle";
  }

  // clear error as soon as user picks one
  pdftifButtons.addEventListener("calciteRadioButtonGroupChange", clearGroupError);

  form.appendChild(pdftifButtons);


  // Label + TextArea
  const additionalInfoLabel = document.createElement("calcite-label");
  additionalInfoLabel.textContent = "Optional - Enter additional information";

  const additionalInfo = document.createElement("calcite-text-area");
  additionalInfo.id = "textArea";
  additionalInfo.name = "notes"; // important so FormData picks it up
  additionalInfo.maxLength = 500;
  additionalInfo.placeholder = "Enter in additional information...";

  const tooltipsAdditionalInfo = document.createElement("calcite-tooltip");
  tooltipsAdditionalInfo.textContent = "Notes apply only to the Activity and Water Type themes.";


  additionalInfoLabel.appendChild(additionalInfo);
  form.appendChild(additionalInfoLabel);
  form.appendChild(tooltipsAdditionalInfo);

  tooltipsAdditionalInfo.referenceElement = additionalInfo;

  //Adding Radio Buttons for print scale

  const printScaleBtnLabel = document.createElement("calcite-label");
  printScaleBtnLabel.layout = "inline"; // keeps things in one line

  // Create a span for the main text
  const printScaleLabelText = document.createElement("span");
  printScaleLabelText.textContent = "Select print scale ";

  // Create a span for the red asterisk
  const printScaleRequiredMark = document.createElement("span");
  printScaleRequiredMark.textContent = "*";
  printScaleRequiredMark.style.color = "red";

  // Append both spans into the label
  printScaleBtnLabel.appendChild(printScaleLabelText);
  printScaleBtnLabel.appendChild(printScaleRequiredMark);

  form.appendChild(printScaleBtnLabel);

  const tooltipsPrintScale = document.createElement("calcite-tooltip");
  tooltipsPrintScale.textContent = "Select 1:12,000 or 1:4800 when submitting an FPA/N or Water Type Modification";

  form.appendChild(printScaleBtnLabel);
  form.appendChild(tooltipsPrintScale);

  tooltipsPrintScale.referenceElement = printScaleBtnLabel;

  //Add group radio buttons
  const printScaleBtns = document.createElement("calcite-radio-button-group");
  printScaleBtns.name = "printscalebtns";
  printScaleBtns.layout = "horizontal";
  printScaleBtns.required = true;

  const mobileQuery = window.matchMedia("(max-width: 768px)");
  const syncRadioLayout = (isMobile) => {
    const nextLayout = isMobile ? "vertical" : "horizontal";
    pdftifButtons.layout = nextLayout;
    printScaleBtns.layout = nextLayout;
  };

  syncRadioLayout(mobileQuery.matches);
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", (event) => syncRadioLayout(event.matches));
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener((event) => syncRadioLayout(event.matches));
  }

  function addPrintScaleOption(value, text) {
    const label = document.createElement("calcite-label"); // <-- fixed typo
    label.layout = "inline";
    label.textContent = text;

    const radio = document.createElement("calcite-radio-button");
    radio.value = value;

    //set default value to 12000
    if (text === "1:12,000") {
      radio.checked = true;
    }

    label.appendChild(radio);
    printScaleBtns.appendChild(label);
  }

  // Add options
  addPrintScaleOption("4800", "1:4,800");
  addPrintScaleOption("12000", "1:12,000");
  addPrintScaleOption("24000", "1:24,000");


  // show custom inline message when invalid
  function showPrintScaleGroupError(msg) {
    printScaleBtns.validationMessage = msg; // text under the group
    printScaleBtns.status = "invalid";      // makes it visible
  }

  // clear error as soon as user picks one
  printScaleBtns.addEventListener("calciteRadioButtonGroupChange", clearGroupError);

  form.appendChild(printScaleBtns);

  //Submit Print Button

  const hiddenSubmit = document.createElement("button");
  hiddenSubmit.type = "submit";
  hiddenSubmit.style.display = "none";
  form.appendChild(hiddenSubmit);

  //Submit Button (Calcite)
  const submitBtn = document.createElement("calcite-button");
  submitBtn.width = "full";
  submitBtn.appearance = "solid";
  submitBtn.innerText = "Print Map";
  submitBtn.addEventListener("click", () => hiddenSubmit.click());
  form.appendChild(submitBtn);

  // Form Submit Event
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    VV.Form.ShowLoadingPanel();
    // Usage:
    findNoValueRecords(webmap).then(noValueData => {
      console.log("DONE:", noValueData);
      VV.Form.HideLoadingPanel();
      if (noValueData.length > 0) {
        const layersWithIssues = noValueData.map(d => `Unable to print because feature ${d.layerTitle}: ${d.count} records have no value`).join("\n");

        // 1° Get the first layer that has bad records
        const firstLayerResult = noValueData[0];
        const firstObjectId = firstLayerResult.objectIds[0];

        // 2° Find the corresponding layer in the webmap
        const layer = webmap.layers.find(function (lyr) {
          return lyr.id === firstLayerResult.layerId;
        });

        if (!layer || firstObjectId == null) {
          console.warn("Could not find layer or ObjectID to zoom to.");
          return;
        }

        // 3° Zoom to that feature using queryExtent + goTo
        layer.refresh(); // optional
        layer.load()
          .then(function () {
            return layer.queryExtent({ objectIds: [firstObjectId] });
          })
          .then(function (result) {
            if (result && result.extent) {
              view.goTo(result.extent.expand(1.2));
            } else {
              VV.Form.Global.GIS_ShowDangerAlert(view, "No extent returned for ObjectID: "  + firstObjectId);
              console.warn("No extent returned for ObjectID: " + firstObjectId);
            }
          })
          .catch(function (error) {
            VV.Form.Global.GIS_ShowDangerAlert(view, "Error zooming to first 'No Value' feature: " + error.message);
            console.error("Error zooming to first 'No Value' feature:", error);
          });


        VV.Form.Global.GIS_ShowDangerAlert(view, layersWithIssues);
      } else {
        customElements.whenDefined("calcite-radio-button-group").then(() => {

          theme = themeSelect.value;  // from the element we just created
          if (!theme) {
            VV.Form.Global.GIS_ShowDangerAlert(view, "Please choose a theme before printing.");
            themeSelect.setFocus?.();
            return;
          }

          if (!pdftifButtons.selectedItem?.value) {
            event.preventDefault();
            showGroupError("Please choose PDF or TIFF before printing.");
            pdftifButtons.setFocus?.(); // optional: focus the group
            return;
          }
          const fileFormat = pdftifButtons.selectedItem.value;
          console.log("Selected : ", fileFormat);

          clearGroupError();
          event.preventDefault();


          if (!printScaleBtns.selectedItem?.value) {
            event.preventDefault();
            showPrintScaleGroupError("Please choose a print scale before printing.");
            printScaleBtns.setFocus?.(); // optional: focus the group
            return;
          }
          const printScaleValue = printScaleBtns.selectedItem.value;
          console.log("Selected : ", printScaleValue);


          clearGroupError();
          event.preventDefault();

          const formData = new FormData(form);
          const additionalInformationText = formData.get("notes"); // comes from `name="notes"`

          // Validate that there are no features with "no value" set
          // I will need to make a call to 

          view.goTo({ target: view.center, scale: printScaleValue }, { duration: 0 })
            .then(function () {
              const printAOI = view.extent.clone();
              VV.Form.ShowLoadingPanel();
              return getTownshipSectionRangeForFeaturesInExtent(view, webmap, printAOI)
                .then(function (legalDescriptionStr) {
                  return sendPrintJob(
                    view,
                    legalDescriptionStr,
                    additionalInformationText,
                    fileFormat,
                    printScaleValue,
                    themeSelect.value
                  );
                })
                .catch(function (err) {
                  VV.Form.HideLoadingPanel();
                  VV.Form.Global.GIS_ShowDangerAlert(view, "Print job failed to return township, section, range.");
                  // This only catches TRS lookup failures
                  console.error("Failed to get township/section/range:", err);
                  // Optionally rethrow if you want the outer catch to see it too:
                  // throw err;
                });
            })
            .catch(function (err) {
              VV.Form.Global.GIS_ShowDangerAlert(view, "Zoom to print scale failed to load");
              VV.Form.HideLoadingPanel();
              // This only catches goTo() failures (or rethrows from above if you enable it)
              console.error("Zoom to print scale failed:", err);
            });
        });
      }
    });
  });

  whiteBox.appendChild(form);
  return whiteBox;
}



function appendTokenToUrl(url, token) {
  if (!url || !token) return url;

  try {
    const lyrURL = new URL(url);
    const host = lyrURL.host.toLowerCase();

    // 1) Never send AGO token to DNR Enterprise
    if (host === "gis.dnr.wa.gov") {
      lyrURL.searchParams.delete("token");
      return lyrURL.toString();
    }

    // 2) Only add token for YOUR AGO org
    if (host === "services3.arcgis.com") {
      lyrURL.searchParams.delete("token");                 // de-dupe
      lyrURL.searchParams.set("token", token);
      return lyrURL.toString();
    }

    // 3) Everyone else: don't add your AGO token
    lyrURL.searchParams.delete("token");
    return u.toString();
  } catch {
    // Fallback for non-parseable URLs
    if (String(url).toLowerCase().includes("gis.dnr.wa.gov")) return url;
    if (String(url).toLowerCase().includes("services3.arcgis.com")) {
      const sep = url.includes("?") ? "&" : "?";
      return url + sep + "token=" + encodeURIComponent(token);
    }
    return url;
  }
}

function layerToPrintSpec(layer, token) {
  let layerId = layer.layerId;
  // Skip layers that aren’t visible or that are missing
  if (!layer || !layer.visible) { return null; }

  // ---------------------------------------------------------------------------
  // 1. Tiled or imagery-tile services
  // ---------------------------------------------------------------------------
  if (layer.type === "tile" || layer.type === "imagery-tile") {
    return {
      layerType: "ArcGISTiledMapServiceLayer",
      url: appendTokenToUrl(layer.url, token),
      id: layer.id,
      title: layer.title,
      opacity: layer.opacity,
      minScale: (layer.minScale != null ? layer.minScale : 0),
      maxScale: (layer.maxScale != null ? layer.maxScale : 0)
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Map-image (supports sub-layers)
  // ---------------------------------------------------------------------------
  if (layer.type === "map-image") {
    // Build a list of sub-layers that are ON right now
    var subLayers;

    if (layer.sublayers && layer.sublayers.length) {
      subLayers = layer.sublayers
        .filter(function (s) { return s.visible; })
        .map(function (s) {
          return {
            id: s.id,
            name: null,
            layerDefinition: {
              drawingInfo: { showLabels: true },
              source: { type: "mapLayer", mapLayerId: s.id }
            }
          };
        });
    } else {
      // Bare feature layer (no sublayer collection)
      subLayers = [{
        id: 0,
        name: null,
        layerDefinition: {
          drawingInfo: { showLabels: true },
          source: { type: "mapLayer", mapLayerId: 0 }
        }
      }];
    }

    // Assemble the spec object
    var mapImageSpec = {
      layerType: "ArcGISMapServiceLayer",
      url: appendTokenToUrl(layer.url, token) ? appendTokenToUrl(layer.url.replace(/\/\d+$/, ""), token) : "",
      id: layer.id,
      title: layer.title,
      opacity: layer.opacity,
      minScale: (layer.minScale != null ? layer.minScale : 0),
      maxScale: (layer.maxScale != null ? layer.maxScale : 0),
      layers: subLayers
    };

    // Add a token only when one was supplied
    if (token) { mapImageSpec.token = token; }

    return mapImageSpec;
  }

  // ---------------------------------------------------------------------------
  // 3. Feature (stand-alone FeatureLayer)
  // ---------------------------------------------------------------------------
  if (layer.type === "feature") {
    const drawingInfo = {};
    if (layer.renderer) {
      drawingInfo.renderer = typeof layer.renderer.toJSON === "function"
        ? layer.renderer.toJSON()
        : layer.renderer;
    }
    if (layer.labelingInfo) {
      drawingInfo.labelingInfo = typeof layer.labelingInfo.toJSON === "function"
        ? layer.labelingInfo.toJSON()
        : layer.labelingInfo;
    }
    let featureWebmap =
    {
      layerType: "ArcGISFeatureLayer",
      // keep the full layer URL as-is (…/FeatureServer/0). Do NOT append "/layerId".
      url: appendTokenToUrl(layer.url + "/" + layerId, token),                     // keep full URL (/FeatureServer/7)
      id: layer.id,
      title: layer.title,
      opacity: layer.opacity,
      minScale: (layer.minScale != null ? layer.minScale : 0),
      maxScale: (layer.maxScale != null ? layer.maxScale : 0),
      layerDefinition: {
        drawingInfo,
        definitionExpression: layer.definitionExpression
      }
    };
    if (layer.type === "feature" && layer.title === "Text") {
      featureWebmap.showLabels = true;
    }
    if (new URL(layer.url).hostname === "services3.arcgis.com") {
      featureWebmap.token = token;
    }
    return featureWebmap
  }



  // ---------------------------------------------------------------------------
  // 3. Vector-tile services
  // ---------------------------------------------------------------------------
  if (layer.type === "vector-tile") {
    return {
      type: "VectorTileLayer",
      styleUrl: layer.styleUrl,
      id: layer.id,
      title: layer.title,
      opacity: layer.opacity,
      minScale: (layer.minScale != null ? layer.minScale : 0),
      maxScale: (layer.maxScale != null ? layer.maxScale : 0)
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Graphics / sketch layers
  // ---------------------------------------------------------------------------
  if (layer.type === "graphics") {
    var geometryType = layer.geometryType || "";
    return {
      featureCollection: {
        layers: [{
          layerDefinition: {
            name: layer.title || "Graphics",
            geometryType: "esriGeometry" + geometryType.replace("esriGeometry", "")
          },
          featureSet: {
            geometryType: geometryType,
            features: (layer.graphics || []).map(function (g) {
              return g.toJSON();
            })
          }
        }]
      },
      id: layer.id,
      title: layer.title,
      opacity: layer.opacity,
      minScale: 0,
      maxScale: 0
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Any other layer types — skip them
  // ---------------------------------------------------------------------------
  return null;
}

function isInBaseGroup(layer) {
  let lyr = layer && layer.parent;
  while (lyr) { if (lyr.title === "Base Layers") return true; lyr = lyr.parent; }
  return false;
}
function walkGroup(groupLayer, cb) {
  // preserve draw order: bottom → top
  groupLayer.layers.forEach(lyr => lyr.type === "group" ? walkGroup(lyr, cb) : cb(lyr));
}

function findGroupByTitle(map, title) {
  // Searches top-level + nested groups
  let found = null;
  map.allLayers.forEach(function (lyr) {
    if (!found && lyr.type === "group" && lyr.title === title) found = lyr;
  });
  return found;
}


/**
 * buildBaseMap(view)
 * Returns a ready-to-insert { baseMap:{ title, baseMapLayers:[ … ] } } object.
 */
function buildBaseMap(view) {
  const baseMapLayers = [];

  // Add visible base layers first (hillshade, imagery, etc.)
  view.map.basemap.baseLayers.forEach(bl => {
    if (!bl.visible) { return; }

    const isVector = bl.type === "vector-tile";

    // Common fields for every basemap layer
    const layerSpec = {
      layerType: isVector ? "VectorTileLayer" : "ArcGISTiledMapServiceLayer",
      url: bl.url,                       // or bl.styleUrl for vectors if you store it there
      id: bl.id,
      title: bl.title,
      opacity: bl.opacity ?? 1,
    };

    // Vector-tile layers need an explicit "type" property in the ExportWebMap spec
    // so the print service knows they come with an external style JSON.
    if (isVector) {
      layerSpec.type = "VectorTileLayer";
      layerSpec.styleUrl = bl.url;
      layerSpec.url = bl.serviceUrl;
    }

    baseMapLayers.push(layerSpec);

    // Reference layers (boundaries, labels) sit above base layers
    if (view.map.basemap.referenceLayers) {
      view.map.basemap.referenceLayers.forEach(rl => {
        if (rl.visible) {
          // Common fields for every basemap layer
          const refLayerSpec = {
            layerType: isVector ? "VectorTileLayer" : "ArcGISTiledMapServiceLayer",
            url: rl.url,                       // or bl.styleUrl for vectors if you store it there
            id: rl.id,
            title: rl.title,
            opacity: rl.opacity ?? 1,
          };

          if (isVector) {
            layerSpec.type = "VectorTileLayer";
            layerSpec.styleUrl = rl.url;
            layerSpec.url = rl.serviceUrl;
          }


          // Reference layers (boundaries, labels) sit above base layers
          baseMapLayers.push(refLayerSpec);
        }
      });
    }
  });

  return {
    title: view.map.basemap.title || "Basemap",
    baseMapLayers
  };
}


function buildOperationalLayers(view, token) {
  const ops = [];

  // 1) “Base Layers” group (FeatureLayers only) -> add FIRST so they draw at the bottom
  const baseGroup = findGroupByTitle(view.map, "Base Layers");
  if (baseGroup && baseGroup.visible) {
    walkGroup(baseGroup, lyr => {
      if (!lyr.visible) return;
      if (lyr.type === "feature" || lyr.type === "graphics") {
        const spec = layerToPrintSpec(lyr, token);
        if (spec) {
          // spec.showLegend = false; // uncomment to hide these in legend
          ops.push(spec);
        }
      }
    });
  }

  // 2) All other visible operational layers that are NOT in the Base Layers group
  //    Use allLayers so we include children inside other groups too.
  view.map.allLayers.forEach(l => {
    if (!l.visible) return;
    if (isInBaseGroup(l)) return;                    // already added above
    if (l.type === "feature" || l.type === "graphics" || l.type === "map-image") {
      const spec = layerToPrintSpec(l, token);
      if (spec) ops.push(spec);
    }
  });

  return ops;  // draw order: base-group features (bottom) → other ops (top)
}


function getTownshipSectionRangeForFeaturesInExtent(view, webmap, aoiGeom) {
  const sectionsUrl = "https://gis.dnr.wa.gov/site3/rest/services/Public_Boundaries/WADNR_PUBLIC_Public_Land_Survey/MapServer/8";

  return new Promise((resolve, reject) => {
    require(
      ["esri/layers/FeatureLayer", "esri/rest/support/Query", "esri/geometry/geometryEngine"],
      async (FeatureLayer, Query, geometryEngine) => {
        const dropdown = document.querySelector("#trsCombobox");
        const refreshButton = document.querySelector("#refreshTRSButton");

        const setLoading = () => {
          if (dropdown) {
            dropdown.disabled = true;
            dropdown.innerHTML = "";
            const loading = document.createElement("calcite-combobox-item");
            loading.value = "__loading__";
            loading.textLabel = "Loading…";
            loading.heading = "Loading…";
            dropdown.appendChild(loading);
          }
          if (refreshButton) refreshButton.disabled = true;
        };


        const isInBaseGroup = (layer) => {
          let p = layer && layer.parent;
          while (p) {
            if (p.title === "Base Layers") return true;
            p = p.parent;
          }
          return false;
        };

        setLoading();

        try {
          const searchGeom = aoiGeom ? aoiGeom : view.extent.clone();

          const operationalLayers = webmap.allLayers
            .toArray()
            .filter(l => l.type === "feature" && l.visible && !isInBaseGroup(l));

          if (!operationalLayers.length) {
            resolve(""); // no layers => empty description
            return;
          }

          const sectionsLayer = new FeatureLayer({
            url: sectionsUrl,
            outFields: ["TWP_GRID_NO", "RNG_GRID_NO", "PLS_TWP_SUBDIV_NO"]
          });

          // 1) Sections intersecting the AOI
          const qSections = sectionsLayer.createQuery();
          qSections.geometry = searchGeom;
          qSections.spatialRelationship = "intersects";
          qSections.outFields = ["TWP_GRID_NO", "RNG_GRID_NO", "PLS_TWP_SUBDIV_NO"];
          qSections.returnGeometry = true;

          const sectionsFS = await sectionsLayer.queryFeatures(qSections);
          if (!sectionsFS.features.length) {
            resolve(""); // no sections hit
            return;
          }

          // 2) For each section, count features only inside (Section ∩ AOI)
          const uniqueTRS = new Map();

          for (const sec of sectionsFS.features) {
            const { TWP_GRID_NO: t, RNG_GRID_NO: r, PLS_TWP_SUBDIV_NO: s } = sec.attributes;
            const geomToTest = geometryEngine.intersect(sec.geometry, searchGeom) || sec.geometry;

            let hasAnyFeature = false;

            for (const lyr of operationalLayers) {
              if (typeof lyr.queryFeatureCount !== "function") continue;

              const lv = await view.whenLayerView(lyr);

              const q = lyr.createQuery();
              q.geometry = geomToTest;
              q.spatialRelationship = "intersects";
              q.returnGeometry = false;
              q.where = (lyr.definitionExpression && lyr.definitionExpression.trim()) || "1=1";

              try {
                let cnt = await lv.queryFeatureCount(q);
                if (cnt > 0) { hasAnyFeature = true; break; }
              } catch (e) {
                if (e.name === "unsupported-query" || /invalid|missing fields/i.test(e.message || "")) {
                  q.where = "1=1";
                  try {
                    const cnt2 = await lv.queryFeatureCount(q);
                    if (cnt2 > 0) { hasAnyFeature = true; break; }
                  } catch (e2) {
                    console.warn(`Count still failed for "${lyr.title}":`, e2);
                  }
                } else {
                  console.warn(`Count failed for "${lyr.title}":`, e);
                }
              }
            }

            if (hasAnyFeature) {
              const key = `${t}-${r}-${s}`; // key format is arbitrary, just needs to be unique
              if (!uniqueTRS.has(key)) uniqueTRS.set(key, { t, r, s });
            }
          }

          // 3) Build TSR string for legal_description
          const items = Array.from(uniqueTRS.values())
            .sort((a, b) => (a.t - b.t) || (a.r - b.r) || (a.s - b.s))
            .map(({ t, r, s }) => ({ value: `${t}-${r}-${s}`, label: `T${t} R${r} S${s}` }));


          const legalDescriptionStr = items.map(i => i.label).join("; ");
          resolve(legalDescriptionStr); // ✅ resolve the promise with the string
        } catch (err) {
          console.error("TRS lookup failed:", err);
          reject(err); // ✅ bubble up to your .catch()
        }
      },
      // optional AMD error callback:
      (err) => reject(err)
    );
  });
}


function sendPrintJob(view, legalDescriptionStr, additionalInformationText, fileFormat, printScaleValue, theme) {

  // Build filename
  const outputFileName = theme + "-" + mm + "-" + dd + "-" + yyyy + "T" + unixTimestamp;

  const operationalLayers = buildOperationalLayers(view, token);

  const webMapSpec = {
    operationalLayers,
    baseMap: buildBaseMap(view),
    mapOptions: {
      extent: view.extent.toJSON(),   // current extent
      spatialReference: view.spatialReference.toJSON(),
      showAttribution: true,
      scale: printScaleValue
    },
    exportOptions: { dpi: 96, outputSize: [800, 1100] },
    layoutOptions: {
      titleText: "",  // You can pass something like "My Map Title"
      authorText: "",
      copyrightText: "",
      scalebarUnit: "Miles",
      legendOptions: {
        operationalLayers: operationalLayers
      }
    }
  };

  const printParams = {
    // core print-service parameters --------------------------------------------
    f: "json",
    outputFormat: fileFormat,
    pageSize: "Letter",
    pageOrientation: "Portrait",
    context: "",

    // entire web-map payload ----------------------------------------------------
    Web_Map_as_JSON: JSON.stringify(webMapSpec),


    // DNR PRINT Parameters ---------------------------------------------
    //appName: "fpram", not need now?
    themeName: theme,

    //includeLegend: null,
    legendPageSize: "",
    legendPageOrientation: "",

    outputFileName: outputFileName,
    outputFilePath: "",

    "env:outSR": "",
    "env:processSR": "",

    returnZ: false,
    returnM: false,
    returnTrueCurves: false
  };

  const textEls = {
    title_text: theme,
    notes: additionalInformationText,
    legal_description: legalDescriptionStr
  };

  printParams.layoutTextElements = JSON.stringify(textEls);


  const printServerExecute = PRINT_SERVER_URL + "/execute/";


  fetch(printServerExecute, {
    method: "POST",
    body: new URLSearchParams(printParams),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  })
    .then(res => res.json())
    .then(data => {
      VV.Form.HideLoadingPanel();
      if (data.error) {
        console.error("Print Server error:", data.error.message);
        VV.Form.Global.GIS_ShowDangerAlert(view, "An error occurred on the print server : " + data.error.details[0]);
        return;
      }

      const fileUrl = data.results[0].value.url;
      console.log("File available immediately:", fileUrl);

      printMap(fileUrl, outputFileName);
    })
    .catch(err => {
      VV.Form.HideLoadingPanel();
      console.error("Print job failed:", err);
      VV.Form.Global.GIS_ShowDangerAlert(view, "An error occurred while creating the PDF. Please try again later" + 'Error');
    });

}

function printMap(link, outputFileName, hintedFormat = "pdf") {
  console.log("Print Button Clicked");
  return fetchFileWithRetries(link, 10)
    .then(({ blob, contentType }) => {
      if (!blob) throw new Error("No blob returned from fetch.");
      // Decide extension: URL first, then content-type, then hinted format
      const urlExt = getExtensionFromUrl(link);                // 'pdf' | 'tif' | 'tiff' | null
      const typeExt = mapContentTypeToExt(contentType);        // 'pdf' | 'tif' | null
      const finalExt = (urlExt || typeExt || hintedFormat || "pdf").toLowerCase() === "tiff" ? "tif" : (urlExt || typeExt || hintedFormat || "pdf").toLowerCase();
      const fileName = outputFileName + "." + finalExt;
      const finalBlob = blob;
      const objectUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    })
    .catch(error => {
      console.error("Print Task Error:", error);
      VV.Form.Global.GIS_ShowDangerAlert(view, "An error occurred while creating the PDF. Please try again later" + 'Error');
    });
}
function fetchFileWithRetries(url, maxRetries = 3) {
  // add a cache-busting query param
  const busted = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
  return fetch(busted, {
    method: 'GET',
    cache: 'no-store',
    mode: 'cors',
    credentials: 'omit'
  }).then(response => {
    if (!response.ok) {
      if (maxRetries > 0) {
        console.log(`Retrying... attempts left: ${maxRetries}`);
        return new Promise(resolve => setTimeout(resolve, 3000))
          .then(() => fetchFileWithRetries(url, maxRetries - 1));
      } else {
        console.error("HTTP Error: " + response.status + " " + response.statusText);
        throw new Error(`Failed to download file after multiple attempts. Status: ${response.status}`);
      }
    }
    const contentType = response.headers.get("content-type") || "";
    return response.blob().then(blob => ({ blob, contentType }));
  });
}
// Helpers
function getExtensionFromUrl(link) {
  try {
    const u = new URL(link);
    const m = u.pathname.match(/\.([a-z0-9]+)$/i);
    if (!m) return null;
    const ext = m[1].toLowerCase();
    if (ext === "pdf" || ext === "tif" || ext === "tiff") return ext;
    return null;
  } catch {
    return null;
  }
}
function mapContentTypeToExt(ct = "") {
  const t = ct.toLowerCase();
  if (t.includes("application/pdf")) return "pdf";
  if (t.includes("image/tiff")) return "tif";
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                  MAIN CODE                                 */
/* -------------------------------------------------------------------------- */

let whiteBox = createWhiteBox(view);

const printer = document.querySelector("#printWidgetDiv");

printer.appendChild(whiteBox);

}
