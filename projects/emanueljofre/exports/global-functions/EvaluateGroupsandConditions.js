/**
 * VV.Form.Global.EvaluateGroupsandConditions
 * Parameters: 1
 * Extracted: 2026-04-09
 */
function (passedFieldArray) {
//Global Script - EvaluateGroupsandConditions (passedFieldArray).
//Purpose of this script is to manually trigger the evaluation of groups and conditions so the form
//updates manually when a field was set programmatically and did not call the build-in evaluation mechanism within VV.
//Parameters passed in are an array of field names that need to trigger evaluations.
//Example to call this code would be as follows:  
// var fieldArray = ['chkCheckbox','ddDropDown','numCel','numSumField','txtMultiLineTextbox', 'txtTextbox','calCalendar'];
// VV.Form.Global.EvaluateGroupsandConditions(fieldArray);

var fieldArray = [];
fieldArray = passedFieldArray;

//Lookup through each field name passed into the function to acquire field and execute event to trigger evaluation.
if (fieldArray.length > 0) {
    fieldArray.forEach(function(fieldItem) {
        //Get the field and field type using jQuery.  Format should be "[vvfieldname = 'fieldItem']" after string built.
        var fieldQueryString = "[vvfieldname = '" + fieldItem + "']";
        var fieldQueryString2 = "[vvfieldname = '" + fieldItem + "'] > input:first";   //For the calendar control.
        var fieldType = $(fieldQueryString).attr("vvfieldtype");

        //Need different information for a calendar, using different mechanism to find what is needed.
        if (fieldType == 'calendar') {
            var fieldObj = $find($(fieldQueryString2).attr("id"));
        } else {
            var fieldObj = $(fieldQueryString);
        }

        //Identify field type and call specific mechanism to trigger evaluation.
        if (fieldType == 'textbox') {
            fieldObj.triggerHandler('blur');
        }
        else if (fieldType == 'multilinetextbox') {
            fieldObj.triggerHandler('blur');
        }
        else if (fieldType == 'cellfield') {
            fieldObj.triggerHandler('blur');
        }
        else if (fieldType == 'sumfield') {
            fieldObj.triggerHandler('blur');
        }
        else if (fieldType == 'checkbox') {
            fieldObj.triggerHandler("click");
        }
        else if (fieldType == 'dropdownlist') {
            fieldObj.triggerHandler('change');
        }
        else if (fieldType == 'calendar') {
            fieldObj.raise_dateSelected();
        }
        //At this time, user id stamp was not developed as the mechanism to fire the evaluation was more difficult to acquire.
        // else if (fieldType == 'useridstamp') {
        //     fieldObj.trigger('');
        // }
        else {
            console.log('Field could not be found or type was not recognized.');
            return 'Field could not be found or type was not recognized.';
        }
    });
}
else {
    console.log('Field array is empty.  Need field names passed in');
    return 'Field array is empty.  Need field names passed in.';
}

}
