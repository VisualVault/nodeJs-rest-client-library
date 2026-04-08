/**
 * VV.Form.Global.GIS_onLoad
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (event) {
/*
  Function Name: Form_onLoad.js
  Customer:      Washington DNR
  Purpose:       The purpose of this script is to initialize GIS configuration for GISMap Editor Subform
  Parameters:
  Date of Dev:   01/14/2025
  Last Rev Date: 08/19/2025
  01/14/2025 - Austin Stone: Function created.
  05/02/2025 - Ross Rhone: Adding in error handling
  06/24/2025 - Ross Rhone: Added in retry logic for loading of GIS libraries and
               Updated the swal2-actions div so he wasn't blocking the last layer item in the list if a users browser is minimized.
               (feature-5871)
  08/19/2025 - Ross Rhone: Swapped to exponential backoff with jitter + cache-busted retries while keeping Promise.all. (feature-6610)
  03/12/2026 - Ross Rhone: Restructing the GIS_onLoad function to better handle errors and to only show the error modal if the load was 
               triggered by the Activity Map button click. If the load was triggered by form load, fail silently and allow the user to 
               retry by clicking the Activity Map button which will call GIS_onLoad again. Also added in more detailed error messages for different failure scenarios.
               (WADNR-8979)
*/
  
  
/* -------------------------------------------------------------------------- */
/*                               Loader Utilities                              */
/* -------------------------------------------------------------------------- */

