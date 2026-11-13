// T2: round trip against a real local VVCore. Skipped unless settings are present.
//
// Settings come from the environment or from .scratch/pre-m1-round-trip/vvcore.env (KEY=VALUE lines;
// that folder is git-ignored, so keys stay out of git). See vvcore.env.example next to this file.
//
//   T2a  VVCore /Scripts?name=X for each RT_LEGACY_ONDEMAND name, first through the baseline server,
//        then through this branch, both on RT_NODE_PORT (where your developer node override points).
//   T2c  Direct dispatch to Node, shaped like VVCore and the Worker, baseUrl = your VVCore.
//   T2d  Run-as user: scripts without getCredentials, runContext.secrets = RT_RUNAS_* key.
//   T2e  v2 scripts in T2c and T2d.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const h = require('./harness');

function loadSettings() {
    const file = path.join(h.repoRoot, '.scratch', 'pre-m1-round-trip', 'vvcore.env');
    const settings = {};

    if (fs.existsSync(file)) {
        fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
            const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);

            if (match && match[2] !== '') {
                settings[match[1]] = match[2];
            }
        });
    }

    Object.keys(process.env).filter((k) => k.indexOf('RT_') === 0).forEach((k) => { settings[k] = process.env[k]; });

    return settings;
}

const cfg = loadSettings();
const enabled = Boolean(cfg.RT_VVCORE_URL && cfg.RT_CUSTOMER && cfg.RT_DATABASE && cfg.RT_SCRIPT_CLIENT_ID);
const runAsEnabled = enabled && Boolean(cfg.RT_RUNAS_CLIENT_ID && cfg.RT_RUNAS_CLIENT_SECRET);
const fakeStudio = cfg.RT_STUDIOAPI_FAKE === '1';
const legacyNames = (cfg.RT_LEGACY_ONDEMAND || '').split(',').map((s) => s.trim()).filter(Boolean);

const localDir = path.join(__dirname, 'scripts', 'legacy-local');
const localScripts = fs.existsSync(localDir) ? fs.readdirSync(localDir).filter((f) => f.endsWith('.js')) : [];

const vvcoreUrl = (cfg.RT_VVCORE_URL || '').replace(/\/$/, '');
const nodePort = Number(cfg.RT_NODE_PORT || 3000);
const DIRECT_PORT = 3930;
const directUrl = 'http://localhost:' + DIRECT_PORT;
const FAKE_PORT = 3901;

const scriptCreds = {
    customerAlias: cfg.RT_CUSTOMER,
    databaseAlias: cfg.RT_DATABASE,
    userId: cfg.RT_SCRIPT_USER || cfg.RT_SCRIPT_CLIENT_ID,
    password: cfg.RT_SCRIPT_PASSWORD || cfg.RT_SCRIPT_CLIENT_SECRET,
    clientId: cfg.RT_SCRIPT_CLIENT_ID,
    clientSecret: cfg.RT_SCRIPT_CLIENT_SECRET
};

const runContext = {
    version: 1,
    secrets: {
        clientId: cfg.RT_RUNAS_CLIENT_ID,
        clientSecret: cfg.RT_RUNAS_CLIENT_SECRET,
        customerAlias: cfg.RT_CUSTOMER,
        databaseAlias: cfg.RT_DATABASE
    }
};

const placeholders = {
    CUSTOMER_ALIAS: scriptCreds.customerAlias,
    DATABASE_ALIAS: scriptCreds.databaseAlias,
    SCRIPT_USER: scriptCreds.userId,
    SCRIPT_PASSWORD: scriptCreds.password,
    SCRIPT_CLIENT_ID: scriptCreds.clientId,
    SCRIPT_CLIENT_SECRET: scriptCreds.clientSecret,
    RUN_SECONDS: 0,
    GET_CREDENTIALS: ''
};

const appJs = path.join(h.repoRoot, 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'app.js');
let baselineAppJs;
let direct;
let fake;
let markerDir;
const outputs = [];
let markerCount = 0;

function script(name, extra) {
    const marker = name + '-vvcore-' + (++markerCount);

    return {
        text: h.renderScript(name, Object.assign({ MARKER: marker }, placeholders, extra || {})),
        ran: () => fs.existsSync(path.join(markerDir, marker))
    };
}

async function waitForOutput(handle, text, timeoutMs) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (handle.output().indexOf(text) > -1) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error('Timed out waiting for "' + text + '" in server output:\n' + handle.output().slice(-3000));
}

async function vvcoreClient() {
    const { Authorize } = require('visualvault-api');

    return new Authorize().getVaultApi(scriptCreds.clientId, scriptCreds.clientSecret, scriptCreds.userId, scriptCreds.password, null, vvcoreUrl, cfg.RT_CUSTOMER, cfg.RT_DATABASE);
}

