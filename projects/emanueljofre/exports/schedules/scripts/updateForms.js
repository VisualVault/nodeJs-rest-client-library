/**
 * updateForms
 * Category: Scheduled
 * Modified: 2021-07-05T18:55:29.057Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: 9a664c3d-9bdd-eb11-8200-bc5725424811
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
/**
 * NAME: updateForms
 * TYPE: Scheduled process
 * DEPENDENCIES:
 *  - postNewRevision web service
 *  - CustomerSurvey query
 */

//import logging script
var logger = require(require('path').dirname(require.main.filename) + "/log");

/*******************
* HELPER FUNCTIONS *
*******************/

/**
 * Called by VV API to authorize the scripts
 */
module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "EmanuelJofre";
    options.databaseAlias = "Main";
    options.userId = "emanuel.jofre+api@onetree.com";
    options.password = "achq1Ozpg3xD";
    options.clientId = "4150133e-ddef-4d8e-af91-1e7c39f16a25";
    options.clientSecret = "RKxMRhdeJPdt+3A3B/kNT19rbTawYpPLx84LSpzrHZ0=";
    return options;
  };

/**
 * Gets the results of running a custom query 
 * 
 * @param { String } queryName Name of the query in VV
 * @param { Object } queryParams The Object can have property named [filter] with a string query as value to filter the results
 * @param { Object } vvClient VV API Library
 * 
 * @returns { Object } Response from getCustomQueryResultsByName()
 * Retunr object structure:
 *       {
 *          meta: {
 *            errors,
 *            href,
 *            method,
 *            status,
 *            statusMsg
 *          },  
 *          data: []
 *       }
*/
async function getQueryResults(queryName, queryParams, vvClient){
  const resp = await vvClient.customQuery.getCustomQueryResultsByName(queryName,queryParams);
  const parsedResp = JSON.parse(resp);
  return parsedResp;
}


/****************
* MAIN FUNCTION *
****************/

/**
 * Runs the mains scheduled script
 * 
 * @param { Object } vvClient VV API Library
 * @param { Object } response Response method
 * 
 * @returns { Object } response.json([...])
 */
module.exports.main = async function (vvClient, response) {
    logger.info("Start of TestScript on " + new Date());

    /**
     * Object used for returning the results status, messages and/or data
     * 
     * returnObj[0]: Status: "Error", "Success"
     * returnObj[1]: Status message: Short status description string
     * returnObj[2...]: Response data
     */
    let returnObj = [];

    // Parameters needed for calling getForms()   
    const queryName = "CustomerSurvey";
    const queryParams = { filter: `otherDescription != ''` };

    try {
      const forms = await getQueryResults(queryName, queryParams, vvClient);
      const meta = forms.meta;
      const data = forms.data ? forms.data : null;

      if(meta.status === 200){
        if (data) {
          for (const post of data) {
             // For every post, creates parameters for postNewRevision
             const newRevisionParams = [
              {
                name: 'revisionId',
                value:  post.dhid
              },
              {
                name: 'otherDescription',
                value: "new description"
              },
              {
                name: 'formTemplateId',
                value: "Milestone 4 - Customer Survey" 
              }
            ];

            // Calls web service for creation of new revision
            const newRevisionPostResp = await vvClient.scripts.runWebService('postNewRevision', newRevisionParams);

            // Adds responses to returnObj
            if (newRevisionPostResp.meta.status === 200) {
              returnObj.push(["Success", `New revision for post id ${post.dhid} created ok.` ])
            } else{
              returnObj.push(["Error", `Unable to create new revision for post id ${post.dhid}.` ])
            }
          }
        } else {
          returnObj = ["Success", "The query didn't retorn any results."];      
        }
      } else if (meta.status === 400) {
        throw new Error("Custom parameters format error. Check queryParams for inconsistencies.");
      } else if (meta.status === 404) {
        throw new Error(`Custom query not found. Ensure the query named ${queryName} is created in the VV Client`);
      }
    } catch (error) {
      returnObj = ["Error", error];      
    }

   return response.json(returnObj);
};


