/**
 * relateForm
 * Category: Form
 * Modified: 2021-06-30T14:46:42.56Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: 1447cb40-0cd9-eb11-8200-bc5725424811
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
 * Relate the current form with the one selected in the field relateToId
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
  const formId = ffCollection.getFormFieldByName("formId").value;
  const relateToId = ffCollection.getFormFieldByName("relateToId").value;

  if (!relateToId || relateToId === "SelectItem") {
    returnObj = ["Error", "ID of form to relate is undefined"];
  } else {
    const queryOptions = {
      fields: "Name",
      limit: 1000,
      offset: 0,
      q: `instanceName eq '${relateToId}'`,
    };

    const formTemplateId = "Milestone 4 - Customer Survey";

    try {
      // Get Revision ID
      const relatedFormData = await vvClient.forms.getForms(
        queryOptions,
        formTemplateId
      );
      const parsedRelatedFormData = JSON.parse(relatedFormData);
      const revisionId = parsedRelatedFormData.data[0].revisionId;

      // Relate forms
      const res = await vvClient.forms.relateForm(formId, revisionId);
      const parsedResult = JSON.parse(res);

      if (
        parsedResult.meta.status === 200 ||
        parsedResult.meta.status === 201
      ) {
        returnObj = ["Success", "Relationship created ok"];
      } else {
        returnObj = ["Error", "Relationship can't be built."];
      }
    } catch (error) {
      returnObj = ["Error", error];
    }
  }

  // Send response
  response.json(200, returnObj);
};

