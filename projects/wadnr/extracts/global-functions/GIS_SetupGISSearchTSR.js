/**
 * VV.Form.Global.GIS_SetupGISSearchTSR
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (view) {
/*Function Name:   GIS_SetupGISSearchTSR
  Customer:       WA FNR: fpOnline
  Purpose:        Creates a drop-down list a user can use for finding Township, Section, Range. 
                  Queries DNR's WADNR_PUBLIC_Public_Land_Survey layer for the Township Section Range
                  and zooms into that location. 
  Date of Dev:   05/28/2025
  Last Rev Date: 05/28/2025

  Parameters: view (Object) AGOL view of the webmap

  05/20/2025 - Ross Rhone: First setup of script.
  04/08/2026 - Ross Rhone: Making this UI mobile friendly                         

*/

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

function createWhiteBox() {
    // Create float in animation for whitebox
    if (!document.getElementById("activity-map-search-animation-style")) {
      const style = document.createElement("style");
      style.id = "activity-map-search-animation-style";
      style.innerHTML = `
      @keyframes floatAnimation {
        0% {
          transform: translateX(10px);
          opacity: 0;
        }
        100% {
          transform: translateX(0px); /* Move to the right */
          opacity: 1;
        }
      }
  
      .white-box-floating {
        animation: floatAnimation 0.3s ease-in-out;
      }
    `;
      document.head.appendChild(style);
    }
  
    // Create the white box container
    const whiteBox = document.createElement("div");
    whiteBox.id = "searchWhitebox";
    whiteBox.classList.add("activity-map-whitebox", "white-box-floating");
    whiteBox.style.display = "flex";
    whiteBox.style.flexDirection = "column";
    whiteBox.style.justifyContent = "flex-start";
  
    // Create a paragraph
    const paragraph = document.createElement("p");
    paragraph.textContent = "Enter the township, range, and section to search the map for a plot.";
    whiteBox.appendChild(paragraph);
  
    whiteBox.style.backgroundColor = "white";
    whiteBox.style.padding = "0.5rem";
  
    createDropDownList(whiteBox);
    return whiteBox;
  }

  function createDropDownList(whiteBox) {
    // 1. Check if the dropdown is already in whiteBox
    let existingSelect = whiteBox.querySelector("#townshipSelect");
    if (existingSelect) {
      console.log("Dropdown already exists in whiteBox. Doing nothing.");
      return;
    }
  
    const labelTwn = document.createElement("label");
    labelTwn.textContent = "Select Township: ";
    labelTwn.setAttribute("for", "townshipSelect");
    labelTwn.style.marginRight = 'auto'
    
    let selectTwn = document.createElement('calcite-select')
    selectTwn.id = 'townshipSelect'
    selectTwn.addEventListener("calciteSelectChange", (event) => {
      handleTownshipSelect(event, whiteBox);
    });
  
    let url =
      'https://gis.dnr.wa.gov/site3/rest/services/Public_Boundaries/WADNR_PUBLIC_Public_Land_Survey/MapServer/4/query?where=1%3D1&outFields=TWP_GRID_NO&returnGeometry=false&returnDistinctValues=true&orderByFields=TWP_GRID_NO&f=pjson';
    fetch(url)
      .then(response => {
        return response.json();
      })
      .then(data => {
  
        // 1. Add a placeholder option first
        const placeholderOption = document.createElement("calcite-option");
        placeholderOption.value = "";
        placeholderOption.textContent = "Select a township...";
        placeholderOption.selected = true;
        placeholderOption.disabled = true;
        selectTwn.appendChild(placeholderOption);
  
        data.features.forEach(feature => {
  
          const optionEl = document.createElement("calcite-option");
          const townshipValue = feature.attributes.TWP_GRID_NO;
  
          optionEl.value = townshipValue;       // programmatic value
          optionEl.label = townshipValue; // text shown to the user
          selectTwn.appendChild(optionEl);
        });
        console.log("Response data: ", data);
  
        whiteBox.appendChild(labelTwn);
        whiteBox.appendChild(selectTwn);
      });
  }
  
  function handleTownshipSelect(event, whiteBox) {
    console.log("User selected township:", event.target.value);
  
    const selectedTownship = event.target.value; // e.g. "T01N"
    if (!selectedTownship) return;
  
    // 1. Check if #rangeSelect already exists
    let selectRng = whiteBox.querySelector("#rangeSelect");
    let labelRng = whiteBox.querySelector("#rangeSelectLabel");
  
    // If not found, create them
    if (!selectRng) {
      // Create the label
      labelRng = document.createElement("label");
      labelRng.id = "rangeSelectLabel";
      labelRng.textContent = "Select Range: ";
      labelRng.setAttribute("for", "rangeSelect");
      labelRng.style.marginRight = 'auto'
      labelRng.style.marginTop = '10px'
  
      // Create the <select> element
      selectRng = document.createElement("calcite-select");
      selectRng.id = "rangeSelect";
      
      // If you want a change handler for range, attach it here:
      selectRng.addEventListener("calciteSelectChange", (event) => {
        handleRangeSelect(event, whiteBox);
      });
  
      whiteBox.appendChild(labelRng);
      whiteBox.appendChild(selectRng);
    } else {
      // If it already exists, remove old options
      // (clear the select so we can repopulate)
      selectRng.innerHTML = "";
    }
  
    // Because TWP_GRID_NO is presumably a string field in the service,
    // we wrap the value in single quotes in the where clause:
    const whereClause = `TWP_GRID_NO='${selectedTownship}'`;
  
    // Build a new query string, encoding the where clause
    const urlFilter = 
      "https://gis.dnr.wa.gov/site3/rest/services/Public_Boundaries/"
      + "WADNR_PUBLIC_Public_Land_Survey/MapServer/4/query"
      + `?where=${encodeURIComponent(whereClause)}`
      + "&outFields=RNG_GRID_NO"
      + "&returnDistinctValues=true"
      + "&returnGeometry=false"
      + "&orderByFields=RNG_GRID_NO"
      + "&f=pjson";
  
    fetch(urlFilter)
      .then(response => {
        return response.json();
      })
      .then(data => {
  
        // 1. Add a placeholder option first
        const placeholderOption = document.createElement("calcite-option");
        placeholderOption.value = "";
        placeholderOption.textContent = "Select a range...";
        placeholderOption.selected = true;
        placeholderOption.disabled = true;
        selectRng.appendChild(placeholderOption);
  
        data.features.forEach(feature => {
  
          const optionEl = document.createElement("calcite-option");
          const rangeValue = feature.attributes.RNG_GRID_NO;
  
          optionEl.value = rangeValue;       // programmatic value
          optionEl.label = rangeValue; // text shown to the user
          selectRng.appendChild(optionEl);
        });
        console.log("Response data: ", data);
      });
  }
  
  function handleRangeSelect(event, whiteBox) {
    console.log("User selected range:", event.target.value);
    
    // 0. Get selectedTownship
    let selectTwn = whiteBox.querySelector("#townshipSelect");
    let selectedTownship = selectTwn.value;
  
    const selectedRange = event.target.value; // e.g. "T01N"
    if (!selectedRange) return;
  
    // 1. Check if #rangeSelect already exists
    let selectSection = whiteBox.querySelector("#sectionSelect");
    let labelSection = whiteBox.querySelector("#sectionSelectLabel");
  
    // If not found, create them
    if (!selectSection) {
  
      // Create the label
      labelSection = document.createElement("label");
      labelSection.id = "sectionSelectLabel";
      labelSection.textContent = "Select Section: ";
      labelSection.setAttribute("for", "sectionSelect");
      labelSection.style.marginRight = 'auto'
      labelSection.style.marginTop = '10px'
  
      selectSection = document.createElement('calcite-select')
      selectSection.id = "sectionSelect";
      
      // If you want a change handler for range, attach it here:
      selectSection.addEventListener("calciteSelectChange", (event) => {
        handlSectionSelect(event);
      });
  
      whiteBox.appendChild(labelSection);
      whiteBox.appendChild(selectSection);
    } else {
      // If it already exists, remove old options
      // (clear the select so we can repopulate)
      selectSection.innerHTML = "";
    }
  
    const whereClause = `TWP_GRID_NO='${selectedTownship}' AND RNG_GRID_NO='${selectedRange}'`;
  
    // Build a new query string, encoding the where clause
    const urlFilter = 
      "https://gis.dnr.wa.gov/site3/rest/services/Public_Boundaries/"
      + "WADNR_PUBLIC_Public_Land_Survey/MapServer/8/query"
      + `?where=${encodeURIComponent(whereClause)}`
      + "&outFields=PLS_TWP_SUBDIV_NO"
      + "&returnDistinctValues=false"
      + "&returnGeometry=true"
      + "&orderByFields=PLS_TWP_SUBDIV_NO"
      + "&f=pjson";
  
    fetch(urlFilter)
      .then(response => {
        return response.json();
      })
      .then(data => {
  
        // 1. Add a placeholder option first
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = "Select a range...";
        placeholderOption.selected = true;
        placeholderOption.disabled = true;
        selectSection.appendChild(placeholderOption);
  
        data.features.forEach(feature => {
  
          const optionEl = document.createElement("calcite-option");
          const rangeValue = feature.attributes.PLS_TWP_SUBDIV_NO;
          const geometry = feature.geometry;
  
          optionEl.value = JSON.stringify(geometry);       // programmatic value
          optionEl.label = rangeValue; // text shown to the user
          selectSection.appendChild(optionEl);
        });
        console.log("Response data: ", data);
      });
  }
  
  function handlSectionSelect(event) {
    console.log("User selected section:", event.target.value);
  
    // 0. Get geometry from dropdown
    const geometry = JSON.parse(event.target.value);
    geometry.spatialReference = { wkid: 102100 };
  
    // 1. Project geometry and zoom in on map
    require(["esri/geometry/projection"], (projection) => {
        projection.load().then(() => {
            const reprojectedGeometry = projection.project(geometry, view.spatialReference);
            if (reprojectedGeometry.extent) {
                view.goTo(reprojectedGeometry.extent).then(() => {
                    console.log("View localized to the geometry.");
                }).catch((error) => {
                    console.error("Error in goTo:", error);
                });
            } else {
                console.error("Reprojected geometry does not have an extent.");
            }
        }).catch((error) => {
            console.error("Error loading projection module:", error);
        });
    });
  }
  
  
  /* -------------------------------------------------------------------------- */
  /*                                  MAIN CODE                                 */
  /* -------------------------------------------------------------------------- */
  
  let whitebox = createWhiteBox();
  
  const searchHost = document.querySelector("#searchWhiteboxHost");
  if (searchHost) {
    searchHost.appendChild(whitebox);
  }

}
