/**
 * VV.Form.Global.FormatTimeHHMM
 * Parameters: 3
 * Extracted: 2026-04-10
 */
function (time,showAMPM,invalidText) {
/*Script Name:  FormatTimeHHMM
 Customer:      NEDHHS
 Purpose:       The purpose of this script is to convert times entered in text fields to hh:mm format, and converting the entered time to standard time if entered as Military Time.
 Date of Dev: 10/07/2021
 Last Rev Date: 10/07/2021
 Revision Notes:
 10/07/2021 - Brian Davis: Script created
 */

const reg = /^\d*(\.\d+)?$/;

//Step 1: Clean up time based on length add : as needed.
function checkLength(time) {
    time = time.trim();
    if(time.toLowerCase() == 'closed'){
        return 'Closed';
    }
    if (time.length == 1) {
        time = time + ':00';
    }
    if (time.length == 2) {
        time = time + ':00';
    }
    if (time.length == 3) {
        time = time.replace(/(.{1})(?!$)/, '\$1:');
    } else if (time.length == 4 && time.match(reg) !== null) {
        time = time.replace(/(.{2})(?!$)/, '\$1:');
    }
    return validateTime(time);
}
//Step 2: Validates Correct Time returns empty string if invalid.
function validateTime(time) { //Validates correct time, returns null if invalid
    const timeReg = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    time = time.match(timeReg);
    if (time != null) {
        time = convertTime(time[0]);
        return time;
    }
    return invalidText;
}
//Step 3: Converts Military time and returns Standard Time
function convertTime(time) {
    time = time.split(':'); // convert to array

    // fetch
    var hours = Number(time[0]);
    var minutes = Number(time[1]);
    //var seconds = Number(time[2]);

    // calculate
    var timeValue;

    if (hours > 0 && hours <= 12) {
        timeValue = "" + hours;
    } else if (hours > 12) {
        timeValue = "" + (hours - 12);
    } else if (hours == 0) {
        timeValue = "12";
    }

    timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  // get minutes
    if (showAMPM) {
        timeValue += (hours >= 12) ? " PM" : " AM";  // get AM/PM (Optional)
    }

    return timeValue;
}

return checkLength(time);
}
