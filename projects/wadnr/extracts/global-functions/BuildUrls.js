/**
 * VV.Form.Global.BuildUrls
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (data, htmlLinks, readOnly) {
/*
    Script Name:   BuildUrls
    Customer:      PAELS
    Purpose:       The purpose of this process is to build a list of form record URLs from identifiers.

    Parameters:     data (Object[], Required) - Form data objects with the following properties: 
                      revisionID (String) - Revision ID of a form
                      formID (String) - Form ID of a form
                    htmlLinks (Boolean) - Determines if urls are returned as a list of <a> elements
                    readOnly (Boolean) - Determines if urls open records in "Read Only" mode

    Return Value:   An array of form record URLs in the specified format

    Date of Dev: 3/7/2023
    Last Rev Date: 6/2/2023
    Revision Notes:
    3/7/2023 - Brian: Script created.
    6/2/2023 - John: Add readOnly optional param
*/
// set baseUrl to VV.BaseURL
const baseUrl = VV.BaseURL;
// create an empty array to store urls
const urls = [];

// loop through each object in data array
data.forEach((obj) => {
  // create URL with revisionID and hidemenu=true query parameters
  let url = `${baseUrl}FormDetails?DataID=${obj.revisionID}&hidemenu=true`;
  if (readOnly) {
    url += '&Mode=ReadOnly';
  }

  // if htmlLinks is true, create HTML link using url and formID
  if (htmlLinks) {
    // Create div and a tags for clickable link text and push into urls array
    const link = `<div><a href="${url}" onClick="Swal.close()" target="_blank">${obj.formID}</a></div>`;
    urls.push(link);
  } else {
    // otherwise, just push the url into urls array
    urls.push(url);
  }
});

// return the URLs array
return urls;

}
