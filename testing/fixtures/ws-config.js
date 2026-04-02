/**
 * Shared configuration for VV web services date-handling tests.
 *
 * Provides API-specific constants used by web services test files:
 * - VV instance credentials (loaded from testing/config/vv-config.json via vv-config.js)
 * - Form template ID for the DateTest form
 * - Field map (reused from vv-config.js — same form, same fields)
 * - API-specific constants (endpoints, expected response formats)
 *
 * See tasks/date-handling/web-services/analysis.md for API documentation.
 */
const { vvConfig, FIELD_MAP } = require('./vv-config');

// DateTest form template ID — same form used by Forms UI tests.
// This is the formTemplateId GUID used in API calls (not the URL formid parameter).
const FORM_TEMPLATE_ID = '6be0265c-152a-f111-ba23-0afff212cc87';

// Customer and database identifiers for API authentication
const API_CONFIG = {
    baseUrl: vvConfig.baseUrl || 'https://vvdemo.visualvault.com',
    customerAlias: vvConfig.customerAlias,
    databaseAlias: vvConfig.databaseAlias,
    userId: vvConfig.userId,
    password: vvConfig.password,
    clientId: vvConfig.clientId,
    clientSecret: vvConfig.clientSecret,
    audience: vvConfig.audience || '',
};

// Field name to API response key mapping.
// The VV API returns field values with lowercase property names in the response JSON.
// e.g., Field7 in the form → dataField7 in the API response.
const API_FIELD_KEY = (fieldName) => fieldName.charAt(0).toLowerCase() + fieldName.slice(1);

// Standard date formats used in API input tests (WS-6)
const DATE_FORMATS = {
    isoDateOnly: '2026-03-15',
    usFormat: '03/15/2026',
    isoDatetime: '2026-03-15T00:00:00',
    isoDatetimeZ: '2026-03-15T00:00:00Z',
    isoDatetimeBRT: '2026-03-15T00:00:00-03:00',
    isoDatetimeIST: '2026-03-15T00:00:00+05:30',
};

module.exports = {
    FORM_TEMPLATE_ID,
    API_CONFIG,
    API_FIELD_KEY,
    DATE_FORMATS,
    FIELD_MAP,
};
