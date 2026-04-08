/**
 * getWebMapOAuth
 * Category: Workflow
 * Modified: 2025-04-30T17:36:50.227Z by ross.rhone@visualvault.com
 * Script ID: Script Id: d2f1f99f-e925-f011-82d0-cae9c315e12b
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */

const portalTools = require('@esri/arcgis-rest-portal');
const requestTools = require('@esri/arcgis-rest-request');
const applyEdits = require('@esri/arcgis-rest-feature-service');

const { getOAuthApp, IOAuthApp } = require('@esri/arcgis-rest-developer-credentials');
const { ArcGISIdentityManager } = require('@esri/arcgis-rest-request');

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

    // Replace with your actual ArcGIS item ID and API key

    //const PORTAL_ITEM_ID = "243d76e2e66b49c98d7edf02b46b93d9";
    //Set this in an environment variable? Or key vault?
    //const API_KEY = "AAPTxy8BH1VEsoebNVZXo8HurI4t1tPXjB2VspNwk0hgats5iYCCXwW86KOqGYtZvd_rt3nvxMrBtIvssC4g5jMw1CeEn6BoCCLrvKjlomKERIqzJbuKrfKkDzyjNod5TBdiWysf2xc2wsZ2Py5YClFbqP4MvRrdg_ELJGujE_NnbQZZZntIstfrqNZrBaVgWBhn03_S8ZC49TnhFs2N5l6guwypLPuE3n-fTjVJxNc7TR3kNt6CascGZweN5M_FQFMJAT1_y5TrJzKa";

    async function fetchWebmap() {
        try {
            const authSession = await ArcGISIdentityManager.signIn({
                username: 'uLqJe5xnSRGOwUEA',
                password: '542e74bec13842749dff846703395a39',
            });

            getOAuthApp({
                itemId: '8787fc81f4014b94b0c30b524142017d',
                authentication: authSession,
            })
                .then((retrievedOAuthApp) => {
                    // retrievedOAuthApp => {redirect_uris: [...], item: {...}, ...}
                    console.log('Retrieved OAuth App:', retrievedOAuthApp);
                })
                .catch((e) => {
                    console.error('Error retrieving OAuth App:', e);
                });

            // Create an API key manager
            const authentication = requestTools.ApiKeyManager.fromKey(API_KEY);

            // Fetch the web map data (JSON definition) using the item ID
            await portalTools
                .getItemData(PORTAL_ITEM_ID, { authentication })
                .then((response) => {
                    // Log the data to the console
                    console.log('Webmap data:', response);

                    const jsonResponse = {
                        webmap: response,
                    };

                    const jsonString = JSON.stringify(jsonResponse);

                    const webmap = WebMap.fromJSON(jsonString);

                    outputCollection[0] = 'Success';
                    outputCollection[1] = jsonString;
                })
                .catch((error) => {
                    logger.info(`Error encountered ${error}`);

                    // BUILD THE ERROR RESPONSE ARRAY

                    outputCollection[0] = 'Error'; // Don´t change this

                    if (errorLog.length > 0) {
                        outputCollection[1] = 'Some errors ocurred';
                        outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
                    } else {
                        outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
                    }
                });
        } catch (error) {
            console.error('Failed to fetch webmap data:', error);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */
    try {
        await fetchWebmap();
    } catch (error) {
        // Log the data to the console
        logger.info(`Error encountered ${error}`);
    } finally {
        response.json(200, outputCollection);
    }
};
