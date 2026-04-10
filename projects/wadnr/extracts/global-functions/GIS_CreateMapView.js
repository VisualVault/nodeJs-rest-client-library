/**
 * VV.Form.Global.GIS_CreateMapView
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (portalId, token) {
  /*Function Name:   GIS_CreateMapView
  Customer:       WA FNR: fpOnline
  Purpose:        Creates the MapView for AGOL for the activity map
  Date of Dev:    05/20/2025
  Last Rev Date:  09/12/2025

 Parameters:  container (Object) AGOL view of the webmap
              portalId (object) AGOL's portalId that links to the AGOL's webmap
              token (string)    JWT Token for VV's AGOL

  05/20/2025 - Ross Rhone: First setup of script.
  09/12/2025 - Ross Rhone: Adding loading bubbles for when the webmap is loading all features.
*/

  return new Promise(function (resolve, reject) {          // <-- (1) return a Promise
    require([
      "esri/config",
      "esri/WebMap",
      "esri/views/MapView",
      "esri/identity/IdentityManager"
    ], function (esriConfig, WebMap, MapView, IdentityManager) {

      // --- portal + token setup ---
      esriConfig.portalUrl = "https://visualvault.maps.arcgis.com";
      IdentityManager.registerToken({
        server: esriConfig.portalUrl + "/sharing/rest",
        token: token
      });

      var MAX_TRIES  = 4; // 1 initial + 3 retries
      var BASE_DELAY = 1000; // ms
      var lastError  = null;
      var wait = function (ms) { return new Promise(function (r){ setTimeout(r, ms); }); };

      /** Recursive loader with retries */
      function loadWebMap(attempt) {
        attempt = attempt || 1;
        if (!portalId) return Promise.reject(new Error("portalId is missing/undefined"));

        var webmap = new WebMap({
          portalItem: { id: portalId, portal: { url: esriConfig.portalUrl } }
        });

        return webmap.load()                                  // <-- (2) loadWebMap returns a Promise
          .then(function(){ return webmap.basemap.load(); })
          .then(function(){
            // Load all layers (operational + basemap)
            var layers = webmap.allLayers.toArray();
            return Promise.all(layers.map(function(l){ return l.load(); }))
                   .then(function(){ return webmap; });
          })
          .catch(function (err) {
            lastError = err;
            if (attempt >= MAX_TRIES) return Promise.reject(err);
            var delay = BASE_DELAY * Math.pow(2, attempt - 1); //1 s, 2s, 4s...
            console.warn("[GIS] load attempt " + attempt + " failed; retry in " + delay + " ms", err);
            return wait(delay).then(function(){ return loadWebMap(attempt + 1); });
          });
      }

      try { VV.Form.ShowLoadingPanel(); } catch (e) { /* no-op if not available */ }

      // Kick off
      let loadWebMapPromise = loadWebMap()
        .then(function (webmap) {
          if (!webmap) return Promise.reject(lastError || new Error("WebMap was undefined"));

          var view = new MapView({
            container: "calcite-shell-map-container",
            map: webmap,
            center: [-122.202079, 47.978985],
            zoom: 7
          });

          return view.when().then(function () {
            resolve({ view: view, webmap: webmap });          // <-- (3) resolve the outer Promise
          });
        })
        .catch(function (err) {
          console.error("[GIS] Failed to load portal item or create view:", err);
          reject(err);                                        // <-- (3) reject on failure
        });

        if (typeof loadWebMapPromise.finally === "function") {
          loadWebMapPromise.finally(function () {
            try { VV.Form.HideLoadingPanel(); } catch (e) {}
          });
        } else {
          loadWebMapPromise.then(
            function () { try { VV.Form.HideLoadingPanel(); } catch (e) {} },
            function () { try { VV.Form.HideLoadingPanel(); } catch (e) {} }
          );
        }
      })
  });

}
