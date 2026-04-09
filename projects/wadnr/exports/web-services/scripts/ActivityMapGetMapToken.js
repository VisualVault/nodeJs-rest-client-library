/**
 * ActivityMapGetMapToken
 * Category: Workflow
 * Modified: 2025-12-24T17:04:12.567Z by ross.rhone@visualvault.com
 * Script ID: Script Id: 8e635b7d-032a-f011-82d2-c2bf97bb5b8d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');

const { ApplicationCredentialsManager } = require('@esri/arcgis-rest-request');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = 'WADNR';
    options.databaseAlias = 'fpOnline';
    options.userId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.password = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    options.clientId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.clientSecret = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    return options;
};

module.exports.main = async function (ffCollection, vvClient, response) {
    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const GIS_CLIENT_ID = 'uLqJe5xnSRGOwUEA';
    const GIS_CLIENT_SECRET = '542e74bec13842749dff846703395a39';

    async function getOauthData() {
        try {
            const appManager = ApplicationCredentialsManager.fromCredentials({
                clientId: GIS_CLIENT_ID,
                clientSecret: GIS_CLIENT_SECRET,
                portal: 'https://visualvault.maps.arcgis.com/sharing/rest',
            });

            const appToken = await appManager.getToken();

            const tokenData = [{ name: 'token', value: appToken }];

            return tokenData;
        } catch (error) {
            console.error('Failed to fetch AGOL token for webmap:', error);
            throw new Error('Error retrieving OAuth App:', e);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */
    try {
        logger.info(`Attempting To Get Map Token`);
        const oauthData = await getOauthData();

        if (oauthData) {
            outputCollection[0] = 'Success';
            outputCollection[1] = oauthData;
        } else {
            throw new Error('Failed to authenicate');
        }
    } catch (error) {
        // Log the data to the console
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        response.json(200, outputCollection);
    }
};
