/**
 * VV.Form.Global.Age
 * Parameters: 1
 * Extracted: 2026-04-09
 */
function (birthdate) {
var birthDate = new Date(birthdate);

today_date = new Date();
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
