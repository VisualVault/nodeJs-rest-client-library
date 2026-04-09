/**
 * LibSiteEmailLookup
 * Category: Form
 * Modified: 2021-07-06T14:26:51.167Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: 5a533824-66de-eb11-8204-e3982f57380d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
var logger = require('../log');

/*******************
* HELPER FUNCTIONS *
*******************/

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "CUSTOMERALIAS";
    options.databaseAlias = "DATABASEALIAS";
    options.usersId = "usersID";
    options.password = "PASSWORD";
    options.clientId = "DEVELOPERKEY";
    options.clientSecret = "DEVELOPERSECRET";
    return options;
};

/**
 * Get sites data using the site id
 * 
 * @param { string } siteID 
 * @param { object } vvClient VV Rest API
 * @returns { Object } Return object structure:
 *       {
 *          meta: {
 *            status,
 *            statusMsg
 *          },  
 *          data: []
 *       }
 */
async function getSites(siteID, vvClient) {
  let site = {};
  // Query
  site.q = `name eq '${siteID}'`;
  // Field names to return
  site.fields = 'id, name';
  // Gets site
  const resp = await vvClient.sites.getSites(site)

  return resp;
}

/**
 * Get users data using the site id
 * 
 * @param { string } SiteInfo Site Id
 * @param { object } vvClient VV Rest API
 * @returns { Object } Return object structure:
 *       {
 *          meta: {
 *            status,
 *            statusMsg
 *          },  
 *          data: []
 *       }
 */
async function getUsers(SiteInfo, vvClient) {
  let usersParams = {};
  // Gets users
  const resp = await vvClient.userss.getUsers(usersParams, SiteInfo);

  return resp;
}

/****************
* MAIN FUNCTION *
****************/

/**
 * Gets a list users with their data from a VisualVault Location.
 * 
 * @param { ffCollection } ffCollection Object containing key-value pairs recibed from a form or another web service.
 * @param { object } vvClient VV Rest API
 * @param { object } response response oject
 * @returns { Object } Return object structure:
 *       {
 *          meta: {
 *            status,
 *            statusMsg,
 *            revisionId
 *          },  
 *          data: []
 *       }
 */
module.exports.main = async function (ffCollection, vvClient, response) {

    // Logs the execution start time of the script
    logger.info('Start of the process LibSiteEmailLookup at ' + Date());

    // Initialization of the return object
    let returnObj = [];
    let siteInfo = '';

    try {
      // Extract the passed in parameter
      const siteID = ffCollection.getFormFieldByName('Site ID');
  
      // Validates the passed in parameter
      if (!siteID.value) {
        throw new Error("The 'siteID' parameter was not supplied or had an invalid value")
      } else {
        // Gets site data
        const sitesResp = await getSites(siteID.value, vvClient);
        
        // Processes the response from getSites()
        const site = JSON.parse(sitesResp);
        const siteStatusOk = site.meta.status === 200 ? true : false;
        const siteHasData = site.data.length > 0 ? true : false;

        if (siteStatusOk && siteHasData) {
            logger.info('Site found for ' + siteID.value);
            siteInfo = site.data[0].id;

            // Gets userss
            const usersResp = await getUsers(siteInfo, vvClient);

            // Processes the response from getSites()
            const users = JSON.parse(usersResp);
            const usersStatusOk = users.meta.status === 200 ? true : false;
            const usersHasData = users.data.length > 0 ? true : false;

            if (usersStatusOk && usersHasData) {
              let emailList = [];
              const usersData = users.data;

              for (const user in usersData) {
                  // Creates user object
                  const usersObj = {
                      email: user.emailAddress,
                      enabled: user.enabled,
                      firstname: user.firstName,
                      lastname: user.lastName,
                      siteid: user.siteId,
                      usersid: user.usersid,
                      usid: user.id
                  };
                  // Add the user to the email list
                  emailList.push(usersObj);
              }
              returnObj[0] = 'Emails Found';
              returnObj[1] = 'List of Emails Found and Returned.';
              returnObj[2] = emailList;
          } else {
              returnObj[0] = 'No Email';
              returnObj[1] = 'No Emails found for this site.';
          }
        } else {
            logger.info(`Site Not found for ${siteID.value}`);
            returnObj[0] = 'No Site';
            returnObj[1] = `Site Not found for ${siteID.value}`;
        }
      }
    } catch (error) {
      returnObj[0] = "Error";
      returnObj[1] = error.message ? error.message : error;
    }

    return response.json(200, returnObj);
}

      
