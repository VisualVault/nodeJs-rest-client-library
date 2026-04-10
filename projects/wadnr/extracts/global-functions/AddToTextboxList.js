/**
 * VV.Form.Global.AddToTextboxList
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (options) {
/*
  Script Name:   AddToTextboxList
  Customer:      PAELS
  Purpose:       The purpose of this process is to add a value from a dropdown (sourceFieldName) or an explicit value 
                 (addSpecificValue) to a textbox that serves as a delimited list.

  Parameters:   options (Object, Required) - 
                  textboxListName (String, Required) - The name of textbox that holds the list.
                  sourceFieldName (String, Required*) - The name of a dropdown that provides values for the list. 
                    Required if addSpecificValue == null.
                  addSpecificValue (String, Required*) - A specific value to add to the list. Required if sourceFieldName == null.
                  delimiter (String) - The string used to split and join the list. Note: is whitespace-insensitive during
                    splitting but will preserve whitespace on joining. Defaults to " | ".
                  surroundWithDelimiter (Boolean) - Flag to determine whether or not to surround the string list with delimiters.
                    Inserting delimiter before and after can help avoid partial match errors in SQL LIKE queries. Defaults to true.

  Example usage: 
                // Pipe-separated list of license types
                VV.Form.Global.AddToTextboxList({
                  sourceFieldName: 'License List',
                  textboxListName: 'License Types',
                })

                // Comma-separated list of emails
                VV.Form.Global.AddToTextboxList({
                  sourceFieldName: 'Employee Emails',
                  textboxListName: 'Recipients',
                  delimiter: ', ',
                  surroundWithDelimiter: false,
                })

  Return Value: none

  Date of Dev: 5/16/2023
  Last Rev Date: 5/16/2023
  Revision Notes:
  5/16/2023  - John: Script created
*/

// Checks required params are set and optional params are set to default. Throws error if required params missing.
checkForParameters();

// check the new list item is valid
let newListItem;
if (options.addSpecificValue) {
  newListItem = options.addSpecificValue;
} else {
  let selectedListItem = VV.Form.GetFieldValue(options.sourceFieldName);
  let isBlank = VV.Form.Global.CentralValidation(selectedListItem, "Blank") === false;
  let isSelectItem = VV.Form.Global.CentralValidation(selectedListItem, "DDSelect") === false;
  if (isBlank || isSelectItem) {
    VV.Form.Global.DisplayModal({
      Icon: "warning",
      Title: "No Item Selected",
      HtmlContent: `Please select an item from the ${options.sourceFieldName} dropdown.`,
    });
    return; // don't add invalid items to list
  } else {
    newListItem = selectedListItem;
  }
}

// split out existing items from textbox list into set
let trimmedDelimiter = options.delimiter.trim();
let existingItemsList = new Set();
VV.Form.GetFieldValue(options.textboxListName)
  .split(trimmedDelimiter)
  .forEach((listItem) => {
    listItem = listItem.trim();
    if (listItem) {
      existingItemsList.add(listItem);
    }
  });

// add new item to the set (sets inherently discard duplicates)
existingItemsList.add(newListItem);

// stringify the items list
let itemsListString = '';
if (existingItemsList.size > 0) {
  itemsListString = [...existingItemsList].join(options.delimiter);

  if (options.surroundWithDelimiter) {
    itemsListString = `${trimmedDelimiter} ${itemsListString} ${trimmedDelimiter}`;
  }
}

// insert list string into textbox
VV.Form.SetFieldValue(options.textboxListName, itemsListString);

function checkForParameters() {
  const requiredOptions = [
    "textboxListName",
  ];
  let errorLog = [];
  if (options == null || Object.keys(options).length < 1) {
    errorLog.push(
      "An options parameter object was not passed in, this is a required parameter."
    );
  } else {
    // check options
    requiredOptions.forEach((reqOptionName) => {
      if (options[reqOptionName] == null) {
        errorLog.push(
          `A ${reqOptionName} option was not passed in, this is a required parameter.`
        );
      }
    });

    if (options.sourceFieldName == null && options.addSpecificValue == null) {
      errorLog.push(`Neither a sourceFieldName or an addSpecificValue option was passed in, at least one is required.`);
    }

    if (options.delimiter == null) {
      options.delimiter = ' | ';
    }

    if (options.surroundWithDelimiter == null) {
      options.surroundWithDelimiter = true;
    }
  }

  if (errorLog.length > 0) {
    const errorTitle = "Missing Required Parameters";
    VV.Form.Global.DisplayModal({
      Title: errorTitle,
      Icon: "error",
      HtmlContent: errorLog.join("<br>"),
    });

    throw new Error(`${errorTitle}\n${errorLog.join("\n")}`);
  }
}

}
