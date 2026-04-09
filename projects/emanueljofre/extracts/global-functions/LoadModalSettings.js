/**
 * VV.Form.Global.LoadModalSettings
 * Parameters: 0
 * Extracted: 2026-04-09
 */
function () {
VV.Form.Global.LoadBootstrapCSS();
var modalstyle = $('<style>').append('.modalCloseButton { vertical-align:middle; }');
var modalscript = $('<script>').attr('src','/bundles/bootstrapjs?v=FBul99mpojQQrPqNoqXHNBuItkZ_0pqoo9DoBnPB5pQ1');
$('head').append(modalscript).append(modalstyle);
}
