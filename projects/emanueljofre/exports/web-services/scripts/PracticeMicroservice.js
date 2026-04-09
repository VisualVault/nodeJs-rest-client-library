/**
 * PracticeMicroservice
 * Category: Workflow
 * Modified: 2025-08-05T11:51:57.8Z by max.coppola
 * Script ID: Script Id: 63158666-cb6e-f011-82e3-aa3b37c491e4
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-09
 */
module.exports.getCredentials = function () {
    var options = {};
    options.baseUrl = "https://vvdemo.visualvault.com";
    options.customerAlias = "EmanuelJofre";
    options.databaseAlias = "Main";
    options.userId = "SiteMax.API";
    options.password = "dXnN*K6P";
    options.clientId = "de38846f-814a-4255-81a9-df67802e1a9e";
    options.clientSecret = "KQhAqDZS98ZIFi2bbP3KuhwmQ6LED3Yp+xXRRwiJhk0=";
    options.audience = "";
    return options;
};

module.exports.main = async function (vvClient, response, scriptId) {
    try {
        const formTemplateId = "1c8db079-cd6e-f011-aaac-ebdbf0073050";  // Corrected from curl

        logger.info("Starting form-driven microservice practice");
        logger.info("Form Template ID: " + formTemplateId);

        // Get data directly from form fields
        let inputData = {};
        if (vvClient.ffCollection && vvClient.ffCollection.getFormFieldByName) {
            const nameField = vvClient.ffCollection.getFormFieldByName('Name');
            const descriptionField = vvClient.ffCollection.getFormFieldByName('Description');
            const stateField = vvClient.ffCollection.getFormFieldByName('State');

            inputData = {
                name: nameField ? nameField.value : '',
                description: descriptionField ? descriptionField.value : '',
                state: stateField ? stateField.value : ''
            };

            logger.info("Received data from form fields: " + JSON.stringify(inputData));
        }

        logger.info("Step 1: Getting form information");

        const getFormsParams = {
            expand: true,
            limit: 3
        };

        const getFormsResponse = await vvClient.forms.getForms(getFormsParams, formTemplateId);

        if (getFormsResponse.meta.status === 200) {
            logger.info("getForms successful");
            logger.info("Records found: " + getFormsResponse.data.length);

            if (getFormsResponse.data.length > 0) {
                logger.info("Sample record: " + JSON.stringify(getFormsResponse.data[0], null, 2));
            }
        } else {
            logger.error("Error in getForms: " + getFormsResponse.meta.errors);
            throw new Error("Error getting forms");
        }

        logger.info("Step 2: Creating new record");

        // Use form data if available, otherwise use default data
        const newFormData = {
            "Name": inputData.name || "Practice Microservice " + new Date().toLocaleTimeString(),
            "Description": inputData.description || "Record created automatically by practice microservice",
            "State": inputData.state || "Pending"
        };

        logger.info("Data to send: " + JSON.stringify(newFormData, null, 2));

        const postFormsResponse = await vvClient.forms.postForms(null, newFormData, formTemplateId);

        let newRecordId = null;
        if (postFormsResponse.meta.status === 201) {
            logger.info("postForms successful");
            newRecordId = postFormsResponse.data.instanceId;
            logger.info("New record created with ID: " + newRecordId);
        } else {
            logger.error("Error in postForms: " + postFormsResponse.meta.errors);
            logger.error("Complete response: " + JSON.stringify(postFormsResponse, null, 2));
            throw new Error("Error creating new record");
        }

        logger.info("Step 3: Updating created record");

        const updateData = {
            "Description": "Record updated with postFormRevision - " + new Date().toLocaleTimeString(),
            "State": "Completed"
        };

        logger.info("Update data: " + JSON.stringify(updateData, null, 2));

        const revisionResponse = await vvClient.forms.postFormRevision(null, updateData, formTemplateId, newRecordId);

        if (revisionResponse.meta.status === 200) {
            logger.info("postFormRevision successful");
            logger.info("Record updated correctly");
        } else {
            logger.error("Error in postFormRevision: " + revisionResponse.meta.errors);
            logger.error("Complete response: " + JSON.stringify(revisionResponse, null, 2));
            throw new Error("Error updating record");
        }

        logger.info("Practice completed successfully");
        logger.info("Summary:");
        logger.info("Form Template ID: " + formTemplateId);
        logger.info("Records found: " + getFormsResponse.data.length);
        logger.info("New record ID: " + newRecordId);
        logger.info("getForms - Information obtained");
        logger.info("postForms - Record created");
        logger.info("postFormRevision - Record updated");

        // Form-driven microservice response format
        response.json({
            data: [
                "Success",
                "Form-driven microservice completed successfully! Created record ID: " + newRecordId,
                {
                    formTemplateId: formTemplateId,
                    recordsFound: getFormsResponse.data.length,
                    newRecordId: newRecordId,
                    processedData: newFormData,
                    steps: [
                        "getForms - Information obtained",
                        "postForms - Record created",
                        "postFormRevision - Record updated"
                    ],
                    timestamp: new Date().toISOString()
                }
            ],
            meta: {
                status: 200,
                statusMsg: "OK"
            }
        });

    } catch (error) {
        logger.error("Error in practice:");
        logger.error("Message: " + error.message);
        logger.error("Details: " + error.stack);

        logger.info("Possible solutions:");
        logger.info("1. Verify form has fields: Name, Description, State");
        logger.info("2. Make sure credentials are correct");
        logger.info("3. Confirm Form Template ID is valid");

        // Form-driven microservice error response format
        response.json({
            data: [
                "Error",
                "Error executing form-driven microservice: " + error.message,
                {
                    errorDetails: error.stack,
                    timestamp: new Date().toISOString()
                }
            ],
            meta: {
                status: 500,
                statusMsg: "Internal Server Error"
            }
        });
    }
};

