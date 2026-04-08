/**
 * Shared environment config loader.
 *
 * Reads the root .env.json (hierarchical server → customer format) and
 * returns a flat config object for the active server/customer combination.
 * This is the single source of truth for credentials — both server-side
 * (via app.js → global.VV_ENV) and test-side (via this loader) read from
 * the same file.
 *
 * .env.json structure:
 *   activeServer / activeCustomer  →  selects the target
 *   servers.{name}.baseUrl         →  VV instance URL
 *   servers.{name}.customers.{name}  →  credentials + config
 *
 * Field mapping (returned flat object):
 *   .env.json field   →  returned property  →  purpose
 *   ─────────────────────────────────────────────────────
 *   activeServer +
 *   activeCustomer    →  instance            "vvdemo/EmanuelJofre"
 *   baseUrl           →  baseUrl, loginUrl   full VV URL (from server level)
 *   username          →  username            human login email
 *   loginPassword     →  password            human login password
 *   clientId          →  clientId            OAuth client ID
 *   clientSecret      →  clientSecret        OAuth client secret
 *   customerAlias     →  customerAlias       VV tenant
 *   databaseAlias     →  databaseAlias       VV database
 *   audience          →  audience            OAuth audience (optional)
 *   readOnly          →  readOnly            block write operations (default: false)
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
    const serverName = raw.activeServer;
    const customerName = raw.activeCustomer;

    const server = raw.servers && raw.servers[serverName];
    if (!server) {
        throw new Error(`No server "${serverName}" found in .env.json`);
    }

    const customer = server.customers && server.customers[customerName];
    if (!customer) {
        throw new Error(`No customer "${customerName}" found under server "${serverName}" in .env.json`);
    }

    const instance = `${serverName}/${customerName}`;

    if (customer.readOnly === true) {
        console.warn(`[READ-ONLY] ${instance} is marked readOnly. Write operations will be blocked.`);
    }

    return {
        instance,
        loginUrl: server.baseUrl,
        baseUrl: server.baseUrl,
        username: customer.username,
        password: customer.loginPassword,
        clientId: customer.clientId,
        clientSecret: customer.clientSecret,
        customerAlias: customer.customerAlias,
        databaseAlias: customer.databaseAlias,
        audience: customer.audience || '',
        readOnly: customer.readOnly === true,
    };
}

module.exports = { loadConfig };
