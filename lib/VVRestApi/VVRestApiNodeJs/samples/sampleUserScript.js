var clientLibrary = require('../vvRestApi');

(function (mySampleProject) {
    var sampleScheduledScript = (function () {
        function sampleScheduledScript() {
        }
        sampleScheduledScript.prototype.getCredentials = function () {
            var options = new clientLibrary.common.loginCredentials("", "", "", "VaultTest", "Main");

            return options;
        };

        sampleScheduledScript.prototype.main = function (ffCollection, vvClient, response) {
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

            var formParams = { fields: "id, name, description, revision" };

            var siteParams = { fields: "id, name, sitetype" };

            Q.when(vvClient.getFormTemplates(formParams), vvClient.getSites(siteParams)).then(function (result1, result2) {
                console.log('In the Then clause of Q');
                var outputCollection = [];

                var fld = new this.returnFieldDef(outArray[0].id, outArray[0].name, 'New replacement value', false, '');
                outputCollection.push(fld);

                var fld1 = new this.returnFieldDef(outArray[1].id, outArray[1].name, '', true, 'One of the incredible fields');
                outputCollection.push(fld1);

                response.json(200, outputCollection);
            }).fail(function (error) {
                console.log(error);
            });
        };
        return sampleScheduledScript;
    })();
    mySampleProject.sampleScheduledScript = sampleScheduledScript;
})(exports.mySampleProject || (exports.mySampleProject = {}));
var mySampleProject = exports.mySampleProject;

(module).exports = mySampleProject.sampleScheduledScript;

