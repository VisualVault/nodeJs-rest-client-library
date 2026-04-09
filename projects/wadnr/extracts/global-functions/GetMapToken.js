/**
 * VV.Form.Global.GetMapToken
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
/*
  Function Name: GetMapToken
  Customer:      Washington DNR
  Purpose:       The purpose of this script is to call the webservice "ActivityMapGetMapToken" to retrieve a token to be used for 
  authentication when making requests to the GIS server for the activity map. This function is called on load of the GISMap Editor Subform 
  and the token is stored in a global variable for use in other functions that make requests to the GIS server.
  Parameters:
  Date of Dev:   01/14/2025
  Last Rev Date: 03/12/2026
  03/12/2026 - Ross Rhone: Adding in error handling for the web service call to get the token and to handle cases where the token is not returned in the expected format.
*/

function getToken() {

    const webServiceName = 'ActivityMapGetMapToken';
    
    const data = "[]";
    
    const requestObject = $.ajax({
           type: 'POST',
           url: `${VV.BaseAppUrl}/api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
           contentType: 'application/json; charset=utf-8',
           data: data
       });
       
   return requestObject;
}

function handleResponse(resp) {
   if (typeof resp.status != 'undefined') {
       message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
   } else if (typeof resp.statusCode != 'undefined') {
       message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
   } else if (resp.meta.status == '200') {
       if (resp.data[0] != undefined) {
           const responseStatus = resp.data[0];
           switch(responseStatus) 
           {
               case 'Success':
                   console.log("Success");
                   // 1. Parse the raw JSON string into an object.
                   const token = resp.data[1];
                   return token;
                   //break;
               case 'Error':
                console.error("Error:", resp.data[2]);
                return null;
               default:
                console.error("Unknown response:", resp.data[2]);
                return null;
           }
       } else {
           console.log("Empty data array in ActivityMapGetMapToken response. Response:", resp);
           return null;
       }
   } else {
       console.log("Failed getting token from ActivityMapGetMapToken. Response:", resp);
       return null;
   }
}

return $.when(getToken()).then(handleResponse);
}
