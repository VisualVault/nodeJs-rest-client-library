/**
 * VV.Form.Global.DisplayModalLoadSettings
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
VV.Form.Global.DisplayModalLoadBootstrapCSS();
var modalstyle = $("<style>").append(
  ".modalCloseButton { vertical-align:middle; }"
);
var denyButtonStyle = $("<style>").append(
  ".swal2-styled.swal2-deny{border:0;border-radius:.25em;background:initial;background-color:#dc3741;color:#fff;font-size:1em;}.swal2-styled.swal2-deny:focus{box-shadow:0 0 0 3px rgba(220,55,65,.5);}.swal2-confirm,.swal2-deny,.swal2-cancel{transition:color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;}.swal2-styled.swal2-deny{padding:.375rem .75rem;font-size:1rem;}" 
)
var modalscript = $("<script>").attr(
  "src",
  "/bundles/bootstrapjs?v=FBul99mpojQQrPqNoqXHNBuItkZ_0pqoo9DoBnPB5pQ1"
);
$("head").append(modalscript).append(modalstyle);
$("head").append(modalscript).append(denyButtonStyle);

}
