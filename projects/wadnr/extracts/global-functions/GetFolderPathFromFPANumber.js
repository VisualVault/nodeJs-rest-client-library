/**
 * VV.Form.Global.GetFolderPathFromFPANumber
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (fpaNumber, includesRange, includeApplications) {
/*
  Script Name:  GetFolderPathFromFPANumber
  Customer:     WADNR
  Purpose:      The purpose of this process is to get the params required to build 
                the Document Upload Path from the FPA Number
  Parameters:    
                - fpaNumber (String, Required)  - The FPA Number used to get data
                - includesRange (Boolean, Optional) - *NOT USED. Code previously used "rangeNotRequired" variable that was not a function parameter
                - includeApplications (Boolean, Optional) - Flag indicating whether the final path should include the Applications subfolder
  
  Return Value:  (String) Folder path created from the FPA Number ({YEAR}/{RANGE}/{FPA Number} *OR* Legacy/{Legacy FPA Number})
                            eg: /2024/0-1000/SP-FPA-24-0045; 
                            eg: /2024/SP-FPA-24-0045; 
                            eg: /2024/0-1000/SP-FPA-24-0045/Applications
                            eg: /Legacy/777777
                          Returns an empty string if matching valid formats failed

  Date of Dev:   04/16/2025 

  Revision Notes:
                04/16/2025 - Mauro Rapuano:     Script created
                07/28/2025 - Mauro Rapuano:     Added includesRange optional parameter to include or not range in the path
                09/11/2025 - Federico Cuelho:   Update boolean variable parameter connotation.
                12/01/2025 - Fernando Chamorro: Added includeApplications optional parameter to include Applications in the path
                03/18/2026 - John Sevilla:      Update to account for legacy FPA numbers 
*/

// Validate parameters
if (typeof includeApplications === "undefined") {
  includeApplications = false;
} else if (typeof includeApplications !== "boolean") {
  throw new Error('Param "includeApplications" must be "true" or "false".');
}

fpaNumber = String(fpaNumber).trim();

// Validate the against the fpOnline number formats
const fpOnlineNumberFormatMatch = fpaNumber.match(/^[^-]+-[^-]+-(\d{2})-(\d+)/);
if (fpOnlineNumberFormatMatch) {
  let [ , year, sequenceNumber ] = fpOnlineNumberFormatMatch;
  year = "20" + year;
  sequenceNumber = parseInt(sequenceNumber, 10);
  const upper = Math.ceil(sequenceNumber / 1000) * 1000;
  const lower = upper - 999;

  if (includeApplications) {
    return `${year}/${lower}-${upper}/${fpaNumber}/Applications`;
  } else {
    return `${year}/${lower}-${upper}/${fpaNumber}`;
  }
}

// If unable to match above, validate against the legacy FPA number format
const legacyNumberFormatMatch = fpaNumber.match(/^\d+$/);
if (legacyNumberFormatMatch) {
  if (includeApplications) {
    return `Legacy/${fpaNumber}/Applications`;
  } else {
    return `Legacy/${fpaNumber}`;
  }
}

// If nothing matches, return an empty string
return "";
}
