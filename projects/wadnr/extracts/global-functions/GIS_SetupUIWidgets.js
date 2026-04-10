/**
 * VV.Form.Global.GIS_SetupUIWidgets
 * Parameters: 6
 * Extracted: 2026-04-10
 */
function (view, calciteDivs, webmap, fpId, modalObject, token) {
/*Function Name:   GIS_SetupUIWidgets
  Customer:       WA FNR: fpOnline
  Purpose:        Gets AGOL Widgets for the Activity Mpa
  Date of Dev:   05/20/2025
  Last Rev Date: 05/20/2025

  Parameters: view (Object) AGOL view of the webmap
              calciteDivs (Object) AGOL's DOM divs to connect to the calicite menu panels
              webmap (Object) VV's AGOL's webmap that contains the features / layers
              fpId (String) Form Id
              modalObject (Object) This is the activity map modal
              token (String) AGOL's JWT Token


  05/20/2025 - Ross Rhone: First setup of script.
  06/24/2025 - Ross Rhone: Adding zoom btn listeners.
  08/25/2025 - Ross Rhone: Addding print widget btn
  08/27/2025 - Ross Rhone: Adding previous view btn
  09/12/2025 - Ross Rhone: Adding the search by address bar
  12/11/2025 - Ross Rhone: Adding the shapefile upload
  12/17/2025 - Ross Rhone: Adding the basemap gallery widget btn
*/


//helper functions...
          function setupScaleBar(view, ScaleBar) {
            const scaleBar = new ScaleBar({
              view: view,
              unit: "dual" // "metric", "non-metric", or "dual"
            });

            // Add to bottom-left or any supported positi
            // on
            view.ui.add(scaleBar, {
              position: "bottom-left"
            });
          }

          function setupLayersBtn(view, LayerList) {
            // Create the LayerList
            new LayerList({
              view: view,
              container: document.getElementById("layerListDiv")
            });
          }

          function setupBasemapGalleryBtn(view, BasemapGallery, Basemap) {

            const topo = Basemap.fromId("topo");
            const imagery = Basemap.fromId("satellite");

            // Create the BasemapGallery
            new BasemapGallery({
              view: view,
              source: [imagery, topo],
              container: document.getElementById("basemapGalleryDiv")
            });
          }

 require([
      "esri/widgets/LayerList",
      "esri/widgets/BasemapGallery",
      "esri/widgets/ScaleBar",
      "esri/widgets/Editor",
      "esri/core/reactiveUtils",
      "esri/Basemap"
    ], (LayerList, BasemapGallery, ScaleBar, Editor, reactiveUtils, Basemap) => {
               // Sets up the UI elements (buttons, etc.)

            setupLayersBtn(view, LayerList);
            setupBasemapGalleryBtn(view, BasemapGallery, Basemap);
            VV.Form.Global.GIS_SetupEditorBtn(view, calciteDivs, webmap, Editor, reactiveUtils, fpId, modalObject);
            setupScaleBar(view, ScaleBar);
            VV.Form.Global.GIS_SetupGISSearchTSR(view);
            VV.Form.Global.GIS_SetupPrintWidget(view, token, webmap);
            VV.Form.Global.GIS_SetupPreviousViewBtn(view);
            VV.Form.Global.GIS_SetupSearchAddress(view);
            VV.Form.Global.GIS_SetupUploadShapefile(view, calciteDivs, webmap, fpId);

            //Zoom buttons
            document.querySelector('[title="Zoom in"]').addEventListener("click", () => {
                console.log("Zooming in...");
                view.goTo({ zoom: view.zoom + 1 });
              });

              document.querySelector('[title="Zoom out"]').addEventListener("click", () => {
                console.log("Zooming out...");
                view.goTo({ zoom: view.zoom - 1 });
              });

    });

}
