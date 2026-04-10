/**
 * VV.Form.Global.GIS_BuildCalciteLayout
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
/*Function Name:   GIS_BuildCalciteLayout
  Customer:       WA FNR: fpOnline
  Purpose:        Build's AGOL CalciteShell components for the UI Panel
  Date of Dev:   05/20/2025
  Last Rev Date: 04/09/2026

  Parameters: None

  05/20/2025 - Ross Rhone: First setup of script.
  08/22/2025 - Ross Rhone: Adding print widget.
  09/09/2025 - Ross Rhone: Added listener for canceling the drawing state if
                           any of the btns are clicked "Zoom To Legal", "Layers" etc ...
  12/11/2025 - Ross Rhone: Adding the shapefile upload panel calcite menu
  12/17/2025 - Ross Rhone: Adding the basemap gallery panel calcite menu
  04/09/2026 - Reset to stable baseline and keep a small responsive-friendly layout hook.
*/

const shell = document.getElementById("calcite-shell-map");
let edDiv;

//get webmap by portal id
const shellDiv = document.createElement("div");
shellDiv.setAttribute("id", "calcite-shell-map-container");
shellDiv.style.position = "relative";
shellDiv.style.display = "flex";
shellDiv.style.flex = "1 1 auto";
shellDiv.style.width = "100%";
shellDiv.style.height = "100%";
shellDiv.style.overflow = "hidden";

shell.appendChild(shellDiv);

// ---- HEADER ----
const nav = document.createElement("calcite-navigation");
nav.setAttribute("slot", "header");

const logo = document.createElement("calcite-navigation-logo");
logo.setAttribute("id", "header-title");
logo.setAttribute("heading-level", "1");
logo.setAttribute("slot", "logo");
logo.setAttribute("heading", "Activity Map");
nav.appendChild(logo);
shell.appendChild(nav);

// ---- PANEL START ----
const panelStart = document.createElement("calcite-shell-panel");
panelStart.setAttribute("slot", "panel-start");
panelStart.setAttribute("display-mode", "float-content");
panelStart.setAttribute("id", "panel");
panelStart.classList.add("activity-map-shell-panel");
panelStart.setAttribute("collapsed", "");

const actionBar = document.createElement("calcite-action-bar");
actionBar.classList.add("activity-map-action-bar");

const actions = [
  { id: "search", icon: "search", text: "Zoom To Legal" },
  { id: "layers", icon: "layers", text: "Layers" },
  { id: "basemapGallery", icon: "basemap", text: "Basemaps" },
  { id: "editor", icon: "pencil", text: "Drawing Tools" },
  { id: "print", icon: "print", text: "Print" },
  { id: "shapefile", icon: "add-features", text: "Upload Shapefile" }
];

actions.forEach(({ id, icon, text }) => {
  const action = document.createElement("calcite-action");
  action.setAttribute("data-action-id", id);
  action.setAttribute("icon", icon);
  action.setAttribute("text", text);
  action.title = text;
  actionBar.appendChild(action);
});

actionBar.setAttribute("slot", "action-bar");
actionBar.setAttribute("expandable", "");
actionBar.setAttribute("expanded", "");

panelStart.appendChild(actionBar);

// after you finish adding actions to the bar manually set text next to icon due to esri bug
Array.from(actionBar.querySelectorAll("calcite-action"))
  .forEach((a) => (a.textEnabled = true));