/** Utility to load external JS (classic) */
function loadScript(src) {
  return new Promise(function (resolve, reject) {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(script);
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}

/** Utility to load external CSS */
function loadStyle(href) {
  return new Promise(function (resolve, reject) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve(link);
    link.onerror = () => {
      link.remove();
      reject(new Error(`Failed to load CSS: ${href}`));
    };
    document.head.appendChild(link);
  });
}

/** Utility to load external JS (module) */
function loadScriptType(src, type) {
  return new Promise(function (resolve, reject) {
    const script = document.createElement("script");
    script.src = src;
    script.type = type;
    script.onload = () => resolve(script);
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}

/* -------------------------------------------------------------------------- */
/*                          Backoff + Cache-Bust Helpers                      */
/* -------------------------------------------------------------------------- */

function cacheBust(url) {
  try {
    const u = new URL(url, location.href);
    u.searchParams.set("_cb", Date.now().toString(36));
    return u.toString();
  } catch (e) {
    const sep = url.indexOf("?") > -1 ? "&" : "?";
    return url + sep + "_cb=" + Date.now().toString(36);
  }
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/**
 * Exponential backoff with optional jitter.
 * - factory(attempt) => Promise
 * - attempt starts at 0
 */
function withBackoff(factory, retries, baseDelay, factor, jitter) {
  if (typeof retries !== "number") retries = 4;   // total attempts = retries + 1
  if (typeof baseDelay !== "number") baseDelay = 700;
  if (typeof factor !== "number") factor = 1.8;
  if (typeof jitter !== "boolean") jitter = true;

  let lastErr;

  function run(attempt) {
    return factory(attempt).catch(function (err) {
      lastErr = err;
      if (attempt >= retries) {
        throw lastErr;
      }
      var delay = baseDelay * Math.pow(factor, attempt);
      if (jitter) {
        delay = Math.floor(delay * (0.7 + Math.random() * 0.6)); // ±30%
      }
      console.warn("Retrying in " + delay + " ms …", err);
      return sleep(delay).then(function () { return run(attempt + 1); });
    });
  }

  return run(0);
}

/** Add a timeout guard around a promise (useful for CSS loads that can hang) */
function withTimeout(promise, ms, label) {
  if (!ms) ms = 15000;
  if (!label) label = "operation";
  var timer;
  var timeout = new Promise(function (_, reject) {
    timer = setTimeout(function () {
      reject(new Error(label + " timed out after " + ms + " ms"));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(function () {
    clearTimeout(timer);
  });
}

  // ---------------------------------------------------------------------------
  // Runtime state flags
  // ---------------------------------------------------------------------------
  VV.Form.Global.gisLoadPromise = VV.Form.Global.gisLoadPromise || null;
  VV.Form.Global.gisLastError = VV.Form.Global.gisLastError || null;
  VV.Form.Global.gisIsLoading = VV.Form.Global.gisIsLoading || false;

  // Detect whether this call came from the Activity Map button click.
  // This lets us keep ONLY the event parameter and still change behavior.
  var isActivityMapClick =
    event &&
    (
      event.type === "click" ||
      (event.currentTarget && event.currentTarget.id === "btnActivityMap") ||
      (event.target && event.target.id === "btnActivityMap")
    );

  // If already loaded, just resolve.
  if (VV.Form.Global.preFetchedWebMapResponse && VV.Form.Global.mapState) {
    return Promise.resolve();
  }

  // If already loading, return existing promise so we do not create duplicate loads.
  if (VV.Form.Global.gisLoadPromise) {
    return VV.Form.Global.gisLoadPromise;
  }

  VV.Form.Global.gisIsLoading = true;
  VV.Form.ShowLoadingPanel();

  VV.Form.Global.gisLoadPromise = VV.Form.Global.GetMapToken()
    .then(function (webmapResponse) {
    if(!webmapResponse || !webmapResponse[0] || !webmapResponse[0].value) {
        throw new Error("Invalid token");
    }
        
      VV.Form.Global.preFetchedWebMapResponse = webmapResponse;
      token = webmapResponse[0].value;
      console.log("Token is created : ", token);

      var retries = 4, baseDelay = 700, factor = 1.8, jitter = true;

      var URL_ARCGIS_CORE = "https://js.arcgis.com/4.33/";
      var URL_CALCITE_ESM = "https://js.arcgis.com/calcite-components/3.2.1/calcite.esm.js";
      var URL_MAP_COMPONENTS = "https://js.arcgis.com/4.33/map-components/";
      var URL_ARCGIS_CSS = "https://js.arcgis.com/4.33/esri/themes/light/main.css";

      return Promise.all([
        withBackoff(function (attempt) {
          var u = attempt === 0 ? URL_ARCGIS_CORE : cacheBust(URL_ARCGIS_CORE);
          return loadScript(u);
        }, retries, baseDelay, factor, jitter),

        withBackoff(function (attempt) {
          var u = attempt === 0 ? URL_CALCITE_ESM : cacheBust(URL_CALCITE_ESM);
          return loadScriptType(u, "module");
        }, retries, baseDelay, factor, jitter),

        withBackoff(function (attempt) {
          var u = attempt === 0 ? URL_MAP_COMPONENTS : cacheBust(URL_MAP_COMPONENTS);
          return loadScriptType(u, "module");
        }, retries, baseDelay, factor, jitter),

        withBackoff(function (attempt) {
          var u = attempt === 0 ? URL_ARCGIS_CSS : cacheBust(URL_ARCGIS_CSS);
          return withTimeout(loadStyle(u), 15000, "ArcGIS CSS load");
        }, retries, baseDelay, factor, jitter)
      ]);
    })
    .then(function () {
      // Only inject once
      if (!document.getElementById("wadnr-swal-style-fix")) {
        const styleFix = document.createElement("style");
        styleFix.id = "wadnr-swal-style-fix";
        styleFix.textContent = `
          .swal2-actions { pointer-events: none !important; }
          .swal2-actions > * { pointer-events: auto !important; }
        `;
        document.head.appendChild(styleFix);
      }

      VV.Form.Global.mapState = VV.Form.Global.GIS_GetMapViewManager();
      VV.Form.Global.gisLastError = null;
      VV.Form.Global.gisIsLoading = false;
      VV.Form.Global.gisLoadPromise = null;

      console.log("✅ GIS configuration completed");
      VV.Form.HideLoadingPanel();
    })
    .catch(function (err) {
      console.error("❌ GIS setup failed:", err && err.message ? err.message : err);

      VV.Form.Global.gisLastError = err;
      VV.Form.Global.gisIsLoading = false;
      VV.Form.Global.gisLoadPromise = null;
      VV.Form.Global.preFetchedWebMapResponse = null;
      VV.Form.Global.mapState = null;

      VV.Form.HideLoadingPanel();

      // Only show the modal if this call came from the Activity Map button click.
      // If this was form load, fail silently.
      if (isActivityMapClick) {
        VV.Form.Global.DisplayModal({
          HtmlContent: "Unable to connect to ArcGIS Online. Please check your connection and try again.",
          Icon: "error",
          Title: "Error",
          ConfirmText: "Retry",
          showCancelButton: true,
          allowOutsideClick: false,
          allowEscapeKey: true,
          okFunction: function () {
            VV.Form.Global.GIS_onLoad(event)
              .then(function () {
                if (VV.Form.Global.preFetchedWebMapResponse && VV.Form.Global.mapState) {
                  VV.Form.Global.OpenGISModal(VV.Form.GetFieldValue("Top Form ID"));
                }
              })
              .catch(function (retryErr) {
                console.error("❌ GIS retry failed:", retryErr && retryErr.message ? retryErr.message : retryErr);
              });
          }
        });
      }

      throw err;
    });

  return VV.Form.Global.gisLoadPromise;
}
