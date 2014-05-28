


module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "sampleCustomer";
    options.databaseAlias = "main";
    options.userId = "sample.user";
    options.password = "mypassword";
    options.clientId = "ce9e042d-87f5-42d5-97af-435aff70152b";
    options.clientSecret = "/PbgaChHbPoboS/1s07E6pfHCNFSdqPsD3B/yiKHfHw=";


    return options;
};

module.exports.main = function (ffColl, vvClient, response) {
    console.log('In user Main method');
    var meta = { code: 200, error: '' };

    try {
        //setup parameters for making requests to VisualVault
        var formParams = {};
        formParams.fields = "id, name, description, revision";

        var siteParams = {};
        siteParams.fields = "id, name, sitetype";

        var foldersData = {};
        foldersData.q = '';
        foldersData.fields = 'id,name';
        foldersData.folderpath = '/General';
        foldersData.metaonly = 'true';

        var Q = require('q');

        //make request to VisualVault
        Q
            .allSettled(
                [
                    vvClient.forms.getFormTemplates(formParams),
                    vvClient.sites.getSites(siteParams),
                    vvClient.library.getFolders(foldersData)

                ]
            )
            .then(
                function (promises) {
                    console.log("Results count: " + promises.length);

                    //example of accessing returned data from request to VisualVault
                    var promiseFormTemplates = promises[0];
                    if (promiseFormTemplates.state == 'fulfilled') {
                        var responseData = JSON.parse(promiseFormTemplates.value);

                        var formTemplates = responseData.data;

                        console.log("Listing Form Templates");
                        for (var x = 0; x < formTemplates.length; x++) {
                            var formTemplate = formTemplates[x];
                            console.log('FormTemplate Id: ' + formTemplate.id);
                            console.log('FormTemplate Name: ' + formTemplate.name);
                        }
                    }

                    meta.code = 200;
                    meta.error = "";
                    response.json(200, meta);
                }
            )
            .fail(
                function (error) {
                    console.log(error);

                    meta.code = 400;
                    meta.error = "An error occurred while accessing VisualVault";
                    response.json(200, meta);
                }
            );




    } catch (ex) {
        meta.code = 400;
        meta.error = "An exception occurred while performing this scheduled script";
        response.json(200, meta);
    }

};