// ---- PANELS ----
const panels = [
  {
    id: "layers",
    heading: "Layers",
    child: (() => {
      const div = document.createElement("div");
      div.id = "layerListDiv";
      div.classList.add("activity-map-widget-panel");
      div.style.padding = "0.5rem";
      return div;
    })()
  },
  {
    id: "basemapGallery",
    heading: "BasemapGallery",
    child: (() => {
      const div = document.createElement("div");
      div.id = "basemapGalleryDiv";
      div.classList.add("activity-map-widget-panel");
      div.style.padding = "0.5rem";
      return div;
    })()
  },
  {
    id: "shapefile",
    heading: "shapefile",
    child: (() => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.height = "100%";

      const drawingTools = document.createElement("div");
      drawingTools.id = "uploadShapeFileTools";
      drawingTools.classList.add("activity-map-scroll-region");
      drawingTools.style.display = "grid";
      drawingTools.style.gap = "1.5rem";
      drawingTools.style.padding = "0.5rem";
      wrapper.appendChild(drawingTools);

      edDiv = document.createElement("div");
      edDiv.id = "shapefileDiv";
      edDiv.style.flex = "1 1 auto";
      edDiv.style.display = "none";
      wrapper.appendChild(edDiv);

      return wrapper;
    })()
  },
  {
    id: "print",
    heading: "Print",
    child: (() => {
      const div = document.createElement("div");
      div.id = "printWidgetDiv";
      div.style.padding = "0.5rem";
      return div;
    })()
  },
  {
    id: "editor",
    heading: "Drawing Tools",
    child: (() => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.height = "100%";

      const drawingTools = document.createElement("div");
      drawingTools.id = "drawTools";
      drawingTools.classList.add("activity-map-scroll-region");
      drawingTools.style.display = "grid";
      drawingTools.style.gap = "1.5rem";
      drawingTools.style.padding = "0.5rem";
      wrapper.appendChild(drawingTools);

      edDiv = document.createElement("div");
      edDiv.id = "editorDiv";
      edDiv.style.flex = "1 1 auto";
      edDiv.style.display = "none";
      wrapper.appendChild(edDiv);

      return wrapper;
    })()
  },
  {
    id: "search",
    heading: "Zoom To Legal Township Range Section",
    child: (() => {
      const div = document.createElement("div");
      div.id = "searcher";
      div.style.padding = "0.5rem";

      const searchWhiteboxHost = document.createElement("div");
      searchWhiteboxHost.id = "searchWhiteboxHost";
      div.appendChild(searchWhiteboxHost);

      return div;
    })()
  }
];

panels.forEach(({ id, heading, child }) => {
  const panel = document.createElement("calcite-panel");
  panel.setAttribute("heading", heading);
  panel.setAttribute("height-scale", "l");
  panel.setAttribute("data-panel-id", id);
  panel.setAttribute("closed", "");
  panel.setAttribute("closable", "");
  panel.appendChild(child);
  panelStart.appendChild(panel);
});

// ---- DETAILS PANEL ----
const detailsPanel = document.createElement("calcite-panel");
detailsPanel.setAttribute("heading", "Details");
detailsPanel.setAttribute("data-panel-id", "information");
detailsPanel.setAttribute("closed", "");
detailsPanel.setAttribute("closable", "");

const infoContent = document.createElement("div");
infoContent.setAttribute("id", "info-content");

const thumbnail = document.createElement("img");
thumbnail.setAttribute("id", "item-thumbnail");
thumbnail.setAttribute("alt", "webmap thumbnail");

const description = document.createElement("div");
description.setAttribute("id", "item-description");

const label = document.createElement("calcite-label");
label.setAttribute("layout", "inline");
label.innerHTML = "<b>Rating:</b>";

const rating = document.createElement("calcite-rating");
rating.setAttribute("id", "item-rating");
rating.setAttribute("read-only", "");

label.appendChild(rating);

infoContent.appendChild(thumbnail);
infoContent.appendChild(description);
infoContent.appendChild(label);
detailsPanel.appendChild(infoContent);
panelStart.appendChild(detailsPanel);

shell.appendChild(panelStart);

/* ------------------------------------------------------------------
 * 4.  Toggle panels from the action bar
 * ------------------------------------------------------------------ */
let activePanelId = null;

actionBar.addEventListener("click", (evt) => {
  const action = evt.target.closest("calcite-action");
  if (!action) return;

  const id = action.dataset.actionId;

  if (id !== "editor") {
    VV.Form.Global.GIS_CancelActiveEditing();
  }

  if (id === activePanelId && !panelStart.collapsed) {
    panelStart.collapsed = true;
    activePanelId = null;
    return;
  }

  panelStart.collapsed = false;

  panelStart.querySelectorAll("calcite-panel").forEach((panel) => {
    if (panel.dataset.panelId === id) {
      panel.removeAttribute("closed");
      panel.setFocus();
    } else {
      panel.setAttribute("closed", "");
    }
  });

  activePanelId = id;
});

panelStart.addEventListener("calcitePanelClose", () => {
  panelStart.collapsed = true;
  activePanelId = null;
});

return { shell, edDiv };

}
