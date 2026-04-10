/**
 * VV.Form.Global.GetPendingRelatedFees
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (formID) {
/* GetPendingRelatedFees - Calls a query that retrieves pending fees related to the current form. Used to define a 
  central place for the name of the query.

   Parameters: formID (String) - The form ID to retrieve related fees for. Defaults to the current form's ID if not supplied.
   Return Value: (Promise<Object[]>) Related fee data
*/
if (!formID) {
  formID = VV.Form.DhDocID;
}

return VV.Form.CustomQuery('zClientSide Get Pending Related Fees', formID, null ,false);
}
