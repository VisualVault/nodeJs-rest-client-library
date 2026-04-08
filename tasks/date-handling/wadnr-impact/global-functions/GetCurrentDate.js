/**
 * VV.Form.Global.GetCurrentDate
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}/${day}/${year}`;
}
