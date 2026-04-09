/**
 * ValidateCaptcha
 * Category: Form
 * Modified: 2021-09-06T15:35:23.07Z by emanuel.jofre@onetree.com
 * Script ID: Script Id: b670c8dd-140f-ec11-8208-ef9d412ac617
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
const logger = require("../log");
const https = require('https');
const querystring = require('querystring');

const host = 'hcaptcha.com';
const path = '/siteverify';

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

	// Data required for hCaptcha validation
	const secret = '0x3faaa10d99345410Bbe9A6A742B05945410Cd2a6'
	const sitekey = '22e2c1ae-7334-486b-9c58-a31198fb62cd'

	/********************
	 * Helper Functions *
	 ********************/

	// verifies the given token by doing an HTTP POST request
	// to the hcaptcha.com/siteverify endpoint by passing the
	// hCaptcha secret key and token as the payload.
	const verify = async (secret, token, remoteip = null, sitekey = null) => {
		return new Promise(function verifyPromise(resolve, reject) {
			const payload = { secret, response: token };
			if (remoteip) {
				payload.remoteip = remoteip;
			}
			if (sitekey) {
				payload.sitekey = sitekey;
			}
			// stringify the payload
			const data = querystring.stringify(payload);

			// set up options for the request
			// note that we're using form data here instead of sending JSON
			const options = {
				host,
				path,
				method: 'POST',
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					'content-length': Buffer.byteLength(data),
				},
			};

			// make the request, add response chunks to buffer, and finally resolve
			// with the response. if any errors arise call the promise's reject
			// function with the error.
			const request = https.request(options, (response) => {
				response.setEncoding('utf8');

				let buffer = '';

				response
					.on('error', reject)
					.on('data', (chunk) => buffer += chunk)
					.on('end', () => resolve(JSON.parse(buffer)))
			});

			request.on('error', reject);
			request.write(data);
			request.end();
		});
	};

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
		const token= getFieldValueByName("hCaptchaResponse");

		if (token) {
			const resp = await verify(secret, token, null, sitekey)

			if (resp.success === true) {
				returnObj[0] = "Success";
				returnObj[1] = "Captcha validated ok";
			} else {
				returnObj[0] = "Error";
				returnObj[1] = "Captcha validation failed";
			}

		} else {
			// Builds a string with every error occurred obtaining field values
			throw new Error(errorLog.join("; "));
		}
	} catch (error) {
		returnObj[0] = "Error";
		returnObj[1] = error.message ? error.message : error;
	}

	// Send response
	response.json(200, returnObj);
};

