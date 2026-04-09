/**
 * VV.Form.Global.GetCurrentRoles
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
/*
    Script Name:   GetCurrentRoles
    Customer:      VisualVault
    Purpose:       The purpose of this script is to return the current roles for the user.
                    
    Parameters:    The following represent variables passed into the function:  
                    None.
                   
    Return Value:  The following represents the value being returned from this function:
                    Array - An array of the current roles for the user.
                    Example: ["vaultaccess"]
    Date of Dev:   
    Last Rev Date: 09/30/2024
    Revision Notes:
    06/01/2017 - Moises Savelli - Initial version created.
*/

const GetCurrentRoles = VV.Form.FormUserGroups.map((group) =>
  group.toLowerCase()
);

return GetCurrentRoles;

}
