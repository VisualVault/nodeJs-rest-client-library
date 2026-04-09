/**
 * Web Services (Microservices) component — extracts script source from outsideprocessadmin.
 *
 * Phase 1: API metadata via VVRestApi getOutsideProcesses()
 * Phase 2: Script source via Playwright dock panel extraction (response interception)
 */
const path = require('path');
const fs = require('fs');
const vvAdmin = require('../../helpers/vv-admin');
const vvSync = require('../../helpers/vv-sync');

const CATEGORY_MAP = { 0: 'Form', 1: 'Scheduled', 5: 'Workflow' };
const TEXTAREA_ID = 'ctl00_ContentBody_dockDetail_C_txtScriptCode';

module.exports = {
    name: 'scripts',
    adminSection: 'outsideprocessadmin',
    outputSubdir: 'web-services',

    /**
     * Fetch metadata via the VV REST API.
     */
    async fetchMetadata(page, config) {
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
        const res = await vv.outsideProcesses.getOutsideProcesses();
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        const items = parsed.data || parsed;
        if (!Array.isArray(items)) throw new Error('Bad API response from getOutsideProcesses');

        return items
            .map((i) => ({
                id: i.id,
                name: i.name,
                description: i.description || '',
                category: CATEGORY_MAP[i.processCategory] || `Unknown(${i.processCategory})`,
                categoryCode: i.processCategory,
                modifyDate: i.modifyDate,
                modifyBy: i.modifyBy,
                createDate: i.createDate,
                createBy: i.createBy,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Extract script source from outsideprocessadmin dock panels.
     *
     * @param {import('@playwright/test').Page} page - logged-in page
     * @param {object} config
     * @param {Array<object>} itemsToExtract - scripts needing extraction
     * @returns {Map<string, object>} name → {source, scriptId}
     */
    async extract(page, config, itemsToExtract) {
        const url = vvAdmin.adminUrl(config, 'outsideprocessadmin');
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });

        const info = await vvAdmin.getGridInfo(page);
        console.log(`  Grid: ${info}`);

        const targetNames = new Set(itemsToExtract.map((s) => s.name));
        const results = new Map();
        let pageNum = 0;

        while (pageNum < 30 && results.size < targetNames.size) {
            pageNum++;
            const links = await vvAdmin.getGridDetailLinks(page);
            const needed = links.filter((l) => targetNames.has(l.name) && !results.has(l.name));
            console.log(`  Page ${pageNum}: ${links.length} scripts, ${needed.length} to extract`);

            for (const link of needed) {
                process.stdout.write(`    ${link.name}...`);
                const data = await vvAdmin.extractDockPanelDetail(
                    page,
                    link.linkId,
                    TEXTAREA_ID,
                    'outsideprocessadmin',
                    {
                        extraFields: { scriptId: '[id*="lblScriptId"]' },
                    }
                );
                if (data && data.source !== null) {
                    results.set(link.name, data);
                    process.stdout.write(` OK (${(data.source.length / 1024).toFixed(1)} KB)\n`);
                } else {
                    process.stdout.write(` SKIP\n`);
                }
            }

            if (results.size >= targetNames.size) break;
            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
            if (!advanced) {
                console.log('  No more pages.');
                break;
            }
        }

        return results;
    },

    /**
     * Save extracted scripts as individual .js files.
     */
    save(outputDir, allItems, extracted, context) {
        const scriptsDir = path.join(outputDir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });
        if (context && context.scheduledScriptsDir) {
            fs.mkdirSync(context.scheduledScriptsDir, { recursive: true });
        }
        const today = new Date().toISOString().split('T')[0];
        let saved = 0;

        for (const [name, data] of extracted) {
            const meta = allItems.find((m) => m.name === name);
            const isScheduled = meta && meta.categoryCode === 1;
            const targetDir =
                isScheduled && context && context.scheduledScriptsDir ? context.scheduledScriptsDir : scriptsDir;
            const fn = vvSync.sanitizeFilename(name) + '.js';
            const hdr = [
                '/**',
                ` * ${name}`,
                meta ? ` * Category: ${meta.category}` : '',
                meta ? ` * Modified: ${meta.modifyDate} by ${meta.modifyBy}` : '',
                data.scriptId ? ` * Script ID: ${data.scriptId}` : '',
                ` * Extracted from WADNR (vv5dev/fpOnline) on ${today}`,
                ' */',
                '',
            ]
                .filter((l) => l !== '')
                .join('\n');
            fs.writeFileSync(path.join(targetDir, fn), hdr + data.source + '\n', 'utf8');
            saved++;
        }
        return saved;
    },

    /**
     * Generate README grouped by category.
     */
    generateReadme(outputDir, allItems, extractedNames) {
        const nonScheduled = allItems.filter((i) => i.categoryCode !== 1);
        const nonScheduledNames = new Set([...extractedNames].filter((n) => nonScheduled.some((i) => i.name === n)));
        vvSync.generateReadme(outputDir, {
            title: 'WADNR Web Services',
            subtitle: 'Extracted from outsideprocessadmin on vv5dev (WADNR/fpOnline)',
            items: nonScheduled,
            groupByField: 'category',
            columns: [
                {
                    header: 'Service Name',
                    field: 'name',
                    transform: (item) => {
                        const fn = vvSync.sanitizeFilename(item.name) + '.js';
                        return nonScheduledNames.has(item.name) ? `[${item.name}](./scripts/${fn})` : item.name;
                    },
                },
                {
                    header: 'Description',
                    field: 'description',
                    transform: (i) => (i.description || '').substring(0, 60),
                },
                {
                    header: 'Modified',
                    field: 'modifyDate',
                    transform: (i) => (i.modifyDate ? i.modifyDate.split('T')[0] : ''),
                },
                { header: 'Src', field: '_src', transform: (i) => (nonScheduledNames.has(i.name) ? 'Y' : '-') },
            ],
        });
    },
};