// The parts of a VVCore /Scripts response that differ on every call.
function normalize(body) {
    const copy = JSON.parse(JSON.stringify(body));

    if (copy && copy.meta) {
        delete copy.meta.executionId;
    }

    return copy;
}

describe.skipIf(!enabled)('local VVCore', () => {
    beforeAll(async () => {
        markerDir = h.makeTempDir('rt-vvcore-marker-');

        const baselineDir = h.makeTempDir('rt-vvcore-baseline-');

        execSync('git archive ' + (cfg.RT_BASELINE_REF || 'master') + ' lib/VVRestApi | tar -x -C "' + baselineDir + '"', { cwd: h.repoRoot });
        fs.symlinkSync(path.join(h.repoRoot, 'node_modules'), path.join(baselineDir, 'node_modules'));
        baselineAppJs = path.join(baselineDir, 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'app.js');

        direct = await h.startServer(appJs, DIRECT_PORT, h.makeTempDir('rt-vvcore-log-'), markerDir);
        outputs.push(direct);

        if (fakeStudio) {
            const child = require('child_process');

            fake = await new Promise((resolve, reject) => {
                let out = '';
                const p = child.spawn(process.execPath, [path.join(__dirname, 'fake-vv.js')], {
                    env: Object.assign({}, process.env, { FAKE_VV_PORT: String(FAKE_PORT), FAKE_VV_HOST: '0.0.0.0', FAKE_ACCEPT_ANY_BEARER: '1' })
                });

                p.stdout.on('data', (d) => { out += d; if (out.indexOf('listening') > -1) { resolve({ stop: () => p.kill() }); } });
                p.once('exit', (code) => reject(new Error('fake exited ' + code + ': ' + out)));
            });
        }
    }, 60000);

    afterAll(async () => {
        await direct?.stop();
        fake?.stop();
    });

    it.skipIf(legacyNames.length === 0).each(legacyNames)('T2a: VVCore /Scripts?name=%s matches baseline', async (name) => {
        const fields = JSON.parse(cfg.RT_LEGACY_ONDEMAND_FIELDS || '[]');
        const results = {};

        for (const [label, entry] of [['baseline', baselineAppJs], ['branch', appJs]]) {
            const server = await h.startServer(entry, nodePort, h.makeTempDir('rt-vvcore-t2a-'), markerDir);

            outputs.push(server);

            try {
                const client = await vvcoreClient();

                results[label] = JSON.parse(await client.scripts.runWebService(name, fields));
            } finally {
                await server.stop();
            }

            expect(server.output(), label + ' server was not called: is your developer node override set to http://localhost:' + nodePort + '?').toContain('scripts');
        }

        console.log('T2a ' + name + ' baseline: ' + JSON.stringify(results.baseline).slice(0, 500));
        console.log('T2a ' + name + ' branch:   ' + JSON.stringify(results.branch).slice(0, 500));
        expect(normalize(results.branch)).toEqual(normalize(results.baseline));
    }, 120000);

    // Gate 2 with real scripts: each file in scripts/legacy-local/ goes straight to a baseline and a
    // branch server with baseUrl = your VVCore. Names containing "scheduled" go to /scheduledscripts
    // (multipart, a dummy token), the rest to /scripts. Both servers must stay up and answer alike.
    it.skipIf(localScripts.length === 0).each(localScripts)('T2b: local script %s, direct, baseline vs branch', async (file) => {
        const text = fs.readFileSync(path.join(localDir, file), 'utf8');
        const scheduled = /scheduled/i.test(file);
        const id = 'rtLocalVv' + file.replace(/\W/g, '');
        const results = {};

        for (const [label, entry, port] of [['baseline', baselineAppJs, 3932], ['branch', appJs, 3933]]) {
            const server = await h.startServer(entry, port, h.makeTempDir('rt-vvcore-t2b-'), markerDir);
            const url = 'http://localhost:' + port;

            outputs.push(server);

            try {
                results[label] = scheduled
                    ? await h.postScheduledMultipart(url, id, { script: text, baseUrl: vvcoreUrl, token: '00000000-0000-0000-0000-000000000000' })
                    : await h.postKeyValueJson(url, 'scripts', id, { script: text, baseUrl: vvcoreUrl, fields: [] }).catch((e) => ({ error: e.message }));

                await new Promise((resolve) => setTimeout(resolve, 3000));
                results[label].serverExited = server.child.exitCode !== null;
            } catch (e) {
                results[label] = { error: e.message, serverExited: server.child.exitCode !== null };
            } finally {
                if (results[label].serverExited) {
                    console.log('T2b ' + file + ' ' + label + ' server exited:\n' + server.output().split('\n').filter((l) => /Error|throw|at /.test(l)).slice(0, 12).join('\n'));
                }

                await server.stop();
            }
        }

        console.log('T2b ' + file + ' baseline: ' + JSON.stringify(results.baseline.body ?? results.baseline).slice(0, 300));
        console.log('T2b ' + file + ' branch:   ' + JSON.stringify(results.branch.body ?? results.branch).slice(0, 300));
        expect(results.branch.serverExited, 'the branch server exited').toBe(false);
        expect(results.branch.body).toEqual(results.baseline.body);
    }, 120000);

    it('T2c: legacy on-demand script, direct, script credentials', async () => {
        const s = script('legacy-ondemand');
        const res = await h.postKeyValueJson(directUrl, 'scripts', 'rtVvcoreLegacy', { script: s.text, baseUrl: vvcoreUrl, fields: [{ name: 'Name', value: 'Alice' }] });

        console.log('T2c legacy on-demand: ' + JSON.stringify(res.body));
        expect(res.headers['vv-identity-source']).toBe('script-credentials');
        expect(res.body[0].value.find((step) => step.step === 'getUser').status).toBe(200);
    });

    it('T2c: completionTarget=studioapi is acknowledged and the Completion uses a VVCore JWT', async () => {
        const s = script('v2-scheduled', { GET_CREDENTIALS: h.getCredentialsExport(scriptCreds) });
        const token = 'rt-vvcore-' + Date.now();
        const res = await h.postScheduledMultipart(directUrl, 'rtVvcoreTarget', { script: s.text, baseUrl: vvcoreUrl, token: token, completionTarget: 'studioapi' });

        expect(res.headers['vv-completion-target']).toBe('studioapi');
        expect(res.headers['vv-identity-source']).toBe('script-credentials');

        if (fakeStudio) {
            const [completion] = await h.fakeClient('http://localhost:' + FAKE_PORT).waitFor((c) => c.kind === 'studioapi-completion' && c.runToken === token, 20000);

            expect(completion.tokenKind).toBe('vvcore-jwt');
        } else {
            // Without the fake, the Completion goes to whatever studioApiUrl VVCore's configuration
            // names (finding F1). The script logs the outcome either way.
            await waitForOutput(direct, token, 20000);
            console.log('T2c Completion without the fake StudioApi:\n' + direct.output().split('\n').filter((l) => l.indexOf(token) > -1 || l.indexOf('completion failed') > -1).join('\n'));
        }
    }, 60000);

    it('T2c: identity-missing never reaches VVCore', async () => {
        const s = script('no-identity');
        const res = await h.postKeyValueJson(directUrl, 'scripts', 'rtVvcoreNoId', { script: s.text, baseUrl: vvcoreUrl });

        expect(res.body).toMatchObject({ code: 400, error: 'identity-missing' });
        expect(s.ran()).toBe(false);
    });

    describe.skipIf(!runAsEnabled)('Run-as user', () => {
        it('T2d/T2e: v2 on-demand script runs as the Run-as user', async () => {
            const s = script('v2-ondemand');
            const res = await h.postKeyValueJson(directUrl, 'scripts', 'rtVvcoreRunAs', {
                script: s.text, baseUrl: vvcoreUrl, runContext: runContext, fields: [{ name: 'Name', value: 'Bob' }]
            });

            console.log('T2d on-demand: ' + JSON.stringify(res.body));
            expect(res.headers['vv-identity-source']).toBe('run-as-user');
            expect(res.body).toEqual([
                { name: 'status', value: 200 },
                { name: 'nativePromise', value: true },
                { name: 'echo', value: 'Bob' }
            ]);
        });

        it('T2d/T2e: v2 scheduled script runs as the Run-as user for RT_LONG_RUN_SECONDS', async () => {
            const seconds = Number(cfg.RT_LONG_RUN_SECONDS || 20);
            const s = script('v2-scheduled', { RUN_SECONDS: seconds });
            const token = 'rt-vvcore-runas-' + Date.now();
            const fields = { script: s.text, baseUrl: vvcoreUrl, token: token, runContext: runContext };

            if (fakeStudio) {
                fields.completionTarget = 'studioapi';
            }

            const res = await h.postScheduledMultipart(directUrl, 'rtVvcoreRunAsSched', fields);

            expect(res.headers['vv-identity-source']).toBe('run-as-user');
            await waitForOutput(direct, 'v2 scheduled summary token=' + token, (seconds + 60) * 1000);
            expect(direct.output()).toMatch(new RegExp('v2 scheduled summary token=' + token + ' calls=\\d+ failures=0'));

            if (fakeStudio) {
                await h.fakeClient('http://localhost:' + FAKE_PORT).waitFor((c) => c.kind === 'studioapi-completion' && c.runToken === token, 20000);
            }
        }, 30 * 60 * 1000);
    });

    it('no server log holds the Run-as key', () => {
        const everything = outputs.map((o) => o.output()).join('\n');

        if (cfg.RT_RUNAS_CLIENT_SECRET) {
            expect(everything).not.toContain(cfg.RT_RUNAS_CLIENT_SECRET);
            expect(everything).not.toContain(cfg.RT_RUNAS_CLIENT_ID);
        }
    });
});
