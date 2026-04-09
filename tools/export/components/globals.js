/**
 * Global Functions component — extracts VV.Form.Global.* from FormViewer runtime.
 *
 * Different paradigm from grid-based components: opens a form in FormViewer,
 * then uses page.evaluate() + .toString() to introspect function source.
 * No admin grid or dock panel — direct runtime introspection.
 *
 * Tries up to MAX_TEMPLATE_ATTEMPTS templates to find one that populates
 * VV.Form.Global, with a shorter per-attempt timeout for faster fallback.
 */
const path = require('path');
const fs = require('fs');
const vvSync = require('../../helpers/vv-sync');

const MAX_TEMPLATE_ATTEMPTS = 5;
const PER_ATTEMPT_TIMEOUT = 20000; // 20s per template attempt

module.exports = {
    name: 'globals',
    adminSection: null, // No admin page — uses FormViewer
    outputSubdir: 'global-functions',

    /**
     * Fetch metadata by opening a form and introspecting VV.Form.Global.
     * This IS the extraction — metadata and source come from the same step.
     *
     * Tries multiple templates with short timeouts for reliability.
     * If config.globalsTemplate is set, tries that template first.
     */
    async fetchMetadata(page, config) {
        // Use REST API to find form templates
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

        let templates;
        try {
            const templatesRes = await vv.forms.getFormTemplates();
            const parsed = typeof templatesRes === 'string' ? JSON.parse(templatesRes) : templatesRes;
            templates = parsed.data || parsed;
            if (!Array.isArray(templates) || templates.length === 0) {
                console.log('  No form templates found via API. Skipping globals.');
                return [];
            }
        } catch (err) {
            console.log(`  API error fetching form templates: ${err.message}. Skipping globals.`);
            return [];
        }

        // If config specifies a preferred template, move it to front
        if (config.globalsTemplate) {
            const prefIdx = templates.findIndex(
                (t) => (t.name || '').toLowerCase() === config.globalsTemplate.toLowerCase()
            );
            if (prefIdx > 0) {
                const [pref] = templates.splice(prefIdx, 1);
                templates.unshift(pref);
                console.log(`  Preferred template: ${pref.name}`);
            }
        }

        // Pre-scan templates to find ones with records (more likely to load globals).
        // Check up to 10 templates, prioritize those with existing form instances.
        const candidates = [];
        const scanLimit = Math.min(10, templates.length);
        console.log(`  Scanning ${scanLimit} templates for form instances...`);
        for (let i = 0; i < scanLimit; i++) {
            const tmpl = templates[i];
            const formId = tmpl.id || tmpl.revisionId;
            let dataId = null;
            try {
                const recordsRes = await vv.forms.getForms({}, formId);
                const parsed = typeof recordsRes === 'string' ? JSON.parse(recordsRes) : recordsRes;
                const records = parsed.data || parsed;
                if (Array.isArray(records) && records.length > 0) {
                    dataId = records[0].revisionId || records[0].instanceId || records[0].dataId;
                }
            } catch {
                // No records
            }
            candidates.push({ tmpl, dataId });
        }

        // Sort: templates with records first (they load a real form with globals)
        candidates.sort((a, b) => (b.dataId ? 1 : 0) - (a.dataId ? 1 : 0));
        const withRecords = candidates.filter((c) => c.dataId).length;
        console.log(`  Found ${withRecords}/${scanLimit} templates with records`);

        // Try templates until one populates VV.Form.Global
        const attemptsMax = Math.min(MAX_TEMPLATE_ATTEMPTS, candidates.length);
        for (let attempt = 0; attempt < attemptsMax; attempt++) {
            const { tmpl, dataId } = candidates[attempt];
            const formId = tmpl.id || tmpl.revisionId;
            const xcid = config.customerAlias;
            const xcdid = config.databaseAlias;
            const tmplName = tmpl.name || formId;

            console.log(
                `  Attempt ${attempt + 1}/${attemptsMax}: template "${tmplName}"${dataId ? ' (has records)' : ''}`
            );

            // Build FormViewer URL
            let fvUrl;
            if (dataId) {
                fvUrl = `${config.baseUrl}/FormViewer/app?DataID=${dataId}&hidemenu=true&rOpener=1&xcid=${xcid}&xcdid=${xcdid}`;
            } else {
                fvUrl = `${config.baseUrl}/FormViewer/app?formid=${formId}&hidemenu=true&xcid=${xcid}&xcdid=${xcdid}`;
            }

            try {
                await page.goto(fvUrl, { waitUntil: 'networkidle', timeout: 60000 });
                await page.waitForFunction(
                    () => {
                        try {
                            return (
                                typeof VV !== 'undefined' &&
                                VV.Form &&
                                VV.Form.Global &&
                                Object.keys(VV.Form.Global).length > 0
                            );
                        } catch {
                            return false;
                        }
                    },
                    null,
                    { timeout: PER_ATTEMPT_TIMEOUT }
                );

                // Success — extract all globals
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

                console.log(
                    `  Found ${data.length} globals (${data.filter((d) => d.type === 'function').length} functions) via "${tmplName}"`
                );
                return data;
            } catch (err) {
                console.log(`  Template "${tmplName}" failed: ${err.message}`);
                if (attempt < attemptsMax - 1) {
                    console.log('  Trying next template...');
                }
            }
        }

        console.log(`  All ${attemptsMax} template attempts failed. No globals extracted.`);
        return [];
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
                ` * Extracted: ${today}`,
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
            title: 'Global Functions',
            subtitle: 'Extracted from VV.Form.Global',
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
