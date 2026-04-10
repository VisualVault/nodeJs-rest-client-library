/**
 * VV.Form.Global.PostPDFMapToDocLib
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (blobdata, webServiceName, formName) {
    /*Function Name:   PostPDFMapToDocLib
     Customer:       WA DNR: fpOnline
     Purpose:        Posts a PDF of the requested section of the activity map
                     to VV's document library.
     Date of Dev:   12/23/2024
     Last Rev Date: 
     Preconditions:  TBD

     Parameters:    blobdata, webServiceName, formName
    
     Return:         nothing

     Revision Notes:
     12/23/2024 - Ross Rhone:  First Setup of the function
     */

     let message; // the message is set below


     function uint8ArrayToBase64(blobdata) {
         console.log("Inside uint8ArrayToBase64!");
     
         let binaryString = '';
         const chunkSize = 0x8000; // 32KB
         for (let i = 0; i < blobdata.length; i += chunkSize) {
           binaryString += String.fromCharCode.apply(
             null,
             blobdata.subarray(i, i + chunkSize)
           );
         }
         console.log("Returning back base64");
     
         return btoa(binaryString);
       }
     
     
     function postGISMapToDocLib() {
     
         console.log("Blob data made it to postGISMapToDocLib : " + blobdata);
         console.log("ScriptName : " + webServiceName);
         console.log("Form Name : " + formName);
     
     
         const base64String = uint8ArrayToBase64(blobdata);
     
         console.log("base64String : " + base64String);
     
         const formData = [
             {
                 name: "PDF GIS Map Data",
                 value: base64String 
             }
         ]
         console.log("Blob data made it to postGISMapToDocLib : " + base64String);
         console.log("Form Data : " + formData);
     
         // Parse the data as a JSON string
         const data = JSON.stringify(formData);
         console.log("JSON data: " + data);
     
         console.log("URL : " + `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`);
     
         const requestObject = $.ajax({
             type: 'POST',
             url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
             contentType: 'application/json; charset=utf-8',
             data: data,
             success: '',
             error: '',
         });
     
         return requestObject;
     }
     
     $.when(postGISMapToDocLib())
         .always(function (resp) {
             if (typeof resp.status != 'undefined') {
                 message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
                 console.log(message);
             } else if (typeof resp.statusCode != 'undefined') {
                 message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
                 console.log(message);
             } else if (resp.meta.status == '200') {
                 if (resp.data[0] != undefined) {
                     if (resp.data[0] == 'Success') {
                         message = `${formName} has been saved successfully.`;
     
                         // HANDLE SUCCESS RESPONSE HERE
                         console.log("Success");
     
                         // Alway use .then for waiting for the form to save before running another function
                         VV.Form.DoAjaxFormSave().then(() => {
                            VV.Form.Global.DisplayModal({
                                Icon: "success",
                                Title: "Print Map",
                                HtmlContent: "The PDF of the map has been generated",
                              });
                             VV.Form.HideLoadingPanel();
                         })
                         console.log("saved");
                     } else if (resp.data[0] == 'Error') {
                         message = `An error was encountered. ${resp.data[1]}`;
                         console.log(message);
                         VV.Form.Global.DisplayModal({
                            Icon: "error",
                            Title: "Error Printing Map",
                            HtmlContent:
                              "An error occurred while printing the form. Please try again or contact support if the issue persists.",
                          });
                         VV.Form.HideLoadingPanel();
                     } else {
                         message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
                         console.log(message);
                         VV.Form.Global.DisplayModal({
                            Icon: "error",
                            Title: "Error Printing Map",
                            HtmlContent:
                              "An error occurred while printing the form. Please try again or contact support if the issue persists.",
                          });
                         VV.Form.HideLoadingPanel();
                     }
                 } else {
                     message = 'The status of the response returned as undefined.';
                     console.log(message);
                     VV.Form.Global.DisplayModal({
                        Icon: "error",
                        Title: "Error Printing Map",
                        HtmlContent:
                          "An error occurred while printing the form. Please try again or contact support if the issue persists.",
                      });
                     VV.Form.HideLoadingPanel();
                 }
             } else {
                 message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data.error} <br>`;
                 console.log(message);
                 VV.Form.Global.DisplayModal({
                    Icon: "error",
                    Title: "Error Printing Map",
                    HtmlContent:
                      "An error occurred while printing the form. Please try again or contact support if the issue persists.",
                  });
                 VV.Form.HideLoadingPanel();
             }
         })
}
