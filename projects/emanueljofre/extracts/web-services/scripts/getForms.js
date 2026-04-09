/**
 * getForms
 * Category: Form
 * Modified: 2021-06-29T11:59:14.803Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: b02633a0-4fd8-eb11-8204-e3982f57380d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
const logger = require("../log");

module.exports.getCredentials = function () {
  return {
    clientId: "7117ab8f-2f92-48d9-b6b9-73dcc3057887",
    clientSecret: "OFxfAz4K01TaE/PyifQdPz/FyiXeaFfmZ9sQsuvQt3g=",
    customerAlias: "EmanuelJofre",
    databaseAlias: "Main",
    password: "ElOsoDel*2021*",
    userId: "emanuel.jofre@onetree.com",
  };
};

/**
 * Get "Milestone 4 - Customer Survey" forms
 * that have a certain model selected in the Model field
 * @param {ffCollection} ffCollection Data sent to the web service
 * @param {object} vvClient VV API
 * @param {object} response
 */
module.exports.main = async function (ffCollection, vvClient, response) {
  logger.info("COMMUNICATION ARRIVED SUCCESSFULLY TO THE NODEJS SERVER.");

  /**
   * Creates the return object
   * @param {string} status E.g. "Error"
   * @param {string} statusMsg E.g. "Model value undefined"
   * @param {any} data E.g. [{},{},...] or {...} or "value"
   */
  let buildReturnObj = (status, statusMsg, data) => {
    if (Array.isArray(data)) {
      // Returns every data element from index [2] fordward
      return [status, statusMsg, ...data];
    } else {
      return [status, statusMsg, data];
    }
  };

  let returnObj;

  // model required as a part of the query
  const model = ffCollection.getFormFieldByName("Model");

  if (!model || model.value === "SelectItem") {
    returnObj = buildReturnObj("Error", "Model value undefined");
  } else {
    const queryOptions = {
      fields: "Name,Email,Phone",
      limit: 1000,
      offset: 0,
      q: `Model eq '${model.value}'`,
    };

    const formTemplateId = "Milestone 4 - Customer Survey";

    try {
      const result = await vvClient.forms.getForms(
        queryOptions,
        formTemplateId
      );
      const parsedResult = JSON.parse(result);

      returnObj = buildReturnObj(
        "Success",
        parsedResult.meta.statusMsg,
        parsedResult.data
      );
    } catch (error) {
      returnObj = buildReturnObj("Error", error);
      response.json(500, returnObj);
    }
  }

  // Send response
  response.json(200, returnObj);
};

