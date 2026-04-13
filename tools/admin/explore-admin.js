#!/usr/bin/env node
/**
 * Explore a VV admin page to discover toolbar buttons, dock panel fields,
 * and postback targets. Works with any admin section.
 *
 * Usage:
 *   node tools/admin/explore-admin.js --project emanueljofre --section scheduleradmin
 *   node tools/admin/explore-admin.js --project emanueljofre --section outsideprocessadmin
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const vvAdmin = require('../helpers/vv-admin');

const cliArgs = process.argv.slice(2);
const HEADLESS = !cliArgs.includes('--headed');

function getArg(flag) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
}

const PROJECT_NAME = getArg('--project');
const SECTION = getArg('--section');

if (!PROJECT_NAME || !SECTION) {
    console.error('Usage: node tools/admin/explore-admin.js --project <name> --section <adminSection>');
    process.exit(1);
}

async function main() {
    const match = vvAdmin.findCustomer(PROJECT_NAME);
    if (!match) {
        console.error(`No customer "${PROJECT_NAME}" in .env.json`);
        process.exit(1);
    }

    const config = vvAdmin.loadEnvConfig(match.server, match.customer);
    const browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage();

    try {
        await vvAdmin.login(page, config);
        const url = vvAdmin.adminUrl(config, SECTION);
        console.log(`Navigating to: ${url}\n`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // 1. Toolbar buttons (Telerik RadToolBar items)
        const toolbar = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.rtbItem a.StandardToolBarButton, .rtbItem a.rtbWrap')).map(
                (a) => ({
                    text: a.textContent.trim(),
                    title: a.getAttribute('title') || '',
                    href: a.getAttribute('href') || '',
                    className: a.className,
                })
            );
        });
        console.log('=== Toolbar buttons ===');
        toolbar.forEach((t) => console.log(`  "${t.text}" title="${t.title}"`));

        // 2. Dock panel form fields
        const dockFields = await page.evaluate(() => {
            return Array.from(
                document.querySelectorAll(
                    '[id*="dockDetail"] input, [id*="dockDetail"] select, [id*="dockDetail"] textarea'
                )
            )
                .filter((el) => el.type !== 'hidden')
                .map((el) => ({
                    tag: el.tagName,
                    type: el.type || '',
                    id: el.id || '',
                    value: (el.value || '').substring(0, 80),
                    options:
                        el.tagName === 'SELECT'
                            ? Array.from(el.options).map((o) => ({ value: o.value, text: o.text }))
                            : undefined,
                }));
        });
        console.log('\n=== Dock panel visible fields ===');
        dockFields.forEach((f) => {
            const shortId = f.id.replace('ctl00_ContentBody_dockDetail_C_', '');
            console.log(`  [${f.tag}/${f.type}] ${shortId}  value="${f.value}"`);
            if (f.options) f.options.forEach((o) => console.log(`    option: ${o.value} = "${o.text}"`));
        });

        // 3. All dock panel elements (including hidden) for completeness
        const allDock = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[id*="dockDetail"] *'))
                .filter((el) => el.id && el.children.length === 0)
                .map((el) => ({
                    tag: el.tagName,
                    id: el.id.replace('ctl00_ContentBody_dockDetail_C_', ''),
                    text: (el.textContent || '').trim().substring(0, 80),
                    type: el.type || el.getAttribute('type') || '',
                }))
                .filter((el) => !el.id.includes('ClientState'));
        });
        console.log('\n=== All dock panel leaf elements ===');
        allDock.forEach((el) => console.log(`  [${el.tag}] ${el.id}  ${el.text ? `"${el.text}"` : ''}`));

        // 4. Grid columns
        const headers = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.rgMasterTable thead th')).map((th, i) => ({
                index: i,
                text: th.textContent.trim(),
            }));
        });
        console.log('\n=== Grid columns ===');
        headers.forEach((h) => console.log(`  [${h.index}] "${h.text}"`));

        // 5. Screenshot
        const screenshotPath = path.resolve(__dirname, '..', '..', 'testing', 'tmp', `explore-${SECTION}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`\nScreenshot: ${screenshotPath}`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
