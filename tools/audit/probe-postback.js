#!/usr/bin/env node
/**
 * Probe the outsideprocessadmin AJAX postback format.
 * Captures one script detail request/response to understand the protocol.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ENV_JSON_PATH = path.resolve(__dirname, '..', '..', '.env.json');

function loadWadnrConfig() {
    const raw = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const server = raw.servers['vv5dev'];
    const wadnr = server.customers['WADNR'];
    return {
        baseUrl: server.baseUrl,
        username: wadnr.username,
        password: wadnr.loginPassword,
        customerAlias: wadnr.customerAlias,
        databaseAlias: wadnr.databaseAlias,
    };
}

async function main() {
    const config = loadWadnrConfig();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    console.log('Logging in...');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByRole('textbox', { name: 'User Name' }).fill(config.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(config.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForFunction(
        () => !document.location.pathname.includes('login') && document.location.pathname !== '/',
        { timeout: 15000 }
    );
    console.log('Logged in.');

    // Navigate to outsideprocessadmin
    const adminUrl = `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/outsideprocessadmin`;
    await page.goto(adminUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });
    console.log('Admin page loaded.');

    // Get cookies for HTTP approach
    const cookies = await context.cookies();
    console.log(`\n=== Cookies (${cookies.length}) ===`);
    cookies.forEach((c) => console.log(`  ${c.name}=${c.value.substring(0, 40)}... (${c.domain})`));

    // Extract ASP.NET state fields
    const stateFields = await page.evaluate(() => {
        const fields = {};
        const inputs = document.querySelectorAll('input[type="hidden"]');
        for (const input of inputs) {
            if (input.name && (input.name.startsWith('__') || input.name.includes('ScriptManager'))) {
                fields[input.name] = input.value.substring(0, 200) + (input.value.length > 200 ? '...' : '');
            }
        }
        return fields;
    });
    console.log(`\n=== ASP.NET state fields ===`);
    for (const [k, v] of Object.entries(stateFields)) {
        console.log(`  ${k}: ${v.substring(0, 80)}...`);
    }

    // Find the first lnkDetails link and its postback target
    const firstLink = await page.evaluate(() => {
        const link = document.querySelector('a[id*="lnkDetails"]');
        if (!link) return null;
        const href = link.getAttribute('href') || '';
        const match = href.match(/__doPostBack\('([^']+)'/);
        return {
            id: link.id,
            text: link.textContent.trim(),
            href: href.substring(0, 200),
            postbackTarget: match ? match[1] : null,
        };
    });
    console.log(`\n=== First link ===`);
    console.log(JSON.stringify(firstLink, null, 2));

    // Intercept the AJAX response when clicking the link
    let capturedResponse = null;
    page.on('response', async (resp) => {
        if (resp.request().method() === 'POST' && resp.url().includes('outsideprocessadmin')) {
            const body = await resp.text();
            capturedResponse = {
                status: resp.status(),
                contentType: resp.headers()['content-type'],
                bodyLength: body.length,
                bodyStart: body.substring(0, 500),
                bodyEnd: body.substring(Math.max(0, body.length - 500)),
                // Check for textarea
                hasTextarea: body.includes('txtScriptCode'),
                textareaMatch: (() => {
                    const m = body.match(/txtScriptCode[^>]*>([\s\S]{0,300})/);
                    return m ? m[0].substring(0, 200) : null;
                })(),
            };
        }
    });

    // Also capture the request
    let capturedRequest = null;
    page.on('request', (req) => {
        if (req.method() === 'POST' && req.url().includes('outsideprocessadmin')) {
            capturedRequest = {
                url: req.url(),
                headers: req.headers(),
                postDataLength: (req.postData() || '').length,
                postDataKeys: (() => {
                    const data = req.postData() || '';
                    const params = new URLSearchParams(data);
                    return Array.from(params.keys());
                })(),
                // Check for ScriptManager (async postback indicator)
                isAsyncPostback: (req.postData() || '').includes('ScriptManager'),
            };
        }
    });

    // Click the first link
    console.log('\nClicking first link...');
    await page.click(`#${firstLink.id}`);
    await page.waitForSelector('#ctl00_ContentBody_dockDetail_C_txtScriptCode', { state: 'attached', timeout: 15000 });
    console.log('Detail loaded.');

    // Show captured request/response
    if (capturedRequest) {
        console.log('\n=== Captured REQUEST ===');
        console.log(`URL: ${capturedRequest.url}`);
        console.log(`PostData length: ${capturedRequest.postDataLength}`);
        console.log(`PostData keys: ${capturedRequest.postDataKeys.join(', ')}`);
        console.log(`Is async postback: ${capturedRequest.isAsyncPostback}`);
        console.log(`Content-Type: ${capturedRequest.headers['content-type']}`);
    }

    if (capturedResponse) {
        console.log('\n=== Captured RESPONSE ===');
        console.log(`Status: ${capturedResponse.status}`);
        console.log(`Content-Type: ${capturedResponse.contentType}`);
        console.log(`Body length: ${capturedResponse.bodyLength}`);
        console.log(`Has textarea: ${capturedResponse.hasTextarea}`);
        console.log(`\nBody start:\n${capturedResponse.bodyStart}`);
        console.log(`\nTextarea match: ${capturedResponse.textareaMatch}`);
    }

    await browser.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
