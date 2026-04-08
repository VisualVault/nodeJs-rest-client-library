/**
 * VV.Form.Global.CentralNumericValidation
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (PassedControlValue, ComparisonValue, ValidationType) {
/*
    Script Name:   CentralNumericValidation
    Customer:      VisualVault
    Purpose:       The purpose of this function is to allow the validation and comparison of numbers.
    Parameters:    The following represent variables passed into the function:  
    Passed Values: The following are passed into this function in the following order:

                    PassedControlValue - the value of the control being compared.
                    ComparisonValue - the value that is being compared.  Can come in as a string.
                    ValidationType - this is a string passed for the type of validation that should occur.  Valid values are GreaterThan, LessThan, Equals, GreaterThanEqualTo, LessThanEqualTo

    Return Value:  The following represents the value being returned from this function:
                    True if required number are selected, false if not.        
    Date of Dev:   
    Last Rev Date: 11/17/2021
    Revision Notes:
    06/01/2011 - Jason Hatch: Initial creation of the business process. 
    11/17/2021 - Emanuel Jofré: Modified to parse integer anf floats and fixed a bug with the validation of the 0 number 
*/

// Parses the arguments passed into the function.
const controlVal = parseArg(PassedControlValue);
const comparisonVal = parseArg(ComparisonValue);

// Helper function for parsing
function parseArg(arg) {
    let argValue = arg;

    if (typeof argValue === "string") {
        // Removes whitespace from both sides of a string
        argValue = argValue.trim();
        // Regular expression that checks if a string contain only numbers
        const onlyHasNumbersRegex = /^-?\d+\.?\d*$/;
        // Test of regex
        const onlyHasNumbers = onlyHasNumbersRegex.test(argValue);

        // String must contain only numbers (integers or floats)
        if (!onlyHasNumbers) {
            argValue = false;
        }
    }
    // Prevents parsing of arrays
    else if (Array.isArray(argValue)) {
        argValue = false;
    }

    // Parses argument
    return parseFloat(argValue);
}

// If parsed argument is not a number or is undefined
if (isNaN(controlVal) || typeof controlVal === "undefined" || isNaN(comparisonVal) || typeof comparisonVal === "undefined") {
    return false;
} else {
    switch (ValidationType) {
        case "GreaterThan":
            return controlVal > comparisonVal;

        case "LessThan":
            return controlVal < comparisonVal;

        case "Equals":
            return controlVal === comparisonVal;

        case "GreaterThanEqualTo":
            return controlVal >= comparisonVal;

        case "LessThanEqualTo":
            return controlVal <= comparisonVal;

        default:
            alert("The validation type was not passed to the CentralNumericValidation Function");
    }
}

}
