/**
 * VV.Form.Global.RegisterDatagrids
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (datagrids) {
datagrids.forEach(function (datagridName) {
  VV.Form.Global.DatagridSelectLoad(datagridName);
  VV.Form.Global.DatagridSelectObserve(datagridName);
});
}
