/**
 * asyncTest
 * Category: Form
 * Modified: 2026-03-24T16:39:39.903Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: b15d43cc-558a-f011-82f4-eead855597dc
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
const logger = require("../log");

module.exports.getCredentials = function () {
  var options = {};
  options.customerAlias = "EmanuelJofre";
  options.databaseAlias = "Main";
  options.userId = "SiteMax.API";
  options.password = "dXnN*K6P";
  options.clientId = "de38846f-814a-4255-81a9-df67802e1a9e";
  options.clientSecret = "KQhAqDZS98ZIFi2bbP3KuhwmQ6LED3Yp+xXRRwiJhk0=";
  return options;
};

module.exports.main = async function (ffCollection, vvClient, response) {
  /*
    Script Name:    Script Name Here
    Customer:       Project Name
    Purpose:        Brief description of the purpose of the script
    Preconditions:
                    - List of libraries, forms, queries, etc. that must exist for this code to run
                    - List other preconditions such as user permissions, environments, etc.
    Parameters:     The following represent variables passed into the function:
                    parameter1: Description of parameter1
                    parameter2: Description of parameter2
    Return Object:
                    output.status: "Success" | "Warning" | "Error"
                    output.errors: Array of error messages
                    output.data:   Return payload

                    Note: The legacy array format (["Success", "message", data]) is deprecated.

    Pseudo code:
                    1. Validate parameters
                    2. Business logic
                    3. Set status

    Date of Dev:    MM/DD/YYYY
    Last Rev Date:  MM/DD/YYYY

    Revision Notes:
                    MM/DD/YYYY - Developer Name: First setup of the script
  */

  /* ------------------------ Response & Log Variables ------------------------ */

  const serviceName = "ServiceNameHere";

  const output = {
    data: null,
    errors: [],
    status: "Success",
  };

  let logEntry = {
    // Test characters - sanitized by regex
    testComma: "value,with,commas",
    testDoubleQuote: 'value"with"quotes',
    testBackslash: "value\\with\\backslashes",
    testCarriageReturn: "value\rwith\rCR",
    testNewline: "value\nwith\nnewlines",
    testTab: "value\twith\ttabs",
    // Test characters - extended set
    testSingleQuote: "value'with'quotes",
    testEquals: "value=with=equals",
    testSemicolon: "value;with;semicolons",
    testPipe: "value|with|pipes",
    testNullByte: "value\0with\0nulls",
    testBacktick: "value`with`backticks",
    testAngleBrackets: "value<with>angles",
    testCurlyBraces: "value{with}braces",
    testSquareBrackets: "value[with]brackets",
    testColon: "value:with:colons",
    testEquals: "value=with=equals",
    testAmpersand: "value&with&ampersands",
    testPercent: "value%with%percents",
    testUnicodeEmoji: "value??with??emoji",
    testUnicodeRTL: "value\u202Ewith\u202ERTL",
    testCombined: 'all,"in\\one\r\n\tstring',
    // Original properties
    customerAlias: vvClient._httpHelper._sessionToken.customerAlias,
    databaseAlias: vvClient._httpHelper._sessionToken.databaseAlias,
    environment: new URL(vvClient.getBaseUrl()).hostname.split(".")[0],
    errors: [],
    parameters: ffCollection,
    service: serviceName,
    status: "Started",
  };

  /* ------------------------- Configurable Variables ------------------------- */

  // Define constants and configuration here. Examples:
  // const FORM_TEMPLATE_NAME = "User Registration";
  // const QUERY_NAME = "GetActiveUsers";
  // const MAX_RECORDS = 100;

  /* ---------------------------- Helper Functions ---------------------------- */

  function sanitizeLog(entry) {
    function serializeValue(value) {
      if (Array.isArray(value)) return value.join("; ");
      if (value instanceof Date) return value.toISOString();
      if (value !== null && typeof value === "object")
        return JSON.stringify(value);
      return String(value);
    }

    return Object.fromEntries(
      Object.entries(entry).map(([key, value]) => {
        const isStructured =
          Array.isArray(value) || (value !== null && typeof value === "object");
        const serialized = serializeValue(value);

        return [
          key,
          isStructured
            ? // Objects/arrays: JSON.stringify already handles structural characters safely.
              // Only remove characters that break log transport or split log lines.
              serialized.replace(/[\r\n\t\0]/g, " ")
            : // Primitives: also remove comma, double quote, and backslash to protect
              // the key=value log format.
              serialized.replace(/[,"\\\r\n\t\0]/g, " "),
        ];
      }),
    );
  }

  /* ---------------------------------- Main ---------------------------------- */

  logger.info(sanitizeLog(logEntry));

  try {
    // Validate parameters
    // const firstName = getFieldValueByName("First Name");

    if (output.errors.length > 0) {
      throw new Error();
    }

    // Business logic
    //...

    // Assign return data here
    // output.data = someValue;

    // Set status
    if (output.errors.length > 0) output.status = "Warning";
    else output.status = "Success";
  } catch (err) {
    output.status = "Error";
    output.errors.push(err.message);
  } finally {
    response.json(200, output);

    logEntry.status = output.status;
    logEntry.errors = output.errors;

    //if (output.status === "Error") logger.error(sanitizeLog(logEntry));
    //else if (output.status === "Warning") logger.warn(sanitizeLog(logEntry));
    //else logger.info(sanitizeLog(logEntry));
  }
};

