/**
 * VV.Form.Global.DisplayModalLoad
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
  const deferred = $.Deferred();
  VV.Form.Global.DisplayModalLoadSwal()
      .then((message) => {
          deferred.resolve(message);
      })
      .catch((message) => {
          deferred.reject(message);
      });
  VV.Form.Global.DisplayModalLoadSettings()
  VV.Form.Global.DisplayModalLoadCSS()
  VV.Form.Global.DisplayModalLoadBootstrapCSS()

  return deferred;
}
