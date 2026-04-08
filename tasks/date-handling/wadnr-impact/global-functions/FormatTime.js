/**
 * VV.Form.Global.FormatTime
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (timeVal) {
//Parameter passed:  timeVal
//The purpose of this function is to take a time string entered in any format and format it into a standard of HH:MM AM or HH:MM PM.


//Get values from the original value passed to the function.
var colonPlacement = timeVal.search(":")
timeVal = timeVal.toUpperCase();
var amLocation = timeVal.search('AM');
var pmLocation = timeVal.search('PM');

//Remove all characters
var s2 = ("" + timeVal).replace(/\D/g, '');

var newTimeStr = '';
//If colon was present, format the string.
if (colonPlacement > 0) {
    newTimeStr = s2.substr(0, colonPlacement) + ":" + s2.substr(colonPlacement, 2);
}
else {
    //Handle what occurs if a colon was not present.
    if (s2.length < 3) {
        //return when not enough characters were entered, time check will communicate the format.  
        return timeVal;
    }
    else if (s2.length == 3) {
        //Attempt to put the colon after the first character.
        newTimeStr = "0" + s2.substr(0, 1) + ":" + s2.substr(1, 2);
    }
    else if (s2.length ==4) {
        //Attempt to put the colon after the second character.
        newTimeStr = s2.substr(0, 2) + ":" + s2.substr(2, 2);
    }
    else if (s2.length > 4) {
        //Too many characters were entered, time check will communicate the format.
        return timeVal;
    }
}

//Add the time of day back into the string.
if (amLocation > 0) {
    newTimeStr = newTimeStr + " AM";
}
else if (pmLocation > 0) {
    newTimeStr = newTimeStr + " PM";
}
else {
    //Not doing anything in this state because the user has not entered a value.
}

return newTimeStr;
}
