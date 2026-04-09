/**
 * fpnpLoadTesting
 * Category: Scheduled
 * Modified: 2026-03-13T20:41:25.793Z by nicolas.culini@visualvault.com
 * Script ID: Script Id: 117c39cc-191f-f111-830c-f58dfe96f12b
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');

module.exports.getCredentials = function () {
    return {
        customerAlias: 'WADNR',
        databaseAlias: 'fpOnline',
        userId: '09f356bb-3f44-49b1-a55f-d2caa2de9cc1',
        password: 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=',
        clientId: '09f356bb-3f44-49b1-a55f-d2caa2de9cc1',
        clientSecret: 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=',
    };
};

module.exports.main = async function (vvClient, response, token) {
    logger.info(`Start of logic for EmailNotificationSystem on ${new Date()}`);
    response.json(200, `Start of logic for EmailNotificationSystem on ${new Date()}`);

    const scheduledProcessGUID = token;
    let responseMessage = '';

    const EMAIL_CONCURRENCY = 30;
    const COMMUNICATION_LOG_TEMPLATE = 'Communications Log';

    const MOCK_CONFIG = {
        fpnpCount: 100,
        applicationCount: 100,
        baseEmail: 'nicolas.culini@visualvault.com',
        aliasPrefix: 'fpnploadtestFINAL',
        mockEnvUrl: 'https://fpansearch-qa.visualvault.com',
    };

    const EMAIL_CONFIG = {
        emailType: 'Immediate Send',
        subjectTemplate: 'Forest Practice Notification',
        bodyTemplate:
            'The following forest practice application matches your notification profile:<br><br>[Application Info]',
    };

    let expectedCommLogs = 0;
    let createdCommLogs = 0;

    try {
        function parseRes(vvClientRes) {
            try {
                const parsed = JSON.parse(vvClientRes);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {
                // already object
            }
            return vvClientRes;
        }

        function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
            if (!vvClientRes.meta) {
                throw new Error(`${shortDescription} error. No meta object found in response.`);
            }

            const status = vvClientRes.meta.status;
            if (status !== 200 && status !== 201 && status !== ignoreStatusCode) {
                const errorReason =
                    vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                        ? vvClientRes.meta.errors[0].reason
                        : 'unspecified';

                throw new Error(`${shortDescription} error. Status: ${status}. Reason: ${errorReason}`);
            }

            return vvClientRes;
        }

        function isNullEmptyUndefined(value) {
            if (value === null || value === undefined) return true;

            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                return (
                    normalized === '' ||
                    normalized === 'null' ||
                    normalized === 'undefined' ||
                    normalized === 'select item'
                );
            }

            if (Array.isArray(value)) return value.length === 0;
            if (typeof value === 'object') return Object.keys(value).length === 0;

            return false;
        }

        async function runWithConcurrency(taskFns, limit) {
            if (!taskFns.length) return [];

            const results = [];
            const executing = new Set();

            for (const taskFn of taskFns) {
                let p;
                p = Promise.resolve()
                    .then(taskFn)
                    .finally(() => executing.delete(p));

                results.push(p);
                executing.add(p);

                if (executing.size >= limit) {
                    await Promise.race(executing);
                }
            }

            await Promise.allSettled(executing);
            return Promise.allSettled(results);
        }

        function formIDToApplicationType(formID) {
            if (formID.startsWith('FPA-AERIAL-CHEMICAL-APPLICATION')) {
                return 'Forest Practices Aerial Chemical Application';
            }
            if (formID.startsWith('STEP-1-LONG-TERM-FPA')) {
                return 'Step 1 Long Term FPA';
            }
            if (formID.startsWith('LT-5DN')) {
                return 'Long-Term Application 5-Day Notice';
            }
            if (formID.startsWith('FPAN-RENEWAL')) {
                return 'FPAN Renewal';
            }
            if (formID.startsWith('FPAN-AMENDMENT-REQUEST')) {
                return 'FPAN Amendment Request';
            }
            if (formID.startsWith('FPAN-T')) {
                return 'FPAN Notice of Transfer';
            }
            return 'Forest Practices Application Notification';
        }

        function buildApplicationLinkInfo(app, baseUrl) {
            const displayClassification = isNullEmptyUndefined(app.classification)
                ? 'Not Selected'
                : app.classification;

            let href = '';
            if (!isNullEmptyUndefined(app.pdfGUID)) {
                href = `${baseUrl}/publicSearch/getDocument?fromLink=true&GUID=${app.pdfGUID}`;
            } else if (!isNullEmptyUndefined(app.legacyURL)) {
                href = app.legacyURL;
            }

            return {
                href,
                displayClassification,
            };
        }

        function replaceTokens(text, tokens) {
            if (isNullEmptyUndefined(text)) return '';

            let result = text;

            for (const token of tokens || []) {
                const tokenName = token.name;
                const tokenValue = token.value === null || token.value === undefined ? '' : String(token.value);

                result = result.split(tokenName).join(tokenValue);
            }

            return result;
        }

        function findUnreplacedTokens(text) {
            if (isNullEmptyUndefined(text)) return [];
            const matches = text.match(/\[[^[\]]+\]/g);
            return matches ? [...new Set(matches)] : [];
        }

        function validateAndNormalizeEmailList(emailList) {
            const emailRegex =
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            const valid = [];
            const invalid = [];

            (emailList || '')
                .split(',')
                .map((e) => e.trim())
                .filter(Boolean)
                .forEach((email) => {
                    if (emailRegex.test(email)) valid.push(email);
                    else invalid.push(email);
                });

            if (invalid.length > 0) {
                throw new Error(`Invalid email address(es): ${invalid.join(', ')}`);
            }

            return [...new Set(valid)].join(',');
        }

        async function createCommunicationLogDirect({
            recipients,
            recipientsCC = '',
            subject,
            body,
            relatedRecordID,
            scheduledSendDateTime = '',
            otherFieldsToUpdate = {},
        }) {
            const targetFields = {
                'Communication Type': 'Email',
                'Email Type': EMAIL_CONFIG.emailType,
                'Email Recipients': recipients,
                CC: recipientsCC,
                Subject: subject,
                'Email Body': body,
                'Scheduled Date': scheduledSendDateTime || new Date().toISOString(),
                Approved: 'Yes',
                'Communication Sent': 'No',
                'Communication Date': new Date().toISOString(),
                'Form Saved': 'true',
                'Communication Type Filter': 'Log Previous',
                'Primary Record ID': relatedRecordID,
                'Sent/Recorded By': 'PAELS.api',
            };

            for (const key in otherFieldsToUpdate) {
                targetFields[key] = otherFieldsToUpdate[key];
            }

            let postResp = await vvClient.forms.postForms(null, targetFields, COMMUNICATION_LOG_TEMPLATE);
            postResp = parseRes(postResp);
            checkMetaAndStatus(postResp, 'Create Communications Log');

            if (!postResp.data || !postResp.data.revisionId || !postResp.data.instanceName) {
                throw new Error('Create Communications Log returned no revisionId/instanceName.');
            }

            const commLogRevisionId = postResp.data.revisionId;

            let relateResp = await vvClient.forms.relateFormByDocId(commLogRevisionId, relatedRecordID);
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

        function pad(num, size = 3) {
            return String(num).padStart(size, '0');
        }

        function buildMockEmail(index) {
            const [local, domain] = MOCK_CONFIG.baseEmail.split('@');
            return `${local}+${MOCK_CONFIG.aliasPrefix}${pad(index)}@${domain}`;
        }

        function buildMockApplicationTopFormId(index) {
            return `FPAN-MOCK-${pad(index, 5)}`;
        }

        function buildMockRegion(index) {
            const regions = ['Northeast', 'Northwest', 'Olympic', 'Pacific Cascade', 'Southeast', 'South Puget Sound'];
            return regions[index % regions.length];
        }

        function generateMockApplications(count, baseUrl) {
            const apps = [];

            for (let i = 1; i <= count; i++) {
                const fpanNumber = `MOCK-FPAN-${pad(i, 5)}`;
                const topFormID = buildMockApplicationTopFormId(i);
                const region = buildMockRegion(i);

                apps.push({
                    'fpaN Number': fpanNumber,
                    'top Form ID': topFormID,
                    status: 'Received',
                    region,
                    'region Project Information': region,
                    classification: `Class ${(i % 4) + 1}`,
                    pdfGUID: '',
                    legacyURL: `${baseUrl}/publicSearch/mockDocument/${fpanNumber}`,
                    applicationType: formIDToApplicationType(topFormID),
                });
            }

            return apps;
        }

        function generateMockFPNPs(count) {
            const profiles = [];

            for (let i = 1; i <= count; i++) {
                profiles.push({
                    email: buildMockEmail(i),
                    'top Form ID': `MOCK-FPNP-${pad(i, 5)}`,
                    'all FPAN': 'True',
                });
            }

            return profiles;
        }

        const URL = MOCK_CONFIG.mockEnvUrl;

        logger.info(
            `SCH_FPNP_NotificationSystem: Using direct postForms load test. FPNPs=${MOCK_CONFIG.fpnpCount}, Applications=${MOCK_CONFIG.applicationCount}, Expected Emails=${MOCK_CONFIG.fpnpCount * MOCK_CONFIG.applicationCount}`
        );

        const mockApplications = generateMockApplications(MOCK_CONFIG.applicationCount, URL);
        const mockFPNPs = generateMockFPNPs(MOCK_CONFIG.fpnpCount);

        const emailTasks = [];

        for (const profile of mockFPNPs) {
            for (const application of mockApplications) {
                const { href, displayClassification } = buildApplicationLinkInfo(application, URL);

                const applicationList = `<a href="${href}">${application['fpaN Number']}</a> | ${application.applicationType} | ${application.status} | Class ${displayClassification}<br>`;
                const tokens = [{ name: '[Application Info]', value: applicationList }];

                expectedCommLogs++;

                emailTasks.push(async () => {
                    try {
                        const recipients = validateAndNormalizeEmailList(profile.email);
                        const subject = replaceTokens(EMAIL_CONFIG.subjectTemplate, tokens);
                        const body = replaceTokens(EMAIL_CONFIG.bodyTemplate, tokens);

                        const unreplacedTokens = [...findUnreplacedTokens(subject), ...findUnreplacedTokens(body)];

                        if (unreplacedTokens.length > 0) {
                            logger.info(
                                `Unreplaced email tokens for related record ${profile['top Form ID']}: ${unreplacedTokens.join(', ')}`
                            );
                        }

                        await createCommunicationLogDirect({
                            recipients,
                            recipientsCC: '',
                            subject,
                            body,
                            relatedRecordID: profile['top Form ID'],
                            otherFieldsToUpdate: {},
                        });

                        createdCommLogs++;
                    } catch (err) {
                        logger.info(
                            `SCH_FPNP_NotificationSystem: Failed direct postForms communication log create for profile ${profile['top Form ID']}, application ${application['fpaN Number']}: ${err}`
                        );
                    }
                });
            }
        }

        await runWithConcurrency(emailTasks, EMAIL_CONCURRENCY);

        logger.info(
            `SCH_FPNP_NotificationSystem: Created ${createdCommLogs} communication logs. Expected: ${expectedCommLogs}`
        );

        if (createdCommLogs !== expectedCommLogs) {
            throw new Error(
                `Load test mismatch. Created ${createdCommLogs} communication logs. Expected ${expectedCommLogs}.`
            );
        }

        responseMessage = 'Success';

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, responseMessage);
    } catch (error) {
        logger.info(`Error encountered ${error}`);
        logger.info(
            `SCH_FPNP_NotificationSystem: Created ${createdCommLogs} communication logs. Expected: ${expectedCommLogs}`
        );

        responseMessage = `Unhandled error occurred: ${error}`;

        return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', false, responseMessage);
    }
};
