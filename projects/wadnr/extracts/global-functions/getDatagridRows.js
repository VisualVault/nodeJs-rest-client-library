/**
 * VV.Form.Global.getDatagridRows
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (gridName, returnGuids) {
/**
 * Returns the row count (or the GUIDs) of a Visual Vault datagrid.
 * @param {string} gridName       vvfieldname of the datagrid (e.g. "DG Landowners")
 * @param {boolean} [returnGuids] true → returns an array of GUIDs; false/undefined → just the count
 * @returns {number|Array<string>}
 */

// Fallback when the caller omits the second argument
if (typeof returnGuids === "undefined") {
  returnGuids = false;
}

// Main datagrid wrapper
const $grid = $(`[vvfieldname="${gridName}"]`);
if (!$grid.length) return returnGuids ? [] : 0;

// Rendered rows (includes unsaved/pending ones)
const $rows = $grid.find("tbody tr[kendogridlogicalrow]");

if (!returnGuids) {
  return $rows.length;
}

// Extract GUID from each row (link containing DataID=…)
return $rows
  .map((_, row) => {
    const href = $(row).find('a[href*="DataID="]').attr("href") || "";
    return new URLSearchParams(href.split("?")[1]).get("DataID");
  })
  .get()
  .filter(Boolean); // remove null/undefined

}
