/**
 * postRevision
 * Category: Form
 * Modified: 2021-06-29T13:08:05.323Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: 7e319e4e-50d8-eb11-8204-e3982f57380d
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

  let returnObj;

  // Data required for post
  const revisionId = ffCollection.getFormFieldByName("RevisionId").value;
  const targetFields = {
    name: ffCollection.getFormFieldByName("Name").value,
  };
  const formTemplateId = "Milestone 4 - Customer Survey";

  if (!revisionId) {
    returnObj = ["Error", "Model revision ID undefined"];
  } else if (!targetFields.name) {
    returnObj = ["Error", "Model name undefined"];
  } else {
    try {
      const res = await vvClient.forms.postFormRevision(
        null,
        targetFields,
        formTemplateId,
        revisionId
      );
      if (res.meta.status === 201) {
        returnObj = ["Success", "New revision posted ok"];
      } else {
        returnObj = ["Error", "New revision can't be posted"];
      }
    } catch (error) {
      returnObj = ["Error", error];
      response.json(500, returnObj);
    }
  }

  // Send response
  response.json(200, returnObj);
};

