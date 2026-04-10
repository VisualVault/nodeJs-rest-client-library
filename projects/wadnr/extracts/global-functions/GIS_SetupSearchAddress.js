/**
 * VV.Form.Global.GIS_SetupSearchAddress
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (view) {
/* eslint-disable no-unused-vars */
/*Function Name:   GIS_SetupSearchAddress
  Customer:       WA FNR: fpOnline
  Purpose:        Creates an address search bar
                ...

  Date of Dev:   09/12/2025
  Last Rev Date: 09/12/2025

  Parameters: view (Object) AGOL view of the webmap

  09/12/2025 Ross Rhone - Added address search bar widget (AGOL deprecated as of 4.34)

*/

return new Promise((resolve, reject) => {
    require(
      [
        "esri/widgets/Search",
        "esri/geometry/Extent"
      ],
      function (Search, Extent) {
        try {
            const compactQuery = window.matchMedia("(max-width: 640px)");
            const getPlaceholder = () => compactQuery.matches ? "Find address" : "Find address in Washington";

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
            allPlaceholder: getPlaceholder(),
            includeDefaultSources: false,          // we’ll define our own source
            sources: [
              {
                // ArcGIS World Geocoding Service
                url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
                name: "Addresses in Washington",
                placeholder: getPlaceholder(),
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
              search.container.style.minWidth = compactQuery.matches ? "0" : "320px";
            }
          });

          const syncSearchPlaceholder = () => {
            const placeholder = getPlaceholder();
            search.allPlaceholder = placeholder;
            if (Array.isArray(search.sources)) {
              search.sources.forEach((source) => {
                source.placeholder = placeholder;
              });
            }
            if (search.container) {
              search.container.style.minWidth = compactQuery.matches ? "0" : "320px";
            }
          };

          if (typeof compactQuery.addEventListener === "function") {
            compactQuery.addEventListener("change", syncSearchPlaceholder);
          } else if (typeof compactQuery.addListener === "function") {
            compactQuery.addListener(syncSearchPlaceholder);
          }

          view.ui.add(search, { position: "top-right", index: 0 });
          resolve(search);
        } catch (err) {
          reject(err);
        }
      },
      reject
    );
  });

}
