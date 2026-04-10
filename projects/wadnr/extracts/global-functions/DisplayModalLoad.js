/**
 * VV.Form.Global.DisplayModalLoad
 * Parameters: 0
 * Extracted: 2026-04-10
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
