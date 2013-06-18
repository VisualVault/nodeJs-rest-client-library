var CoreFunctions = (function () {
    function CoreFunctions() { }
    CoreFunctions.prototype.ReturnField = function (id, name, value, isError, errorMessage) {
        this.id = id;
        this.name = name;
        this.value = value;
        this.isError = isError;
        this.errorMessage = errorMessage;
    };
    return CoreFunctions;
})();
var FormFieldCollection = (function () {
    function FormFieldCollection(ffColl) {
        this._ffColl = ffColl;
    }
    FormFieldCollection.prototype.getFormFieldByName = function (name) {
        var fieldName = name.toLowerCase();
        var field = null;
        for(var i = 0; i < this._ffColl.length; i++) {
            if(this._ffColl[i].name.toLowerCase() == fieldName) {
                field = this._ffColl[i];
                break;
            }
        }
        return field;
    };
    FormFieldCollection.prototype.getFormFieldById = function (id) {
        var fieldId = id.toLowerCase();
        var field = null;
        for(var i = 0; i < this._ffColl.length; i++) {
            if(this._ffColl[i].id.toLowerCase() == fieldId) {
                field = this._ffColl[i];
                break;
            }
        }
        return field;
    };
    FormFieldCollection.prototype.getFieldArray = function () {
        return this._ffColl;
    };
    return FormFieldCollection;
})();
(module).exports.ReturnField = new CoreFunctions().ReturnField;
(module).exports.FormFieldCollection = FormFieldCollection;
