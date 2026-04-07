/**
 * Shared environment config loader.
 *
 * Reads the root .env.json (multi-environment format) and returns a flat
 * config object for the active environment. This is the single source of
 * truth for credentials — both server-side (via app.js → global.VV_ENV)
 * and test-side (via this loader) read from the same file.
 *
 * Field mapping:
 *   .env.json field   →  returned property  →  purpose
 *   ─────────────────────────────────────────────────────
 *   activeEnv         →  instance            "vvdemo"
 *   baseUrl           →  baseUrl, loginUrl   full VV URL
 *   username          →  username            human login email
 *   loginPassword     →  password            human login password
 *   clientId          →  clientId            OAuth client ID
 *   clientSecret      →  clientSecret        OAuth client secret
 *   customerAlias     →  customerAlias       VV tenant
 *   databaseAlias     →  databaseAlias       VV database
 *   audience          →  audience            OAuth audience (optional)
 */
const path = require('path');
const fs = require('fs');

const ENV_JSON_PATH = path.resolve(__dirname, '..', '..', '.env.json');

function loadConfig() {
    if (!fs.existsSync(ENV_JSON_PATH)) {
        throw new Error(
            `Config not found: ${ENV_JSON_PATH}\n` + 'Copy .env.example.json to .env.json and fill in your credentials.'
        );
    }

    const raw = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const envName = raw.activeEnv;
    const env = raw.environments && raw.environments[envName];

    if (!env) {
        throw new Error(`No environment "${envName}" found in .env.json`);
    }

    return {
        instance: envName,
        loginUrl: env.baseUrl,
        baseUrl: env.baseUrl,
        username: env.username,
        password: env.loginPassword,
        clientId: env.clientId,
        clientSecret: env.clientSecret,
        customerAlias: env.customerAlias,
        databaseAlias: env.databaseAlias,
        audience: env.audience || '',
    };
}

module.exports = { loadConfig };
