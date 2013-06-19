var clientLibrary = require('../vvRestApi');

var mySampleProject;
(function (mySampleProject) {
    var sampleScheduledScript = (function () {
        function sampleScheduledScript() {
        }
        sampleScheduledScript.prototype.getCredentials = function () {
            var options = {
                customerAlias: "VaultTest",
                databaseAlias: "main",
                developerId: "",
                developerSecret: "",
                logingToken: ""
            };

            return options;
        };

        sampleScheduledScript.prototype.main = function (vaultClient, response) {
            var Q = require('q');

            var formParams = { fields: "id, name, description, revision" };

            var siteParams = { fields: "id, name, sitetype" };

            var foldersData = {
                q: '',
                fields: 'id,name',
                folderPath: '/General',
                metaOnly: true
            };

            var resultCount = 0;

            Q.allResolved([
                vaultClient.getSites(siteParams)
            ]).then(function (promises) {
                console.log("Results count: " + promises.length);

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
            }).fail(function (error) {
                console.log(error);
                response.send(500);
            });
        };
        return sampleScheduledScript;
    })();
    mySampleProject.sampleScheduledScript = sampleScheduledScript;
})(mySampleProject || (mySampleProject = {}));

(module).exports = mySampleProject.sampleScheduledScript;

