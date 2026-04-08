/**
 * Global Functions component — extracts VV.Form.Global.* from FormViewer runtime.
 *
 * Different paradigm from grid-based components: opens a form in FormViewer,
 * then uses page.evaluate() + .toString() to introspect function source.
 * No admin grid or dock panel — direct runtime introspection.
 */
const path = require('path');
const fs = require('fs');
const vvAdmin = require('../../helpers/vv-admin');
const vvSync = require('../../helpers/vv-sync');

module.exports = {
    name: 'globals',
    adminSection: null, // No admin page — uses FormViewer
    outputSubdir: 'global-functions',

    /**
     * Fetch metadata by opening a form and introspecting VV.Form.Global.
     * This IS the extraction — metadata and source come from the same step.
     */
    async fetchMetadata(page, config) {
        // Discover a form record via the dashboard list
        const dashUrl = vvAdmin.adminUrl(config, 'formdata');
        await page.goto(dashUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // Find a FormDataDetails link
        const dashLink = await page.evaluate(() => {
            const links = document.querySelectorAll('a[href*="FormDataDetails"]');
            for (const a of links) {
                if (!a.className.includes('rmLink') || links.length === 1) {
                    return a.getAttribute('href');
                }
            }
            // Fallback to any FormDataDetails link
            return links.length > 0 ? links[0].getAttribute('href') : null;
        });

        if (!dashLink) throw new Error('No dashboard link found');
        const fullUrl = new URL(dashLink, config.baseUrl).href;
        await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // Get a DataID from the first record
        const record = await page.evaluate(() => {
            const cb = document.querySelector('.rgMasterTable tbody input[type="checkbox"][dhid]');
            return cb ? { dataId: cb.getAttribute('dhid') } : null;
        });
        if (!record) throw new Error('No records with DataID found');

        // Discover xcid/xcdid
        const guids = await page.evaluate(() => {
            const all = document.querySelectorAll('a[href], [onclick]');
            for (const el of all) {
                const text = (el.getAttribute('href') || '') + (el.getAttribute('onclick') || '');
                const xc = text.match(/xcid=([a-f0-9-]+)/i);
                const xcd = text.match(/xcdid=([a-f0-9-]+)/i);
                if (xc && xcd) return { xcid: xc[1], xcdid: xcd[1] };
            }
            const scripts = document.querySelectorAll('script');
            for (const s of scripts) {
                const src = s.textContent || '';
                const xc = src.match(
                    /xcid['":\s]*=?\s*['"]?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
                );
                const xcd = src.match(
                    /xcdid['":\s]*=?\s*['"]?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
                );
                if (xc && xcd) return { xcid: xc[1], xcdid: xcd[1] };
            }
            return null;
        });
        if (!guids) throw new Error('Could not discover xcid/xcdid');

        // Open FormViewer
        const fvUrl = `${config.baseUrl}/FormViewer/app?DataID=${record.dataId}&hidemenu=true&rOpener=1&xcid=${guids.xcid}&xcdid=${guids.xcdid}`;
        console.log(`  Opening FormViewer...`);
        await page.goto(fvUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForFunction(
            () => {
                try {
                    return (
                        typeof VV !== 'undefined' && VV.Form && VV.Form.Global && Object.keys(VV.Form.Global).length > 0
                    );
                } catch {
                    return false;
                }
            },
            { timeout: 90000 }
        );

        // Extract all globals
        const data = await page.evaluate(() => {
            const globals = VV.Form.Global;
            return Object.keys(globals).map((key) => {
                const val = globals[key];
                return {
                    name: key,
                    type: typeof val,
                    source: typeof val === 'function' ? val.toString() : null,
                    params: typeof val === 'function' ? val.length : 0,
                    value: typeof val !== 'function' ? JSON.stringify(val) : null,
                };
            });
        });

        console.log(`  Found ${data.length} globals (${data.filter((d) => d.type === 'function').length} functions)`);
        return data;
    },

    /**
     * No separate extraction — fetchMetadata returns everything.
     */
    extract: null,

    /**
     * Save each function as an individual .js file.
     */
    save(outputDir, items) {
        fs.mkdirSync(outputDir, { recursive: true });
        const today = new Date().toISOString().split('T')[0];
        let saved = 0;

        for (const item of items) {
            if (item.type !== 'function' || !item.source) continue;
            const fn = `${item.name}.js`;
            const hdr = [
                '/**',
                ` * VV.Form.Global.${item.name}`,
                ` * Parameters: ${item.params}`,
                ` * Extracted from WADNR (vv5dev/fpOnline) on ${today}`,
                ' */',
                '',
            ].join('\n');
            fs.writeFileSync(path.join(outputDir, fn), hdr + item.source + '\n', 'utf8');
            saved++;
        }
        return saved;
    },

    /**
     * Generate README index.
     */
    generateReadme(outputDir, items) {
        const functions = items.filter((i) => i.type === 'function');
        const nonFunctions = items.filter((i) => i.type !== 'function');

        vvSync.generateReadme(outputDir, {
            title: 'WADNR Global Functions',
            subtitle: 'Extracted from VV.Form.Global on vv5dev (WADNR/fpOnline)',
            items: functions,
            columns: [
                { header: 'Function', field: 'name', transform: (i) => `[${i.name}](./${i.name}.js)` },
                { header: 'Params', field: 'params' },
                { header: 'Size', field: '_size', transform: (i) => `${(i.source.length / 1024).toFixed(1)} KB` },
            ],
        });

        // Append non-function properties
        if (nonFunctions.length > 0) {
            const readmePath = path.join(outputDir, 'README.md');
            const extra = [
                '## Non-Function Properties',
                '',
                '| Name | Type | Value |',
                '| :--- | :--- | :---- |',
                ...nonFunctions.map((i) => `| ${i.name} | ${i.type} | \`${(i.value || '').substring(0, 80)}\` |`),
                '',
            ].join('\n');
            fs.appendFileSync(readmePath, extra, 'utf8');
        }
    },
};
