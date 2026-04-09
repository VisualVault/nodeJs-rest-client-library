/**
 * VV.Form.Global.CalculateAge
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (birthdate, dateatage) {
/*
    Script Name:   CalculateAge
    Customer:      VisualVault
    Purpose:       This function takes in the birthdate and date for calculating age.  
    Parameters:    The following represent variables passed into the function:  
                   birthdate, dateatage:         date as a string from getfieldvalue.

    Return Value:  The following represents the value being returned from this function:
                        days:  Returns a number that represents the age.        


    Date of Dev:   
    Last Rev Date: 10/10/2019

    Revision Notes:
    12/07/2018 - Jason Hatch: Initial creation of the business process. 
    10/10/2019 - Jason Hatch: Add header.
*/
var birthDate = new Date(birthdate);

today_date = new Date(dateatage);
today_year = today_date.getFullYear();
today_month = today_date.getMonth();
today_day = today_date.getDate();
age = today_year - birthDate.getFullYear();

if ( today_month < birthDate.getMonth())
{
    age--;
}
if (((birthDate.getMonth()) == today_month) && (today_day < birthDate.getDate()))
{
    age--;
}
return age;
}
