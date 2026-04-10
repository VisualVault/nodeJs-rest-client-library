/**
 * VV.Form.Global.AssignPermissionsToAFolder
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (FolderPath) {
function assignPermissionsToFolder() {
  const webServiceName = "LibAssignPermissionsToAFolder";

  const data = JSON.stringify([
    {
      name: "New Entity",
      value: "Proponent",
    },
    {
      name: "New Entity Type",
      value: "Group",
    },
    {
      name: "Permission Type",
      value: "Viewer",
    },
    {
      name: "Folder Path",
      value: FolderPath,
    },
    {
      name: "Apply To Subfolders",
      value: true,
    },
  ]);

  const requestObject = $.ajax({
    type: "POST",
    url: `${VV.BaseAppUrl}/api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
    contentType: "application/json; charset=utf-8",
    data: data,
  });

  return requestObject;
}

function handleResponse(resp) {
  if (typeof resp.status != "undefined") {
    message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
  } else if (typeof resp.statusCode != "undefined") {
    message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
  } else if (resp.meta.status == "200") {
    if (resp.data[0] != undefined) {
      const responseStatus = resp.data[0];

      switch (responseStatus) {
        case "Success":
          // 1. Parse the raw JSON string into an object.
          console.log("Success");
          const permissions = resp.data[1];
          return permissions;
        //break;
        case "Error":
          console.error("Error:", resp.data[2]);
          return null;
        default:
          console.error("Unknown response:", resp.data[2]);
          return null;
      }
    } else {
      console.log("Empty data array in AssignPermisionsToAFolder response.");
      return null;
    }
  } else {
    console.log("Failed getting data from AssignPermisionsToAFolder.");
  }
}

return $.when(assignPermissionsToFolder()).then(handleResponse);

}
