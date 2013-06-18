




var ReturnField = function (id, name, value, isError, errorMessage) {
    this.id = id;
    this.name = name;
    this.value = value;
    this.isError = isError;
    this.errorMessage = errorMessage;
};

module.exports.ReturnField = ReturnField;

/**
 * Contains the collection of
 * FormFields from the current form
 */
var FormFieldCollection = function (ffColl) {
    this._ffColl = ffColl;
};

module.exports.FormFieldCollection = FormFieldCollection;


/*
 * returns the formfield requested by name
 *
 */
FormFieldCollection.prototype.getFormFieldByName = function (name) {
    var fieldName = name.toLowerCase();
    var field = null;

    for (var i = 0; i < this._ffColl.length; i++) {
        if (this._ffColl[i].name.toLowerCase() == fieldName) {
            field = this._ffColl[i];
            break;
        }
    }

    return field;
};

/*
 * returns the formfield requested by id
 *
 */
FormFieldCollection.prototype.getFormFieldById = function (id) {
    var fieldId = id.toLowerCase();
    var field = null;

    for (var i = 0; i < this._ffColl.length; i++) {
        if (this._ffColl[i].id.toLowerCase() == fieldId) {
            field = this._ffColl[i];
            break;
        }
    }

    return field;
};



/*
 * returns the formfieldcollection array
 *
 */
FormFieldCollection.prototype.getFieldArray = function () {
    return this._ffColl;
};


