


module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "aceofhearts";
    options.databaseAlias = "main";
    options.userId = "ace.admin";
    options.password = "p";

    return options;
};

module.exports.main = function (ffColl, vvClient, response) {
    console.log('In user Main method');

    var outputCollection = [];
    try {
        //var ffCollection = new FormFieldCollection(ffColl);


        var outArray = [];
        var ff1 = ffColl.getFormFieldByName("Name");
        if (ff1 != null) {
            console.log('Field 1 name: ' + ff1.name);
            console.log('Field 1 name: ' + ff1.value);
            outArray.push(ff1);
        }

        ff1 = ffColl.getFormFieldByName("Dept");
        if (ff1 != null) {
            console.log('Field 2 name: ' + ff1.name);
            console.log('Field 2 name: ' + ff1.value);
            outArray.push(ff1);
        }

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


        Q
            .allSettled(
                [
                    //vvClient.forms.getFormTemplates(formParams),
                    vvClient.sites.getSites(siteParams),
                    vvClient.library.getFolders(foldersData)

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

                    //                    var promiseFormTemplates = promises[0];
                    //                    if (promiseFormTemplates.state == 'fulfilled'){
                    //                        var responseData = JSON.parse(promiseFormTemplates.value);
                    //
                    //                        var formTemplates = responseData.data;
                    //
                    //                        console.log("Listing Form Templates");
                    //                        for (var x=0; x < formTemplates.length; x++){
                    //                            var formTemplate = formTemplates[x];
                    //                            console.log('FormTemplate Id: ' + formTemplate.id);
                    //                            console.log('FormTemplate Name: ' + formTemplate.name);
                    //                            //console.log('FormTemplate Revision: ' + formTemplate.Revision);
                    //                        }
                    //                    }

                    var outputCollection = [];

                    var fld = new vvClient.forms.returnField(
                        outArray[0].id,
                        outArray[0].name,
                        'New replacement value',
                        false,
                        '');
                    outputCollection.push(fld);

                    var fld1 = new vvClient.forms.returnField(
                        outArray[1].id,
                        outArray[1].name,
                        '',
                        true,
                        'This field is required');
                    outputCollection.push(fld1);


                    console.log("Returning: " + outputCollection);
                    response.json(200, outputCollection);

                }
            )
            .fail(
                function (error) {
                    console.log(error);
                    response.send(500);
                }
            );




    } catch (ex) {
        console.log('In user Main method catch exception ' + ex);
    }

};