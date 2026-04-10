/**
 * VV.Form.Global.CentralDOBValidation
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (ValidationType, ControlName, ComparisonValue) {
/*
    Script Name:   CentralDOBValidation
    Customer:      VisualVault
    Purpose:       The purpose of this function is to allow the validation and comparison of date of birth and to determine if
                    the DOB puts the individual older than a certain age.
    Parameters:    The following represent variables passed into the function:  
                    Passed parameters:  ValidationType, ControlName, ComparisonValue
                    This function compares an age versus Date of Birth being compared to make sure the person is within the expected age range.
                    The following values are passed into this function in the following order:
                    ValidationType - string that represents the type of validation.  Valid values DOBLessThan, DOBGreaterThan
                    ControlName - string representing the name of the control that is being checked.
                    ComparisonValue - this is a number value to represent the expected age range.
    Return Value:  The following represents the value being returned from this function:
                    True if required number are selected, false if not.        
    Date of Dev:   
    Last Rev Date: 06/01/2011
    Revision Notes:
    06/01/2011 - Jason Hatch: Initial creation of the business process. 
*/


var DOBValue = VV.Form.GetFieldValue(ControlName);
// if DOBValue has a value
if (DOBValue) {

    var DOB = new Date(DOBValue);
    var today = new Date();
    var RangeYear = DOB.getFullYear();
    var RangeDay = DOB.getDate();
    var RangeMonth = DOB.getMonth();
    var age = today.getFullYear() - RangeYear;
    if (
        today.getMonth() < RangeMonth ||
        (today.getMonth() === RangeMonth && today.getDate() < RangeDay)
    ) {
        age--;
    }

    switch (ValidationType) {
        case 'DOBLessThan':
            return age < ComparisonValue;

        case 'DOBGreaterThan':
            return age >= ComparisonValue;

        default:
            alert('The right validation was not passed to the CentralDOBValidation Function');
    }
} else {
    return false;
}
}
