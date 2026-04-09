/**
 * Global Functions component — extracts VV.Form.Global.* from FormViewer runtime.
 *
 * Different paradigm from grid-based components: opens a form in FormViewer,
 * then uses page.evaluate() + .toString() to introspect function source.
 * No admin grid or dock panel — direct runtime introspection.
 */
const path = require('path');
const fs = require('fs');
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
        // Use REST API to find a form template + record, then open FormViewer directly.
        // This avoids navigating admin dashboards entirely.
        console.log('  Discovering form templates via API...');
        const clientLib = require(
            path.join(__dirname, '..', '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi')
        );
        const auth = new clientLib.authorize();
        auth.readOnly = true;
        const vv = await auth.getVaultApi(
            config.clientId,
            config.clientSecret,
            config.username,
            config.password,
            config.audience,
            config.baseUrl,
            config.customerAlias,
            config.databaseAlias
        );

        // Get form templates to find xcid/xcdid
        let formId, xcid, xcdid;
        try {
            const templatesRes = await vv.forms.getFormTemplates();
            const parsed = typeof templatesRes === 'string' ? JSON.parse(templatesRes) : templatesRes;
            const templates = parsed.data || parsed;
            if (!Array.isArray(templates) || templates.length === 0) {
                console.log('  No form templates found via API. Skipping globals.');
                return [];
            }
            // Use the first template
            const tmpl = templates[0];
            formId = tmpl.id || tmpl.revisionId;
            xcid = tmpl.customerId;
            xcdid = tmpl.customerDatabaseId;
            console.log(`  Using template: ${tmpl.name || formId}`);
        } catch (err) {
            console.log(`  API error fetching form templates: ${err.message}. Skipping globals.`);
            return [];
        }

        // Get a record from that template
        let dataId;
        try {
            const recordsRes = await vv.forms.getFormInstances(formId, { limit: 1 });
            const parsed = typeof recordsRes === 'string' ? JSON.parse(recordsRes) : recordsRes;
            const records = parsed.data || parsed;
            if (Array.isArray(records) && records.length > 0) {
                dataId = records[0].revisionId || records[0].instanceId || records[0].dataId;
            }
        } catch {
            // If no records, use the template URL (creates new instance)
        }

        // Build FormViewer URL — use template URL if no existing record
        let fvUrl;
        if (dataId) {
            fvUrl = `${config.baseUrl}/FormViewer/app?DataID=${dataId}&hidemenu=true&rOpener=1&xcid=${xcid}&xcdid=${xcdid}`;
        } else {
            fvUrl = `${config.baseUrl}/FormViewer/app?formid=${formId}&hidemenu=true&xcid=${xcid}&xcdid=${xcdid}`;
            console.log('  No existing records — loading template (creates new instance)');
        }
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
