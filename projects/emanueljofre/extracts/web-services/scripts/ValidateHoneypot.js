/**
 * ValidateHoneypot
 * Category: Form
 * Modified: 2021-09-06T17:50:54.607Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: f73c3adf-380f-ec11-8204-b94c96899ffb
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
const logger = require("../log");

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

module.exports.main = async function (ffCollection, vvClient, response) {
	logger.info("COMMUNICATION ARRIVED SUCCESSFULLY TO THE NODEJS SERVER.");

	// Initialization of the return object
	let returnObj = [];
	// Initialization of a temporal array to store errors
	let errorLog = [];

	/********************
	 * Helper Functions *
	 ********************/

	// Verifies existence of field and value and returns value of field.
	// errorLog array must be created before calling this function.
	function getFieldValueByName(fieldName, isFieldRequired) {
		// If isFieldRequired parameter is not passed in, the field is required
		let isRequired = isFieldRequired ? isFieldRequired : true;
		let fieldObj = {};
		let fieldValue = null;
		let resp = null;

		try {
			fieldObj = ffCollection.getFormFieldByName(fieldName);
			if (fieldObj) {
				fieldValue = fieldObj.value ? fieldObj.value.trim() : null;
				if (fieldValue) {
					resp = fieldValue;
				} else if (isRequired) {
					errorLog.push(`A value property for the field '${fieldName}' was not found or is empty`)
				}
			} else {
				errorLog.push(`The field '${fieldName}' was not found`);
			}
		} catch (error) {
			errorLog.push(error);
		}
		return resp;
	}

	/****************
	 * Main Process *
	 ****************/

	try {
		const honeypotNotFilled = getFieldValueByName("Password") == 'False' ? true : false;

		if (honeypotNotFilled) {
			returnObj[0] = "Success";
			returnObj[1] = "Honeypot and Time Gate test passed";
		} else {
			returnObj[0] = "Error";
			returnObj[1] = "Honeypot test failed";
		}
	} catch (error) {
		returnObj[0] = "Error";
		returnObj[1] = error.message ? error.message : error;
	}

	// Send response
	response.json(200, returnObj);
};

