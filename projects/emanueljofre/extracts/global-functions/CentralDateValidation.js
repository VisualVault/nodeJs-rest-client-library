/**
 * VV.Form.Global.CentralDateValidation
 * Parameters: 5
 * Extracted: 2026-04-09
 */
function (PassedControlValue, ValidationType, ComparisonValue, ComparisonUnit, ComparisonQty) {
/*
    Script Name:   CentralDateValidation
    Customer:      VisualVault
    Purpose:       The purpose of this function is to allow the validation and comparison of dates.
    Parameters:    The following represent variables passed into the function:  
                    Passed Parameters Order:  PassedControlValue, ValidationType, ComparisonValue, ComparisonUnit, ComparisonQty
                    ValidationTypes include DateEqual, DateBefore, DateAfter, BeforeToday, AfterToday, TodayorBefore, TodayorAfter, DateBeforeUnit and DateAfterUnit
                    PassedControlValue is always going to be the current control.  Value acquired from GetFieldValue.
                    ComparisonValue is always going to be the control we want to compare.  Value acquired from GetFieldValue or passed in as a date object.
                    ComparisonUnit will be M, Y or D.
                    Comparison Qty is the numeric value we are comparing against.
    Return Value:  The following represents the value being returned from this function:
                    True if required number are selected, false if not.        
    Date of Dev:   
    Last Rev Date: 06/18/2019
    Revision Notes:
    06/01/2011 - Jason Hatch: Initial creation of the business process.
    01/13/2019 - Kendra Austin: Added validation types BeforeToday, AfterToday, TodayorBefore, and TodayorAfter.
                                For all passed in dates, ignore time values (as when passing in Date()). Bug fixes for DateBeforeUnit and DateAfterUnit.
    06/18/2019 - Jason Hatch: Updated so that the comparison will not strip the time values out now that time is allowed for some calendar fields.
*/

if (PassedControlValue && ValidationType) {
    //Validate that the correct additional values were passed in, based on ValidationType
    if (ValidationType == 'DateEqual' || ValidationType == 'DateBefore' || ValidationType == 'DateAfter') {
        if (!ComparisonValue) {
            return false;
        }
    }
    if (ValidationType == 'DateBeforeUnit' || ValidationType == 'DateAfterUnit') {
        if (!ComparisonUnit || !ComparisonQty) {
            alert('For a ValidationType of DateBeforeUnit or DateAfterUnit, a ComparisonUnit and ComparisonQty must be provided to the CentralDateValidation Function.');
            return false;
        }
    }

    //Remove the time portion of any date passed in
    var d = new Date();
    var startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var passedControlValueDateOnly = new Date(PassedControlValue)
    var comparisonValueDateOnly = new Date();

    if (ComparisonValue) {
        comparisonValueDateOnly = new Date(ComparisonValue);
    }

    //Use parse to put the values into numeric formats that can be compared.
    var today = Date.parse(startOfToday);
    var FirstDate = Date.parse(passedControlValueDateOnly);
    var SecondDate = Date.parse(comparisonValueDateOnly);

    if (ComparisonUnit && ComparisonQty) {
        //Convert value we are comparing to a lower case.
        var datepart = ComparisonUnit.toLowerCase();

        //Get the number of milliseconds for DiffVal. One month from Feb 1 to March 1 is a different value than one month from Dec 1 to Jan 1. Leap years, etc.
        var DiffVal;
        var unitBefore = new Date();
        var unitAfter = new Date();

        if (datepart == 'm') {
            var month = Number(passedControlValueDateOnly.getMonth());
            unitBefore = passedControlValueDateOnly.setMonth(month + Number(ComparisonQty));
            unitAfter = passedControlValueDateOnly.setMonth(month - Number(ComparisonQty));
        }
        else if (datepart == 'd') {
            var day = Number(passedControlValueDateOnly.getDate());
            unitBefore = passedControlValueDateOnly.setDate(day + Number(ComparisonQty));
            unitAfter = passedControlValueDateOnly.setDate(day - Number(ComparisonQty));
        }
        else if (datepart == 'y') {
            var year = passedControlValueDateOnly.getFullYear();
            unitBefore = passedControlValueDateOnly.setFullYear(year + Number(ComparisonQty));
            unitAfter = passedControlValueDateOnly.setFullYear(year - Number(ComparisonQty));
        }

        //Calculate the millisecond-represented date to compare to the ComparisonValue (SecondDate)
        if (ValidationType == 'DateBeforeUnit') {
            DiffVal = unitBefore;
        }
        else if (ValidationType == 'DateAfterUnit') {
            DiffVal = unitAfter;
        }
    }

    switch (ValidationType) {
        case 'DateEqual': //Compare when the current control date equals the second comparable value.
            return FirstDate === SecondDate;

        case 'DateBefore': //Compare when the current control date is before the second comparable value.
            return FirstDate < SecondDate;

        case 'DateAfter': //Compare when the current control date is after the second comparable value.
            return FirstDate > SecondDate;

        case 'DateBeforeUnit': //Compare when the current control date is before the second comparible value and the difference is greater than or = X units.  X = ComparisonQty.
            return FirstDate <= SecondDate && DiffVal <= SecondDate;

        case 'DateAfterUnit': //Compare when the current control date is after the second comparible value and the difference is greater than or = X units.  X = ComparisonQty.
            return FirstDate >= SecondDate && DiffVal >= SecondDate;

        case 'BeforeToday': //Compare when the current control date is before the current date.
            return FirstDate < today;

        case 'AfterToday': //Compare when the current control date is after the current date.
            return FirstDate > today;

        case 'TodayorBefore': //Compare when the current control date is equal to or before the current date. 
            return FirstDate <= today;

        case 'TodayorAfter': //Compare when the current control date is equal to or afte rthe current date.
            return FirstDate >= today;

        default:
            alert('The right ValidationType was not passed to the CentralDateValidation Function');
    }
}
else {
    return false;
}
}
