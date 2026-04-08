/**
 * VV.Form.Global.UseCustomQuery
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (queryName, dynamicValue, dynamicParams) {
/*
    Script Name:    UseCustomQuery
    Customer:       VisualVault
    Purpose:        Script to implement a custom query functionality from Client Side
                    
    Parameters:     Variables passed into the function:  
                        - queryName     (String - Required)         - Name of the query
                        - dynamicValue  (String, Null - Optional)   - Variables passed into the SQL query
                        - dynamicParams (String, Null - Optional)   - Additional parameters to pass to CustomQuery
                   
    Return Value:   res - Response object

    Revision Notes:
                    12/05/2024 - Fernando Chamorro: Initial creation of the script.
                    09/26/2025 - Federico Cuelho: Added missing cache parameter.
*/

// queryName is required and must be a string
if (typeof queryName !== "string" || queryName.trim() === "") {
    throw new Error("queryName must be a non-empty string.");
  }
  
  // dynamicValue is optional but must be a string or null
  if (
    dynamicValue !== undefined &&
    dynamicValue !== null &&
    typeof dynamicValue !== "string"
  ) {
    throw new Error("dynamicValue must be a string or null.");
  }
  
  // dynamicParams is optional but must be a string or null
  if (
    dynamicParams !== undefined &&
    dynamicParams !== null &&
    typeof dynamicParams !== "string"
  ) {
    throw new Error("dynamicParams must be a string or null.");
  }
  
  return new Promise((resolve, reject) => {
    try {
      VV.Form.CustomQuery(queryName, dynamicValue, dynamicParams, false)
        .then((res) => {
          resolve(res);
        })
        .catch((error) => {
          reject(
            new Error(
              `Error executing CustomQuery "${queryName}": ${error.message}`
            )
          );
        });
    } catch (error) {
      reject(new Error(`Unexpected error in UseCustomQuery: ${error.message}`));
    }
  });
}
