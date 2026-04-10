/**
 * VV.Form.Global.CalculateFirstLetterRangeFolderName
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (ProviderName) {
/*
  Script Name:   CalculateFirstLetterRangeFolderName
  Customer:      PAELS
  Purpose:       The purpose of this process is to return the name of the "First Letter Range" folder for a given Provider Name
  Parameters:    ProviderName (String, Required) 
  
  Return Value:  A string representing the First Letter Range folder name

  Date of Dev: 4/24/2023 
  Last Rev Date: 4/24/2023
  Revision Notes:
  4/24/2023  - John Sevilla: Script created
*/
const englishAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numbers = '0123456789';
const specialCharFolderName = 'SpecialChar';
const rangeSize = 3; // into triples

if (typeof ProviderName !== 'string' || ProviderName.trim() === '') {
  throw new Error('A ProviderName was not passed in, this is a required parameter.');
} else {
  ProviderName = ProviderName.trim();
}

let providerNameFirstChar = ProviderName[0].toUpperCase();
let folderName;
if (/\d/.test(providerNameFirstChar)) {
  // starts with number
  folderName = getRangeNameFromAlphabet(numbers, rangeSize, providerNameFirstChar);
} else if (/[A-Z]/.test(providerNameFirstChar)) {
  // starts with letter
  folderName = getRangeNameFromAlphabet(englishAlphabet, rangeSize, providerNameFirstChar);
} else {
  folderName = specialCharFolderName;
}

/**
 * Divides the given alphabet into ranges of rangeSize and returns the name of the range that contains the 
 * searchCharacter. Ranges shorter than the rangeSize (because the alphabet does not divide evenly), are truncated.
 * @param {string} alphabet - a set of characters to divide into ranges
 * @param {number} rangeSize - the size of the ranges the alphabet is divided into
 * @param {string} searchCharacter - a character within the alphabet to find the range name of
 * @returns {string} the name of the range in "X-X" format
 */
// 
function getRangeNameFromAlphabet(alphabet, rangeSize, searchCharacter) {
  let searchCharIndex = alphabet.indexOf(searchCharacter);
  if (searchCharIndex < 0) {
    throw new Error('Search character must belong to alphabet');
  }

  let rangeName = null;
  for (let lowIndex = 0; lowIndex < alphabet.length && rangeName == null; lowIndex += rangeSize) {
    let highIndex = lowIndex + rangeSize - 1;
    // check if search char's index is within range created by low-high
    if (searchCharIndex <= highIndex) {
      // character's range found; check that the range is within alphabet's limit
      if (highIndex < alphabet.length) {
        // within limit (e.g. 'D-F' for rangeSize = 3)
        let lowChar = alphabet[lowIndex];
        let highChar = alphabet[highIndex];
        rangeName = `${lowChar}-${highChar}`;
      } else {
        // outside limit, truncate range (e.g. 'Y-Z' for rangeSize = 3)
        let lowChar = alphabet[lowIndex];
        let highChar = alphabet[alphabet.length - 1];
        if (lowChar !== highChar) {
          rangeName = `${lowChar}-${highChar}`;
        } else {
          // range consists of one letter, set range name to one character (e.g. '9' for rangeSize = 3)
          rangeName = lowChar;
        }
      }
    }
  }

  return rangeName;
}

return folderName;
}
