

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

module.exports.main = function (ffCollection, vvClient, response) {


    var outArray = [];
    var ff1 = ffCollection.getFormFieldByName("Text1");
    if (ff1 != null) {
        console.log('Field 1 name: ' + ff1.name);
        outArray.push(ff1);
    }

    ff1 = ffCollection.getFormFieldByName("Text2");
    if (ff1 != null) {
        console.log('Field 2 name: ' + ff1.name);
        outArray.push(ff1);
    }


    var Q = require('q');

    var formParams = {};
    formParams.fields = "id, name, description, revision";

    var siteParams = {};
    siteParams.fields = "id, name, sitetype";


    Q
        .when(
            vvClient.getFormTemplates(formParams),
            vvClient.getSites(siteParams)
        )
        .then(
            function (result1, result2) {
                console.log('In the Then clause of Q');
                var outputCollection = [];

                var fld = new ReturnField(
                    outArray[0].id,
                    outArray[0].name,
                    'New replacement value',
                    false,
                    '');
                outputCollection.push(fld);

                var fld1 = new ReturnField(
                    outArray[1].id,
                    outArray[1].name,
                    '',
                    true,
                    'One of the incredible fields');
                outputCollection.push(fld1);

                response.json(200, outputCollection);
            }
        )
        .fail(
            function (error) {
                console.log(error);
            }
    );


};