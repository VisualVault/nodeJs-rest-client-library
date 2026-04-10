/**
 * VV.Form.Global.OpenGISModal
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (fpId) {
var MAX_ATTEMPTS = 5;   // total tries (1 + 4 retries)
  var DELAY_MS     = 500; // base delay before second try
  var attempt      = 1;

  /*  Return a Promise so callers can await / .then() it  */
  return new Promise(function (resolve, reject) {

    function tryOpen() {
      try {
        /* 1️⃣  Build the modal description -------------------------------- */
        var portalID    = VV.Form.Global.GIS_GetGISPortalID();
        var modalObject =
          VV.Form.Global.GIS_GetModalGISMap(
            VV.Form.Global.mapState,
            portalID,
            fpId
          );

        modalObject._webMapResponse = VV.Form.Global.preFetchedWebMapResponse;
        
        VV.Form.Global.DisplayMapDynamically(modalObject);

      } catch (err) {                             // synchronous failure
        handleFailure(err);
      }
    }

    function handleFailure(err) {
      console.warn("⚠️ Attempt " + attempt + " failed:", err.message || err);

      if (attempt < MAX_ATTEMPTS) {
        attempt += 1;
        setTimeout(tryOpen, DELAY_MS * attempt);  // simple back-off
      } else {
        console.error("❌ All attempts failed:", err.message || err);
        if (typeof VV.Form.Global.DisplayModal === "function") {
          VV.Form.Global.DisplayModal(
            "Unable to open map editor after multiple tries.",
            "Error"
          );
        }
        reject(err);                              // bubble up to caller
      }
    }

    /* kick off the first attempt */
    tryOpen();
  });
}
