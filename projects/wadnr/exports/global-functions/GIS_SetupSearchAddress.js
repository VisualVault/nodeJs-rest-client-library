/**
 * VV.Form.Global.GIS_SetupSearchAddress
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (view) {
/*Function Name:   GIS_SetupSearchAddress
  Customer:       WA FNR: fpOnline
  Purpose:        Creates an address search bar
                ...

  Date of Dev:   09/12/2025
  Last Rev Date: 09/12/2025

  Parameters: view (Object) AGOL view of the webmap

  09/12/2025 Ross Rhone - Added address search bar widget (AGOL deprecated as of 4.34)
  04/08/2026 - Ross Rhone: Making this UI mobile friendly                         


*/

return new Promise((resolve, reject) => {
    require(
      [
        "esri/widgets/Search",
        "esri/geometry/Extent"
      ],
      function (Search, Extent) {
        try {
            const searchHost = document.getElementById("addressSearchHost");
            if (!searchHost) {
              throw new Error("Address search host not found.");
            }

            const widgetContainer = document.createElement("div");
            widgetContainer.id = "addressSearchWidget";
            widgetContainer.className = "activity-map-whitebox";
            searchHost.appendChild(widgetContainer);

            // WA bounding box in WGS 102100 (Web Mercator)
            const waExtent102100 = new Extent({
            xmin: -13820000,
            ymin: 5125000,
            xmax: -12800000,
            ymax: 6095000,
            spatialReference: { wkid: 102100 }
            });


          const search = new Search({
            view: view,
            container: widgetContainer,
            allPlaceholder: "Find address in Washington",
            includeDefaultSources: false,          // we’ll define our own source
            sources: [
              {
                // ArcGIS World Geocoding Service
                url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
                name: "Addresses in Washington",
                placeholder: "Find address in Washington",
                countryCode: "USA",                 // US-only
                
                filter: {
                    geometry: waExtent102100 // bias/limit to WA
                },
                withinViewEnabled: false,           // don’t shrink to current view
                categories: ["Address", "Point Address", "Street Address"]
              }
            ],
            popupEnabled: true,
            resultGraphicEnabled: true
          });

          // (Optional) widen the input so it doesn’t feel cramped
          search.when(() => {
            if (search.container) {
              search.container.style.width = "100%";
              search.container.style.minWidth = "0";
            }
          });

          resolve(search);
        } catch (err) {
          reject(err);
        }
      },
      reject
    );
  });

}
