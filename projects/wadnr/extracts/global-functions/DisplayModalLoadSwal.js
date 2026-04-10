/**
 * VV.Form.Global.DisplayModalLoadSwal
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
//This script is for the SweetAlert2 library, which is a library for creating alert and confirmation dialog boxes with custom messages and buttons. It allows developers to create custom messages and buttons to be shown to users when they interact with a website.
  const deferred = $.Deferred();
   $.getScript(
    "https://cdn.jsdelivr.net/npm/sweetalert2@10.8.1/dist/sweetalert2.min.js").done(function () {
    deferred.resolve('Success: SweetAlert2 has been loaded successfully!');
  })
    .fail(function (jqxhr, settings, exception) {
      deferred.reject('Failed to load SweetAlert2:', exception);
    });;

  return deferred;
}
