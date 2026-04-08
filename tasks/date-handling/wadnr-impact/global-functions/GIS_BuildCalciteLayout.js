/**
 * VV.Form.Global.GIS_BuildCalciteLayout
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
/*Function Name:   GIS_BuildCalciteLayout
  Customer:       WA FNR: fpOnline
  Purpose:        Build's AGOL CalciteShell components for the UI Panel
  Date of Dev:   05/20/2025
  Last Rev Date: 09/09/2025

  Parameters: None

  05/20/2025 - Ross Rhone: First setup of script.
  08/22/2025 - Ross Rhone: Adding print widget.
  09/09/2025 - Ross Rhone: Added listener for canceling the drawing state if
                           any of the btns are clicked "Zoom To Legal", "Layers" etc ...
  12/11/2025 - Ross Rhone: Adding the shapefile upload panel calcite menu
  12/17/2025 - Ross Rhone: Adding the basemap gallery panel calcite menu
  04/08/2026 - Ross Rhone: Making this UI mobile friendly                         
*/

const shell = document.getElementById("calcite-shell-map");

      //get webmap by portal id
      const shellDiv = document.createElement("div");
      shellDiv.setAttribute("id", "calcite-shell-map-container");
      shellDiv.classList.add("activity-map-shell-container");
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
      logo.setAttribute('heading', 'Activity Map')
      nav.appendChild(logo);
      shell.appendChild(nav);

      // ---- PANEL START ----
      const panelStart = document.createElement("calcite-shell-panel");
      panelStart.setAttribute("slot", "panel-start");
      panelStart.setAttribute("display-mode", "float-content");
      panelStart.setAttribute("id", "panel");
      panelStart.classList.add("activity-map-shell-panel");
      panelStart.setAttribute("collapsed", "");   // start collapsed


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
      actionBar.setAttribute("expandable", "");  // gives you the «/» toggle
      actionBar.setAttribute("expanded", "");      //  <-  default to *expanded*

      panelStart.appendChild(actionBar);

      // after you finish adding actions to the bar manually set text next to icon due to esri bug
      Array.from(actionBar.querySelectorAll("calcite-action"))
        .forEach((a) => (a.textEnabled = true));   // or  a.setAttribute("text-enabled","")

      // ---- PANELS ----
      const panels = [
        {
          id: "layers",
          heading: "Layers",
          /*child: layerListEl = Object.assign(document.createElement("arcgis-layer-list"), {
            dragEnabled: true,
            visibilityAppearance: "checkbox",
            referenceElement: "calcite-shell-map"
          })*/
          child: (() => {
            // plain div that the widget will render into
            const div = document.createElement("div");
            div.id = "layerListDiv";          // give it an id for convenience
            div.classList.add("activity-map-panel-content");
            div.style.padding = "0.5rem";     // optional styling
            return div;
          })()
        },
        {
          id: "basemapGallery",
          heading: "BasemapGallery",
          child: (() => {
            // plain div that the widget will render into
            const div = document.createElement("div");
            div.id = "basemapGalleryDiv";          // give it an id for convenience
            div.classList.add("activity-map-panel-content");
            div.style.padding = "0.5rem";     // optional styling
            return div;
          })()
        },
        {
          id: "shapefile",
          heading: "shapefile",
          child: (() => {
            /* a container for the layer‑buttons + the Editor widget */
            const wrapper = document.createElement("div");
            wrapper.classList.add("activity-map-panel-content");
            wrapper.style.display = "flex";
            wrapper.style.flexDirection = "column";
            wrapper.style.height = "100%";

            /* -- tool bar : custom buttons --------------------------------- */
            const drawingTools = document.createElement("div");
            drawingTools.id = "uploadShapeFileTools";
            drawingTools.classList.add("activity-map-toolbar");
            drawingTools.style.display = "flex";
            drawingTools.style.flexDirection = "column";   // one column
            drawingTools.style.gap = "1.5rem";   // ⬅ bigger vertical space
            drawingTools.style.padding = "0.5rem";
            wrapper.appendChild(drawingTools);

            /* --- editor placeholder ---------------------------------------- */
            edDiv = document.createElement("div");
            edDiv.id = "shapefileDiv";
            edDiv.style.flex = "1 1 auto";       // fill remaining space
            edDiv.style.display = "none";   //  ← hidden at start
            wrapper.appendChild(edDiv);

            return wrapper;
          })()
        },
        {
          id: "print",
          heading: "Print",
          child: (() => {
            // plain div that the widget will render into
            const div = document.createElement("div");
            div.id = "printWidgetDiv";          // give it an id for convenience
            div.classList.add("activity-map-panel-content");
            div.style.padding = "0.5rem";     // optional styling
            return div;
          })()
        },
        {
          id: "editor",
          heading: "Drawing Tools",
          child: (() => {
            /* a container for the layer‑buttons + the Editor widget */
            const wrapper = document.createElement("div");
            wrapper.classList.add("activity-map-panel-content");
            wrapper.style.display = "flex";
            wrapper.style.flexDirection = "column";
            wrapper.style.height = "100%";

            /* -- tool bar : custom buttons --------------------------------- */
            const drawingTools = document.createElement("div");
            drawingTools.id = "drawTools";
            drawingTools.classList.add("activity-map-toolbar");
            drawingTools.style.display = "flex";
            drawingTools.style.flexDirection = "column";   // one column
            drawingTools.style.gap = "1.5rem";   // ⬅ bigger vertical space
            drawingTools.style.padding = "0.5rem";
            wrapper.appendChild(drawingTools);

            /* --- editor placeholder ---------------------------------------- */
            edDiv = document.createElement("div");
            edDiv.id = "editorDiv";
            edDiv.style.flex = "1 1 auto";       // fill remaining space
            edDiv.style.display = "none";   //  ← hidden at start
            wrapper.appendChild(edDiv);

            return wrapper;
          })()
        },
        {
          id: "search",
          heading: "Zoom To Legal Township Range Section",
          child: (() => {
            const div = document.createElement("div");
            div.id = "searcher";          // give it an id for convenience
            div.classList.add("activity-map-panel-content", "activity-map-search-panel");
            div.style.padding = "0.5rem";     // optional styling

            const addressSection = document.createElement("div");
            addressSection.id = "addressSearchHost";
            addressSection.classList.add("activity-map-search-section");

            const addressHeading = document.createElement("p");
            addressHeading.textContent = "Find an address in Washington.";
            addressSection.appendChild(addressHeading);

            const trsSection = document.createElement("div");
            trsSection.id = "searchWhiteboxHost";
            trsSection.classList.add("activity-map-search-section");

            div.appendChild(addressSection);
            div.appendChild(trsSection);
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
      label.innerHTML = `<b>Rating:</b>`;

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
      let activePanelId = null;                 // keep track of what is open now

      actionBar.addEventListener("click", (evt) => {
        const action = evt.target.closest("calcite-action");
        if (!action) return;

        const id = action.dataset.actionId;

        // Cancel active editing if leaving the editor panel
        if (id !== "editor") {
          VV.Form.Global.GIS_CancelActiveEditing();
        }

        /* --- 1.  If user clicked the SAME action that is already open,
            just collapse the whole side‑panel and exit ---------- */
        if (id === activePanelId && !panelStart.collapsed) {
          panelStart.collapsed = true;          // hide the shell‑panel
          activePanelId = null;
          return;
        }

        /* --- 2.  Otherwise show the requested panel -------------------- */
        panelStart.collapsed = false;                       // open side‑panel

        panelStart.querySelectorAll("calcite-panel").forEach(p => {
          if (p.dataset.panelId === id) {
            p.removeAttribute("closed");      // <- OPEN the selected one
            p.setFocus();                     // optional: move focus
          } else {
            p.setAttribute("closed", "");     // <- CLOSE all others
          }
        });

        activePanelId = id;                     // remember which panel is open

      });

      /* NEW: also react to the little "×" close button ------------------- */
      panelStart.addEventListener("calcitePanelClose", () => {
        panelStart.collapsed = true;
        activePanelId = null;
      });

      const compactQuery = window.matchMedia("(max-width: 1024px)");
      const syncActivityMapLayout = (isCompact) => {
        if (isCompact) {
          actionBar.removeAttribute("expanded");
        } else {
          actionBar.setAttribute("expanded", "");
        }

        Array.from(actionBar.querySelectorAll("calcite-action")).forEach((action) => {
          action.textEnabled = !isCompact;
        });
      };

      syncActivityMapLayout(compactQuery.matches);
      if (!window.__activityMapLayoutBound) {
        const listener = (event) => syncActivityMapLayout(event.matches);
        if (typeof compactQuery.addEventListener === "function") {
          compactQuery.addEventListener("change", listener);
        } else if (typeof compactQuery.addListener === "function") {
          compactQuery.addListener(listener);
        }
        window.__activityMapLayoutBound = true;
      }
      
      return {shell, edDiv};

}
