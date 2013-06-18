

var vvEntities = require("./VVEntities");
var ReturnField = vvEntities.ReturnField;


module.exports.getCredentials = function () {
    var options = {};
    options.CustomerAlias = "aceofhearts";
    options.DatabaseAlias = "main";
    options.UserId = "ace.admin";
    options.Key = "z5fVFEhZJ63t4nzs1Vr/ELTzYsdlSUu29Zc8BCnK8d8=";

    return options;
};

module.exports.main = function (vvClient, response) {

    var Q = require('q');

    var formParams = {};
    formParams.fields = "id, name, description, revision";

    var siteParams = {};
    siteParams.fields = "id, name, sitetype";


    var foldersData = {};
    foldersData.q = '';
    foldersData.fields = 'id,name';
    foldersData.folderpath = '/General';
    foldersData.metaonly = 'true';


    //vvClient.getFormTemplates(formParams),
    //vvClient.getSites(siteParams)


    var resultCount = 0;

    Q
        .allResolved(
            [
                vvClient.getSites(siteParams)

            ]
        )
        .then(
            function (promises) {
                console.log("Results count: " + promises.length);

                //                promises.forEach(function (promise) {
                //                    if (promise.isFulfilled()) {
                //                        var value = promise.valueOf();
                //                        console.log('Result');
                //                        console.log(value);
                //                    } else {
                //                        var exception = promise.valueOf().exception;
                //                    }
                //                });

                var promiseSites = promises[0];
                if (promiseSites.isFulfilled()) {
                    var responseData = JSON.parse(promiseSites.valueOf());

                    var sites = responseData.data;
                    resultCount = sites.length;

                    console.log("Listing Sites");
                    for (var x = 0; x < sites.length; x++) {
                        var site = sites[x];
                        console.log('Site Id: ' + site.Id);
                        console.log('Site Name: ' + site.Name);
                        console.log('Site Type: ' + site.SiteType);
                    }
                }

                response.send(200, "Sites returned from REST call " + resultCount);

            }
        )
        .fail(
        function (error) {
            console.log(error);
            response.send(500);
        }
    );

};