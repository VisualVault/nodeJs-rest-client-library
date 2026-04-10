/**
 * VV.Form.Global.BuildUploadFolderPath
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (Id) {
/*
    Script Name:   BuildUploadFolderPath
    Customer:      VisualVault
    Purpose:       The purpose of this function is to build a folder path using the Id of the Individual
                    or Organization. This will use the path set as "1-10000\1-1000"
    Parameters:    The following represent variables passed into the function:  
                    Id: The Id of the individual or organization.
                   
    Return Value:  The uploader path needed.
*/

var BuildUploadFolderPathGetUpperEndFolder = function (intId,lowEnd,highEnd) {
    var ret = "";
    var stepend = highEnd;
    var fnd = false;
    while (!fnd) {
        if (intId >= lowEnd && intId <= highEnd) {
            ret = lowEnd + '-' + highEnd;
            fnd = true;
        }
        lowEnd += stepend;
        highEnd += stepend;
    }
    return ret;
}
var uploadPath = "";
if (
  Id.length > 0
) {
  uploadPath = "";
  var idInt = parseInt(Id.split("-")[Id.split("-").length - 1]);
  var upperFoldChoosen = BuildUploadFolderPathGetUpperEndFolder(idInt,1,10000);
  var lowerFoldChoosen = BuildUploadFolderPathGetUpperEndFolder(idInt,1,1000);
  uploadPath += upperFoldChoosen + '\\';
  uploadPath += lowerFoldChoosen;
}

return uploadPath;
}
