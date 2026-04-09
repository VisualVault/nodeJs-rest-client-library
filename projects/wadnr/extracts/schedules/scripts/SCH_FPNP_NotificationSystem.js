/**
 * SCH_FPNP_NotificationSystem
 * Category: Scheduled
 * Modified: 2026-04-07T13:34:51.82Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: ba88001d-d11e-f011-82d6-afeb582902bd
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');

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

module.exports.main = async function (vvClient, response, token) {
    /*
    Script Name:    SCH_FPNP_NotificationSystem
    Customer:       WADNR
    Purpose:        Send emails to users with FPNPs updating them on FPAN status updates
 
    Return Object:
                    Message will be sent back to VV as part of the ending of this scheduled process.
    Psuedo code:
                    1. GET ALL APPLICATIONS FLAGGED FOR NOTIFICATIONS
                    2. GET ALL APPLICATION INFORMATION
                    3. GET ALL FPNPs
                    4. GET ENVIRONMENTAL CONFIGURATION
                    5. GET FPNP LOCATION INFORMATION
                    6. CALCULATE WHETHER EMAIL SHOULD BE SENT
                    7. ADD EMAIL TO QUEUE
                    8. CONSTRUCT EMAIL BODY
                    9. SEND EMAIL
                    10. REMOVE NOTIFICATION FLAG FROM APPLICATIONS
                    11. PROCESS WDFW CONCURRENCE NOTIFICATIONS (ticket WADNR-6625)
 
    Date of Dev:    04/22/2025
 
    Revision Notes:
                    04/22/2025 - Austin Stone:      First Setup of the script
                    07/12/2025 - Austin Stone:      Adding caching for speedup
                    07/31/2025 - Austin Stone:      Bug fix regarding 'all FPAN' settings
                    09/11/2025 - Fernando Chamorro: Added WDFW Concurrence notification rules 18 and 19 (ticket WADNR-6625)
                    09/12/2025 - Fernando Chamorro: Added WDFW Concurrence notification rules 20 and 21 (ticket WADNR-6637)
                    10/30/2025 - John Seivlla:      Re-Implement missing WDFW Concurrence code. Optimized API calls made in retrieval of classification/pdfGUID
                    02/19/2026 - Alfredo Scilabra:  Added support for primary record ID
                    03/02/2026 - Fernando Chamorro: Remove Notification flag for WDFW
                    03/31/2026 - Nicolas Culini:    Create communication logs directly in this web service and add execution logging
    */

    logger.info(`Start of logic for EmailNotificationSystem on ${new Date()}`);

    response.json(200, `Start of logic for EmailNotificationSystem on ${new Date()}`);

    let errorLog = [];

    const fpnpCountyTemplateName = 'FPNP County';
    const applicationRevPageTemplateName = 'Application Review Page';
    const applicationTypesToSearchForLegalDescription = [
        'Forest Practices Application Notification',
        'Forest Practices Aerial Chemical Application',
        'Step 1 Long Term FPA',
        'FPAN Renewal',
    ];

    let responseMessage = '';
    const scheduledProcessGUID = token;

    const COMMUNICATION_LOG_TEMPLATE = 'Communications Log';
    const EMAIL_TEMPLATE_TEMPLATE = 'Email Template';
    const EMAIL_TEMPLATE_NAME = 'Forest Practice Notification - FPNP Interested Party';

    const SEND_TO_DEFINED = 'Send to a defined list of email addresses';
    const SEND_TO_CONTEXT = 'Send to recipients based on context';
    const SEND_TO_BOTH = 'Send to both';

    const SEND_CC_DEFINED = 'CC a defined list of email addresses';
    const SEND_CC_CONTEXT = 'CC to recipients based on context';
    const SEND_CC_BOTH = 'CC both';

    let cachedEmailTemplate = null;
    let expectedCommLogs = 0;
    let createdCommLogs = 0;

    function parseRes(vvClientRes) {
        try {
            const jsObject = JSON.parse(vvClientRes);
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // already parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;

        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason =
                vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                    ? vvClientRes.meta.errors[0].reason
                    : 'unspecified';
            throw new Error(`${shortDescription} error. Status: ${vvClientRes.meta.status}. Reason: ${errorReason}`);
        }
        return vvClientRes;
    }

    function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            if (!vvClientRes.data) {
                throw new Error(
                    `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
                );
            }
        }

        return vvClientRes;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;

            if (isEmptyArray || isEmptyObject) {
                throw new Error(
                    `${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`
                );
            }

            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    function getFlaggedApplications(templateName) {
        const shortDescription = `Get form ${templateName}`;
        const getFormsParams = {
            q: `[Notification Flag] eq 'True'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getFPANByFPANNumber(fpanNumber) {
        const shortDescription = `Get form ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Forest Practices Application Notification')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getAllFPNP() {
        const shortDescription = 'Custom Query using filter parameter for backward compatibility';

        return vvClient.customQuery
            .getCustomQueryResultsByName('FPNP For Email Service', {})
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                return res.data;
            });
    }

    function applicationAssociatedWithACA(fpanNumber) {
        const shortDescription = `Get form ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Forest Practices Aerial Chemical Application')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data.length > 0);
    }

    function getApplicationFormIDFromFPAN(fpanNumber, applicationType) {
        const shortDescription = `Get form ${fpanNumber}`;
        const getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, applicationType)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                return res.data.length > 0 ? res.data[0]['top Form ID'] : null;
            });
    }

    function getLegalDescriptionFromFormID(formID) {
        const shortDescription = `Get form ${formID}`;
        const getFormsParams = {
            q: `[related Record ID] eq '${formID}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Legal Description')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getCountiesAssociatedWithFPNP(sawUserID, email) {
        const shortDescription = `Get form ${sawUserID}, ${email}`;
        const getFormsParams = {
            q: `[SAW User ID] eq '${sawUserID}' and [Email] eq '${email}' and [Status] <> 'Disabled'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, fpnpCountyTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                let counties = [];
                res.data.forEach((record) => {
                    counties.push(record['county']);
                });
                return counties;
            });
    }

    async function getWAUWRIAAssociatedWithApplication(fpanNumber) {
        let shortDescription = `Get form ${fpanNumber}`;
        let getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true,
        };

        const ARPFormID = await vvClient.forms
            .getForms(getFormsParams, applicationRevPageTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                return res.data[0] ? res.data[0]['top Form ID'] : '';
            });

        if (ARPFormID === '') return [];

        shortDescription = `Get WRIA/WAU associated with ${ARPFormID}`;
        getFormsParams = {
            q: `[Related Record ID] eq '${ARPFormID}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'WRIA/WAU')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getWAUWRIAAssociatedWithFPNP(formID, type) {
        let shortDescription = `Get WAU/WRIA associated with form ${formID}`;
        let getFormsParams = {
            q: `[Related Record ID] eq '${formID}'`,
            expand: true,
        };

        const formTemplateName = type === 'WAU' ? 'FPNP Watershed' : 'FPNP Water Resource Inventory Area';

        return vvClient.forms
            .getForms(getFormsParams, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                let data = [];
                res.data.forEach((record) => {
                    data.push(type === 'WAU' ? record['watershed'] : record['wria']);
                });
                return data;
            });
    }

    /**
     * @param {string} fpanNumber
     * @returns {[string?, string?]} [classification, pdfGuid]
     */
    function getApplicationClassificationAndPDFGUID(fpanNumber) {
        let shortDescription = `Get form ${fpanNumber}`;
        let getFormsParams = {
            q: `[FPAN Number] eq '${fpanNumber}'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, applicationRevPageTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                let classification = 'No Classification';
                let pdfGUID = '';
                if (Array.isArray(res.data) && res.data.length > 0) {
                    const validARP = res.data.find((arp) => arp['fpaN Classification'] || arp['pdF GUID']);
                    if (validARP) {
                        if (!isNullEmptyUndefined(validARP['fpaN Classification'])) {
                            classification = validARP['fpaN Classification'];
                        }
                        pdfGUID = validARP['pdF GUID'];
                    }
                }

                return [classification, pdfGUID];
            });
    }

    function applicationTypeToIndex(formID) {
        if (formID.startsWith('FPA-AERIAL-CHEMICAL-APPLICATION')) {
            return 1;
        } else if (formID.startsWith('STEP-1-LONG-TERM-FPA')) {
            return 2;
        } else if (formID.startsWith('LT-5DN')) {
            return 3;
        } else if (formID.startsWith('FPAN-RENEWAL')) {
            return 4;
        } else if (formID.startsWith('FPAN-AMENDMENT-REQUEST')) {
            return 5;
        } else if (formID.startsWith('FPAN-T')) {
            return 6;
        } else {
            return 0;
        }
    }

    function formIDToApplicationType(formID) {
        if (formID.startsWith('FPA-AERIAL-CHEMICAL-APPLICATION')) {
            return 'Forest Practices Aerial Chemical Application';
        } else if (formID.startsWith('STEP-1-LONG-TERM-FPA')) {
            return 'Step 1 Long Term FPA';
        } else if (formID.startsWith('LT-5DN')) {
            return 'Long-Term Application 5-Day Notice';
        } else if (formID.startsWith('FPAN-RENEWAL')) {
            return 'FPAN Renewal';
        } else if (formID.startsWith('FPAN-AMENDMENT-REQUEST')) {
            return 'FPAN Amendment Request';
        } else if (formID.startsWith('FPAN-T')) {
            return 'FPAN Notice of Transfer';
        } else {
            return 'Forest Practices Application Notification';
        }
    }

    function FPNPSettingToIndex(setting, stateWide, allActivities) {
        if (setting === 'all FPAN') {
            return 0;
        }

        if (stateWide === true) {
            const settingToIndicies = {
                'aerial Chemical Spray': 1,
                'timber Harvest': 2,
                'hydraulic Projects in Typed Water': 3,
                'road Construction or Abandonment': 4,
                'rock Pit or Spoils Area': 5,
            };

            return settingToIndicies[setting];
        }

        if (!allActivities) {
            const settingToIndicies = {
                'aerial Chemical Spray': 7,
                'timber Harvest': 8,
                'hydraulic Projects in Typed Water': 9,
                'road Construction or Abandonment': 10,
                'rock Pit or Spoils Area': 11,
            };

            return settingToIndicies[setting];
        }

        return 6;
    }

    function vectorizeInput(FPNP, FPAN, application, isAssociatedWithACA, isAssociatedWithFPAN, locationMatch) {
        let vectorizedInput = [
            FPNP['all FPAN'] === 'True',
            FPNP['only Certain FPAN'] === 'True',
            FPNP['all Activities'] === 'True',
            FPNP['aerial Chemical Spray'] === 'True',
            FPNP['timber Harvest'] === 'True',
            FPNP['hydraulic Projects in Typed Water'] === 'True',
            FPNP['road Construction or Abandonment'] === 'True',
            FPNP['rock Pit or Spoils Area'] === 'True',
            FPNP['no Notifications Geographical Area'] === 'True',
            isAssociatedWithACA,
            FPAN ? FPAN['harvesting Salvaging Timber'] === 'Yes' : false,
            isAssociatedWithFPAN,
            FPAN ? FPAN['structures Typed Water'] === 'Yes' : false,
            FPAN ? FPAN['constructing Abandoning Forest Roads'] === 'Yes' : false,
            FPAN ? FPAN['depositing Spoils Rock Pit'] === 'Yes' : false,
            locationMatch,
        ];

        return vectorizedInput;
    }

    function getTownshipsAndRangesAssociatedWithFPNP(SAWUserID, email) {
        const shortDescription = `Get form ${email}`;
        const getFormsParams = {
            q: `[SAW User ID] eq '${SAWUserID}' and [Email] eq '${email}' and [Status] <> 'Disabled'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'FPNP Township and Range')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                let townships = [];
                let ranges = [];
                res.data.forEach((record) => {
                    townships.push(record['township']);
                });
                res.data.forEach((record) => {
                    ranges.push(record['range']);
                });
                return {
                    townships: townships,
                    ranges: ranges,
                };
            });
    }

    function evaluateLocationMatch(application, FPNP, FPNPLocationData, type) {
        const FPNPcounties = FPNPLocationData['FPNPcounties'];
        const townships = FPNPLocationData['townships'];
        const ranges = FPNPLocationData['ranges'];
        const fpnpWAUWRIA = FPNPLocationData['fpnpWAUWRIA'];

        if (FPNP['geographic Area Types'] === 'DNR Region') {
            let FPNPRegions = [];

            if (FPNP['northeast'] === 'True') FPNPRegions.push('Northeast');
            if (FPNP['northwest'] === 'True') FPNPRegions.push('Northwest');
            if (FPNP['olympic'] === 'True') FPNPRegions.push('Olympic');
            if (FPNP['pacific Cascade'] === 'True') FPNPRegions.push('Pacific Cascade');
            if (FPNP['southeast'] === 'True') FPNPRegions.push('Southeast');
            if (FPNP['south Puget Sound'] === 'True') FPNPRegions.push('South Puget Sound');

            return (
                FPNPRegions.includes(application['application']['region']) ||
                FPNPRegions.includes(application['application']['region Project Information'])
            );
        }

        if (['County', 'Township & Range'].includes(FPNP['geographic Area Types'])) {
            let counties = application['counties'];
            let townshipsAndRanges = application['townshipsAndRanges'];

            if (FPNP['geographic Area Types'] === 'County') {
                if (FPNPcounties.some((county) => counties.includes(county))) {
                    return true;
                }

                return false;
            }

            if (FPNP['geographic Area Types'] === 'Township & Range') {
                const townshipMatch = townshipsAndRanges.some((data) => townships.includes(data['township']));
                const rangeMatch = townshipsAndRanges.some((data) => ranges.includes(data['range']));

                return townshipMatch && rangeMatch;
            }
        }

        if (['Watershed', 'Water Resource Inventory Area (WRIA)'].includes(FPNP['geographic Area Types'])) {
            const applicationWAUWRIA = application['applicationWAUWRIA'];

            if (applicationWAUWRIA.some((WAUWRIA) => fpnpWAUWRIA.includes(WAUWRIA[type.toLowerCase()]))) {
                return true;
            }

            return false;
        }

        return false;
    }

    function evaluateRule(settingIndex, applicationIndex, inputVector) {
        function parseRuleCode(ruleCode, input) {
            if (settingIndex > 5) {
                ruleCode = ruleCode + '&15';
                ruleCode = ruleCode.replace('&8', '');
            }

            let parsed = ruleCode
                .replace(/\d+/g, (match) => `input[${match}]`)
                .replace(/&/g, '&&')
                .replace(/\|/g, '||')
                .replace(/\bT\b/g, 'true')
                .replace(/\bF\b/g, 'false');

            return Function('input', `return ${parsed}`)(input);
        }

        const rules = [
            ['0|(2&8)', '0|(2&8)', '0|(2&8)', '0|(2&8)', '0|(2&8)', '0|(2&8)', '0|(2&8)'],
            ['F', '3&8', 'F', 'F', '3&8&9', '3&8&9', '3&8&9'],
            ['4&8&10', 'F', '4&8', '4&8&10&11', '4&8&10&11', '4&8&10&11', '4&8&10&11'],
            ['5&8&12', 'F', 'F', '5&8&12&11', '5&8&12&11', '5&8&12&11', '5&8&12&11'],
            ['6&8&13', 'F', 'F', '6&8&13&11', '6&8&13&11', '6&8&13&11', '6&8&13&11'],
            ['7&8&14', 'F', 'F', '7&8&14&11', '7&8&14&11', '7&8&14&11', '7&8&14&11'],
        ];

        return parseRuleCode(rules[settingIndex % 6][applicationIndex], inputVector);
    }

    function removeNotificationFlag(formTemplateName, recordGUID) {
        const shortDescription = `Update form record ${recordGUID}`;
        const fieldValuesToUpdate = {
            'Notification Flag': 'False',
        };

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    function callExternalWs(webServiceName, webServiceParams) {
        let shortDescription = `Run Web Service: ${webServiceName}`;

        return vvClient.scripts.runWebService(webServiceName, webServiceParams).then((res) => res.data);
    }

    async function getEmailTemplateByName(emailName) {
        if (cachedEmailTemplate) {
            return cachedEmailTemplate;
        }

        const shortDescription = `Get Email Template ${emailName}`;
        const cleanedEmailName = emailName.replace(/'/g, "\\'");

        const getFormsParams = {
            q: `[Email Name] eq '${cleanedEmailName}'`,
            expand: true,
        };

        const templateData = await vvClient.forms
            .getForms(getFormsParams, EMAIL_TEMPLATE_TEMPLATE)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => {
                if (!Array.isArray(res.data) || res.data.length !== 1) {
                    throw new Error(
                        `${res.data ? res.data.length : 0} email template(s) were found with the email name of ${emailName}. Review the email name to ensure only one record is referenced.`
                    );
                }
                return res.data[0];
            });

        cachedEmailTemplate = templateData;
        return cachedEmailTemplate;
    }

    function replaceTokens(text, tokens) {
        let result = text || '';

        tokens.forEach(function (tokenItem) {
            const tokenName = tokenItem.name;
            const tokenData = tokenItem.value === null || tokenItem.value === undefined ? '' : String(tokenItem.value);
            result = result.split(tokenName).join(tokenData);
        });

        return result;
    }

    function validateAndNormalizeEmailList(emailList) {
        var emailValidationCheck =
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        var validEmailList = [];
        var invalidEmailList = [];

        var emailArray = (emailList || '').split(',');

        emailArray.forEach(function (email) {
            email = email.trim();
            if (email.length > 0) {
                if (!emailValidationCheck.test(email)) {
                    invalidEmailList.push(email);
                } else {
                    validEmailList.push(email);
                }
            }
        });

        if (invalidEmailList.length > 0) {
            throw new Error(
                `Could not generate an email notification. At least one email address was not formatted correctly: ${invalidEmailList.join(', ')}.`
            );
        }

        return [...new Set(validEmailList)].join(',');
    }

    function resolveRecipients(selectorValue, definedList, contextList) {
        const safeDefinedList = definedList || '';
        const safeContextList = contextList || '';

        switch (selectorValue) {
            case SEND_TO_DEFINED:
            case SEND_CC_DEFINED:
                return safeDefinedList;
            case SEND_TO_CONTEXT:
            case SEND_CC_CONTEXT:
                return safeContextList;
            case SEND_TO_BOTH:
            case SEND_CC_BOTH:
                return `${safeDefinedList},${safeContextList}`;
            default:
                return `${safeDefinedList},${safeContextList}`;
        }
    }

    async function createCommunicationLogFromTemplate(tokens, emailAddress, relatedRecordID, emailName) {
        const emailTemplate = await getEmailTemplateByName(emailName);

        const sendToSelector = emailTemplate['send To Selector'] || '';
        const sendCCSelector = emailTemplate['send CC Selector'] || '';
        const commLogSendType = emailTemplate['send Select'] || 'Immediate Send';
        const subjectTemplate = emailTemplate['subject Line'] || '';
        const bodyTemplate = emailTemplate['body Text'] || '';
        const templateToEmails = emailTemplate['send To'] || '';
        const templateCCEmails = emailTemplate['send CC'] || '';

        const sendEmailRaw = resolveRecipients(sendToSelector, templateToEmails, emailAddress);
        const sendEmailCCRaw = resolveRecipients(sendCCSelector, templateCCEmails, '');

        const sendEmail = validateAndNormalizeEmailList(sendEmailRaw);
        const sendEmailCC = validateAndNormalizeEmailList(sendEmailCCRaw);

        if (!sendEmail) {
            throw new Error(
                'No Email Address has been supplied. Please contact a System Administrator with this information.'
            );
        }

        const subject = replaceTokens(subjectTemplate, tokens);
        const body = replaceTokens(bodyTemplate, tokens);

        const targetFields = {
            'Communication Type': 'Email',
            'Email Type': commLogSendType,
            'Email Recipients': sendEmail,
            CC: sendEmailCC,
            Subject: subject,
            'Email Body': body,
            'Scheduled Date': new Date().toISOString(),
            Approved: 'Yes',
            'Communication Sent': 'No',
            'Communication Date': new Date().toISOString(),
            'Form Saved': 'true',
            'Communication Type Filter': 'Log Previous',
            'Primary Record ID': relatedRecordID,
            'Sent/Recorded By': 'PAELS.api',
        };

        let postResp = await vvClient.forms.postForms(null, targetFields, COMMUNICATION_LOG_TEMPLATE);
        postResp = parseRes(postResp);
        checkMetaAndStatus(postResp, 'Create Communications Log');
        checkDataPropertyExists(postResp, 'Create Communications Log');

        if (!postResp.data || !postResp.data.revisionId) {
            throw new Error('Create Communications Log returned no revisionId.');
        }

        let relateResp = await vvClient.forms.relateFormByDocId(postResp.data.revisionId, relatedRecordID);
        relateResp = parseRes(relateResp);

        if (!relateResp.meta || (relateResp.meta.status !== 200 && relateResp.meta.status !== 404)) {
            throw new Error(
                `Failed relating communication log to record ${relatedRecordID}. Status: ${
                    relateResp.meta ? relateResp.meta.status : 'unknown'
                }`
            );
        }

        return postResp.data;
    }

    async function sendNotificationEmail(tokens, emailAddress, relatedRecordID, emailName) {
        return createCommunicationLogFromTemplate(tokens, emailAddress, relatedRecordID, emailName);
    }

    async function getForms(getFormsParams, templateName) {
        const shortDescription = `Get ${templateName} form record`;

        const getFormsRes = await vvClient.forms
            .getForms(getFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription));

        return getFormsRes.data;
    }

    async function getEnvConfig() {
        const envConfigResults = await getForms({ expand: true }, 'zEnvironmentConfiguration');

        const envConfig = envConfigResults.find(
            (config) =>
                ![null, '', undefined].includes(config['envConfig XCID']) &&
                ![null, '', undefined].includes(config['envConfig XCDID'])
        );

        if ([null, '', undefined].includes(envConfig)) {
            throw new Error('Error getting environment config.');
        }

        return envConfig;
    }

    function getApplicationsWithWDFWStatus() {
        const shortDescription = `Get applications Under WDFW Concurrence Review`;
        const getFormsParams = {
            q: `[Status] eq 'Under WDFW Concurrence Review'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Forest Practices Application Notification')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getWDFWConcurrenceReviewers() {
        const shortDescription = 'Get WDFW Concurrence Reviewers';
        const getFormsParams = {
            q: `[WDFW Concurrence Reviewer] eq 'True'`,
            expand: true,
        };

        return vvClient.forms
            .getForms(getFormsParams, 'Forest Practices Notification Profile')
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function evaluateWDFWRule18(fpnp) {
        const wdfwConcurrenceReviewer = fpnp['wdfW Concurrence Reviewer'] || fpnp['WDFW Concurrence Reviewer'];
        const isWDFWReviewer = wdfwConcurrenceReviewer === 'True';
        const q4a = fpnp['all FPAN'] === 'True';
        const q5f = fpnp['rock Pit or Spoils Area'] === 'True';
        const q6a = fpnp['no Notifications Geographical Area'] === 'True';

        return isWDFWReviewer && (q4a || (q5f && q6a));
    }

    function evaluateWDFWRule19(fpnp, fpan) {
        const wdfwConcurrenceReviewer = fpnp['wdfW Concurrence Reviewer'] || fpnp['WDFW Concurrence Reviewer'];
        const isWDFWReviewer = wdfwConcurrenceReviewer === 'True';
        const q5d = fpnp['hydraulic Projects in Typed Water'] === 'True';
        const q6a = fpnp['no Notifications Geographical Area'] === 'True';
        const fpanQ15 = fpan && fpan['structures Typed Water'] === 'Yes';

        return isWDFWReviewer && q5d && q6a && fpanQ15;
    }

    function evaluateWDFWRule20(fpnp, fpan) {
        const wdfwConcurrenceReviewer = fpnp['wdfW Concurrence Reviewer'] || fpnp['WDFW Concurrence Reviewer'];
        const isWDFWReviewer = wdfwConcurrenceReviewer === 'True';
        const q5d = fpnp['hydraulic Projects in Typed Water'] === 'True';
        const q6b = fpnp['yes Notifications Geographical Area'] === 'True';
        const fpanQ15 = fpan && fpan['structures Typed Water'] === 'Yes';

        return isWDFWReviewer && q5d && q6b && fpanQ15;
    }

    function evaluateWDFWRule21(fpnp) {
        const wdfwConcurrenceReviewer = fpnp['wdfW Concurrence Reviewer'] || fpnp['WDFW Concurrence Reviewer'];
        const isWDFWReviewer = wdfwConcurrenceReviewer === 'True';
        const q5f = fpnp['rock Pit or Spoils Area'] === 'True';
        const q6b = fpnp['yes Notifications Geographical Area'] === 'True';

        return isWDFWReviewer && q5f && q6b;
    }

    // Checks if the parameter is null, empty, select item, or undefined, and returns a boolean value.
    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase();
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    function getApplicationsFromUnifiedQuery() {
        const shortDescription = 'Unified Application Notifications';
        return vvClient.customQuery
            .getCustomQueryResultsByName('zWebSvc Get Applications', {})
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    async function getFPNPsFromUnifiedQuery() {
        const limit = 1000;
        let offset = 0;
        const records = [];

        const shortDescription = `Get zWebSvc Get FPNP Profiles, offset= ${offset}`;
        const customQueryData = {};

        try {
            let queryResponse = await vvClient.customQuery
                .getCustomQueryResultsByName('zWebSvc Get FPNP Profiles', customQueryData)
                .then((res) => parseRes(res))
                .then((res) => checkMetaAndStatus(res, shortDescription))
                .then((res) => checkDataPropertyExists(res, shortDescription))
                .then((res) => res.data);

            if (queryResponse.length === 0) {
                //break; // Exit if no more data to fetch
            }

            records.push(...queryResponse);
            offset += limit;

            if (queryResponse.length < limit) {
                //break;
            }
        } catch (error) {
            //break;
        }

        return records;
    }

    function buildFpanDataCollectionFromQuery(rows) {
        let fpanDataCollection = {};

        for (let r of rows) {
            const FPANNumber = r['fpaN Number'];

            if (!fpanDataCollection[FPANNumber]) {
                fpanDataCollection[FPANNumber] = {
                    'fpaN Number': FPANNumber,
                    application: {
                        'fpaN Number': FPANNumber,
                        'top Form ID': r['top Form ID'],
                        status: r['status'],
                        region: r['region'],
                    },
                    FPAN:
                        r.isAssociatedWithFPAN === 1
                            ? {
                                  'harvesting Salvaging Timber': r['harvesting Salvaging Timber'],
                                  'structures Typed Water': r['structures Typed Water'],
                                  'constructing Abandoning Forest Roads': r['constructing Abandoning Forest Roads'],
                                  'depositing Spoils Rock Pit': r['depositing Spoils Rock Pit'],
                              }
                            : null,
                    isAssociatedWithACA: r.isAssociatedWithACA === 1,
                    counties: [],
                    townshipsAndRanges: [],
                    applicationWAUWRIA: [],
                    classification: r['fpaN Classification'],
                    pdfGUID: r['pdF GUID'],
                    legacyURL: r['legacy PDF URL'],
                    appGroup: r['appGroup'],
                };
            }

            if (r.countiesJson) {
                JSON.parse(r.countiesJson).forEach((c) => fpanDataCollection[FPANNumber]['counties'].push(c.value));
            }

            if (r.townshipRangeJson) {
                JSON.parse(r.townshipRangeJson).forEach((tr) =>
                    fpanDataCollection[FPANNumber]['townshipsAndRanges'].push(tr)
                );
            }

            if (r.wauWriaJson) {
                JSON.parse(r.wauWriaJson).forEach((w) => fpanDataCollection[FPANNumber]['applicationWAUWRIA'].push(w));
            }
        }

        return fpanDataCollection;
    }

    function getEnvURL(envConfig) {
        if (envConfig['envConfig URL'].includes('dev')) return 'https://fpansearch-dev.visualvault.com';
        else if (envConfig['envConfig URL'].includes('qa')) return 'https://fpansearch-qa.visualvault.com';
        else if (envConfig['envConfig URL'].includes('sandbox')) return 'https://fpansearch-uat.visualvault-gov.com';
        else return 'https://fpansearch.visualvault.com';
    }

    async function runWithConcurrency(taskFns, limit) {
        const results = [];
        const executing = new Set();

        for (const taskFn of taskFns) {
            const p = Promise.resolve().then(taskFn);

            results.push(p);
            executing.add(p);

            const cleanup = () => executing.delete(p);
            p.then(cleanup).catch(cleanup);

            if (executing.size >= limit) {
                await Promise.race(executing);
            }
        }

        return Promise.allSettled(results);
    }

    try {
        const applicationRows = await getApplicationsFromUnifiedQuery();
        const fpanDataCollection = buildFpanDataCollectionFromQuery(applicationRows);

        const FPNPs = await getFPNPsFromUnifiedQuery();

        const envConfig = await getEnvConfig();
        const URL = getEnvURL(envConfig);

        const EMAIL_CONCURRENCY = 20;
        const WDFW_EMAIL_CONCURRENCY = 20;
        const REMOVE_FLAG_CONCURRENCY = 20;
        const wdfwEmailTasks = [];
        const removeFlagTasks = [];
        let emailTasks = [];

        await getEmailTemplateByName(EMAIL_TEMPLATE_NAME);

        for (let FPNP of FPNPs) {
            let applicationsToEmail = [];

            if (FPNP['all Activities'] === 'True') {
                FPNP['aerial Chemical Spray'] = 'True';
                FPNP['timber Harvest'] = 'True';
                FPNP['hydraulic Projects in Typed Water'] = 'True';
                FPNP['road Construction or Abandonment'] = 'True';
                FPNP['rock Pit or Spoils Area'] = 'True';
            }

            let FPNPLocationData = {};
            FPNPLocationData['FPNPcounties'] = FPNP['countiesJson']
                ? JSON.parse(FPNP['countiesJson']).map((c) => c.value)
                : [];
            FPNPLocationData['townships'] = FPNP['townshipRangeJson']
                ? JSON.parse(FPNP['townshipRangeJson']).map((t) => t.township)
                : [];
            FPNPLocationData['ranges'] = FPNP['townshipRangeJson']
                ? JSON.parse(FPNP['townshipRangeJson']).map((t) => t.range)
                : [];
            const type = FPNP['geographic Area Types'] === 'Watershed' ? 'WAU' : 'WRIA';
            FPNPLocationData['fpnpWAUWRIA'] =
                FPNP['geographic Area Types'] === 'Watershed'
                    ? FPNP['watershedJson']
                        ? JSON.parse(FPNP['watershedJson']).map((w) => w.value)
                        : []
                    : FPNP['wriaJson']
                      ? JSON.parse(FPNP['wriaJson']).map((w) => w.value)
                      : [];

            for (let fpanData of Object.values(fpanDataCollection)) {
                if (fpanData['appGroup'] !== 'FLAGGED') continue;
                try {
                    let FPAN = fpanData['FPAN'];
                    let isAssociatedWithACA = fpanData['isAssociatedWithACA'];

                    const isAllFpans = FPNP['all FPAN'] === 'True';
                    const isAllActivities = FPNP['all Activities'] === 'True';
                    const geoFilteringOn = FPNP['no Notifications Geographical Area'] !== 'True';
                    const locationMatch = geoFilteringOn
                        ? evaluateLocationMatch(fpanData, FPNP, FPNPLocationData, type)
                        : false;

                    if (isAllFpans) {
                        applicationsToEmail.push(fpanData['application']);
                        continue;
                    }

                    if (isAllActivities && !geoFilteringOn) {
                        applicationsToEmail.push(fpanData['application']);
                        continue;
                    }

                    if (isAllActivities && geoFilteringOn) {
                        const applicationIndex = applicationTypeToIndex(fpanData['application']['top Form ID']);
                        const input = vectorizeInput(
                            FPNP,
                            FPAN,
                            fpanData['application'],
                            isAssociatedWithACA,
                            FPAN !== null,
                            locationMatch
                        );

                        if (evaluateRule(6, applicationIndex, input)) {
                            applicationsToEmail.push(fpanData['application']);
                        }

                        continue;
                    }

                    for (let key in FPNP) {
                        if (
                            FPNP[key] === 'True' &&
                            [
                                'aerial Chemical Spray',
                                'hydraulic Projects in Typed Water',
                                'road Construction or Abandonment',
                                'rock Pit or Spoils Area',
                                'timber Harvest',
                            ].includes(key)
                        ) {
                            try {
                                if (FPNP.hasOwnProperty(key)) {
                                    const applicationIndex = applicationTypeToIndex(
                                        fpanData['application']['top Form ID']
                                    );
                                    const settingIndex = FPNPSettingToIndex(
                                        key,
                                        FPNP['all FPAN'] == 'True' ||
                                            FPNP['no Notifications Geographical Area'] == 'True',
                                        FPNP['all Activities'] == 'True'
                                    );

                                    const input = vectorizeInput(
                                        FPNP,
                                        FPAN,
                                        fpanData['application'],
                                        isAssociatedWithACA,
                                        FPAN !== null,
                                        locationMatch
                                    );

                                    if (evaluateRule(settingIndex, applicationIndex, input)) {
                                        applicationsToEmail.push(fpanData['application']);
                                        break;
                                    }
                                }
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    }
                } catch (error) {
                    console.log(error);
                }
            }

            let applicationList = '';

            for (let applicationFormRecord of applicationsToEmail) {
                const { classification, pdfGUID, legacyURL } = fpanDataCollection[applicationFormRecord['fpaN Number']];

                const displayClassification = isNullEmptyUndefined(classification) ? 'Not Selected' : classification;

                let href = '';
                if (!isNullEmptyUndefined(pdfGUID)) {
                    href = `${URL}/publicSearch/getDocument?fromLink=true&GUID=${pdfGUID}`;
                } else if (!isNullEmptyUndefined(legacyURL)) {
                    href = legacyURL;
                }

                if (!isNullEmptyUndefined(href)) {
                    applicationList += `<a href="${href}">${
                        applicationFormRecord['fpaN Number']
                    }</a> | ${formIDToApplicationType(applicationFormRecord['top Form ID'])} | ${
                        applicationFormRecord['status']
                    } | Class ${displayClassification}<br>`;
                }
            }

            const tokens = [{ name: '[Application Info]', value: applicationList }];

            if (applicationsToEmail.length > 0 && applicationList !== '') {
                expectedCommLogs++;

                emailTasks.push(async () => {
                    try {
                        await sendNotificationEmail(tokens, FPNP['email'], FPNP['top Form ID'], EMAIL_TEMPLATE_NAME);
                        createdCommLogs++;
                    } catch (err) {
                        logger.info(
                            `SCH_FPNP_NotificationSystem: Failed calling direct communication log creation for profile ${FPNP['top Form ID']}: ${err}`
                        );
                    }
                });
            }
        }

        await runWithConcurrency(emailTasks, EMAIL_CONCURRENCY);

        const flaggedApplications = applicationRows.filter((r) => r.appGroup === 'FLAGGED');

        for (let application of flaggedApplications) {
            const templateName = formIDToApplicationType(application['top Form ID']);

            removeFlagTasks.push(() => removeNotificationFlag(templateName, application['dhid']));
        }

        await runWithConcurrency(removeFlagTasks, REMOVE_FLAG_CONCURRENCY);

        logger.info('Starting WDFW Concurrence notifications processing');

        const wdfwApplications = applicationRows.filter((r) => r.appGroup === 'WDFW');

        if (wdfwApplications.length > 0) {
            const wdfwReviewers = FPNPs.filter((f) => f['wdfW Concurrence Reviewer'] === 'True');

            let wdfwFPANDataCollection = {};

            for (let wdfwApp of wdfwApplications) {
                const fpanNumber = wdfwApp['fpaN Number'];

                if (fpanDataCollection[fpanNumber]) {
                    wdfwFPANDataCollection[fpanNumber] = fpanDataCollection[fpanNumber];
                }
            }

            for (let reviewer of wdfwReviewers) {
                let wdfwApplicationsToEmail = [];

                let FPNPLocationData = {};

                FPNPLocationData['FPNPcounties'] = reviewer['countiesJson']
                    ? JSON.parse(reviewer['countiesJson']).map((c) => c.value)
                    : [];

                FPNPLocationData['townships'] = reviewer['townshipRangeJson']
                    ? JSON.parse(reviewer['townshipRangeJson']).map((t) => t.township)
                    : [];

                FPNPLocationData['ranges'] = reviewer['townshipRangeJson']
                    ? JSON.parse(reviewer['townshipRangeJson']).map((t) => t.range)
                    : [];

                const type = reviewer['geographic Area Types'] === 'Watershed' ? 'WAU' : 'WRIA';

                FPNPLocationData['fpnpWAUWRIA'] =
                    type === 'WAU'
                        ? reviewer['watershedJson']
                            ? JSON.parse(reviewer['watershedJson']).map((w) => w.value)
                            : []
                        : reviewer['wriaJson']
                          ? JSON.parse(reviewer['wriaJson']).map((w) => w.value)
                          : [];

                for (let application of Object.values(wdfwFPANDataCollection)) {
                    const fpan = application['FPAN'];

                    if (evaluateWDFWRule18(reviewer)) {
                        wdfwApplicationsToEmail.push(application['application']);
                        continue;
                    }

                    if (evaluateWDFWRule19(reviewer, fpan)) {
                        wdfwApplicationsToEmail.push(application['application']);
                        continue;
                    }

                    if (evaluateWDFWRule20(reviewer, fpan)) {
                        const locationMatch = evaluateLocationMatch(application, reviewer, FPNPLocationData, type);

                        if (locationMatch) {
                            wdfwApplicationsToEmail.push(application['application']);
                            continue;
                        }
                    }

                    if (evaluateWDFWRule21(reviewer)) {
                        const locationMatch = evaluateLocationMatch(application, reviewer, FPNPLocationData, type);

                        if (locationMatch) {
                            wdfwApplicationsToEmail.push(application['application']);
                        }
                    }
                }

                let wdfwApplicationList = '';

                for (let application of wdfwApplicationsToEmail) {
                    const fpanNumber = application['fpaN Number'];
                    const { classification, pdfGUID, legacyURL } = wdfwFPANDataCollection[fpanNumber];

                    const displayClassification = isNullEmptyUndefined(classification)
                        ? 'Not Selected'
                        : classification;

                    let href = '';
                    if (!isNullEmptyUndefined(pdfGUID)) {
                        href = `${URL}/publicSearch/getDocument?fromLink=true&GUID=${pdfGUID}`;
                    } else if (!isNullEmptyUndefined(legacyURL)) {
                        href = legacyURL;
                    }

                    if (!isNullEmptyUndefined(href)) {
                        wdfwApplicationList +=
                            `<a href="${href}">${fpanNumber}</a> | ` +
                            `${formIDToApplicationType(application['top Form ID'])} | ` +
                            `${application['status']} | Class ${displayClassification}<br>`;
                    }
                }

                if (wdfwApplicationsToEmail.length > 0 && wdfwApplicationList !== '') {
                    const wdfwTokens = [{ name: '[Application Info]', value: wdfwApplicationList }];

                    expectedCommLogs++;

                    wdfwEmailTasks.push(async () => {
                        try {
                            await sendNotificationEmail(
                                wdfwTokens,
                                reviewer['email'],
                                reviewer['top Form ID'],
                                EMAIL_TEMPLATE_NAME
                            );
                            createdCommLogs++;
                        } catch (err) {
                            logger.info(
                                `SCH_FPNP_NotificationSystem: Failed calling direct communication log creation for reviewer ${reviewer['top Form ID']}: ${err}`
                            );
                        }
                    });
                }
            }

            await runWithConcurrency(wdfwEmailTasks, WDFW_EMAIL_CONCURRENCY);

            logger.info('Removing notification flags from WDFW applications');
            const wdfwRemoveFlagTasks = [];

            for (let wdfwApp of wdfwApplications) {
                const templateName = formIDToApplicationType(wdfwApp['top Form ID']);

                wdfwRemoveFlagTasks.push(() => removeNotificationFlag(templateName, wdfwApp['dhid']));
            }

            await runWithConcurrency(wdfwRemoveFlagTasks, REMOVE_FLAG_CONCURRENCY);
            logger.info('WDFW notification flags removed successfully');
        }

        logger.info('WDFW Concurrence notifications processing completed');
        logger.info(
            `SCH_FPNP_NotificationSystem: Created ${createdCommLogs} communication logs. Expected: ${expectedCommLogs}`
        );

        responseMessage = 'Success';

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);
        logger.info(
            `SCH_FPNP_NotificationSystem: Created ${createdCommLogs} communication logs. Expected: ${expectedCommLogs}`
        );

        if (errorLog.length > 0) {
            responseMessage = `Error/s: ${errorLog.join('; ')}`;
        } else {
            responseMessage = `Unhandled error occurred: ${error}`;
        }

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
