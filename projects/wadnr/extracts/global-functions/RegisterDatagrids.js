/**
 * VV.Form.Global.RegisterDatagrids
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (datagrids) {
datagrids.forEach(function (datagridName) {
  VV.Form.Global.DatagridSelectLoad(datagridName);
  VV.Form.Global.DatagridSelectObserve(datagridName);
});
}
