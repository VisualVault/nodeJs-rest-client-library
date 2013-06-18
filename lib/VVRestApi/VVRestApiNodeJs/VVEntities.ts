///<reference path='dts\node.d.ts' />
///<reference path='dts\express.d.ts' />
///

class CoreFunctions {

    id : any;
    name: string;
    value: any;
    isError: bool;
    errorMessage: string;

	ReturnField(id, name, value, isError, errorMessage) {
        this.id = id;
        this.name = name;
        this.value = value;
        this.isError = isError;
        this.errorMessage = errorMessage;
    }
}

/**
 * Contains the collection of
 * FormFields from the current form
 */
class FormFieldCollection {
    _ffColl : any;
    
    constructor (ffColl) {
        this._ffColl = ffColl;
    }

     /*
     * returns the formfield requested by name
     *
     */
      getFormFieldByName(name) {
        var fieldName = name.toLowerCase();
        var field = null;

        for (var i = 0; i < this._ffColl.length; i++) {
            if (this._ffColl[i].name.toLowerCase() == fieldName) {
                field = this._ffColl[i];
                break;
            }
        }

        return field;
    }
    
    /*
     * returns the formfield requested by id
     *
     */
    getFormFieldById(id) {
        var fieldId = id.toLowerCase();
        var field = null;

        for (var i = 0; i < this._ffColl.length; i++) {
            if (this._ffColl[i].id.toLowerCase() == fieldId) {
                field = this._ffColl[i];
                break;
            }
        }

        return field;
    }

    /*
     * returns the formfieldcollection array
     *
     */
    getFieldArray() {
        return this._ffColl;
    }
}

(module).exports.ReturnField = new CoreFunctions().ReturnField;
(module).exports.FormFieldCollection = FormFieldCollection;




