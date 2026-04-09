/**
 * VV.Form.Global.UncheckAdminOverrideAndSave
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
/*
Form Template Name: UncheckAdminOverrideAndSave
Customer:           WA DNR
Purpose:            The purpose of this function is to increase the security and ensure that the "Admin Override" option is unchecked if an Administrator forgets and saves a form.

Parameters:         N/A

Date of Dev:        02/19/2025

Revision Notes:
                    02/19/2025 - Felipe Castro: Genesis
                    02/25/2025 - Felipe Castro: Fix for checking first if the Admin Overide exists in the form.
                    02/28/2025 - Federico Cuelho: Fix async logic to wait until the ajax save its finished.
*/

if (VV.Form.GetFieldValue("Admin Override") === "") {
    return VV.Form.DoAjaxFormSave();
} else {
   return VV.Form.SetFieldValue("Admin Override", "False", true).then(() =>
        VV.Form.DoAjaxFormSave()
    );
}
}
