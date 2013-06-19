///<reference path='..\dts\node.d.ts' />
///<reference path='..\dts\express.d.ts' />

import clientLibrary = require('../vvRestApi');

module mySampleProject {
    export class sampleScheduledScript {

        constructor() {
        }

        getCredentials() {
            var options = {
                customerAlias: "VaultTest",
                databaseAlias: "main",
                developerId: "",
                developerSecret: "",
                logingToken: ""
            };
       
            return options;
        }

        main(vaultClient: clientLibrary.vvClient, response) {

            var Q = require('q');

            var formParams = { fields: "id, name, description, revision" };
            

            var siteParams = { fields: "id, name, sitetype" };
            
            var foldersData = {
                q: '',
                fields: 'id,name',
                folderPath: '/General',
                metaOnly: true
            };
 
            //vvClient.getFormTemplates(formParams),
            //vvClient.getSites(siteParams)


            var resultCount = 0;

            Q
                .allResolved(
                    [
                        
                        vaultClient.getSites(siteParams)

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

        }

    }
}

(module).exports = mySampleProject.sampleScheduledScript;
