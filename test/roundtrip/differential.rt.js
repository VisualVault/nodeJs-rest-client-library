// T1b: the same legacy requests through the baseline server (default `master`: embedded v1.2.0
// client) and through this branch, against the same fake VV API. The response body and the VV API
// calls a script makes must match: "the response matches the response before the release".
// Baseline ref: RT_BASELINE_REF (default master).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const h = require('./harness');

const FAKE_PORT = 3911;
// 127.0.0.1, not localhost: the baseline client's DNS failover resolves names with a DNS A query, which
// cannot resolve localhost.
const fakeUrl = 'http://127.0.0.1:' + FAKE_PORT;
const vv = h.fakeClient(fakeUrl);
const baselineRef = process.env.RT_BASELINE_REF || 'master';

const placeholders = {
    CUSTOMER_ALIAS: 'rt-customer',
    DATABASE_ALIAS: 'rt-database',
    SCRIPT_USER: 'script-user',
    SCRIPT_PASSWORD: 'script-password',
    SCRIPT_CLIENT_ID: 'script-client',
    SCRIPT_CLIENT_SECRET: 'script-secret',
    MARKER: 'differential'
};

const servers = {};
let fake;

// The calls a script makes, without what differs by design: token values, timing, and the session
// setup the 2.x client adds at login (configuration and getjwt calls).
function scriptCalls(calls) {
    return calls
        .filter((c) => c.kind === 'vv-api' || c.kind === 'vvcore-completion' || c.kind === 'studioapi-completion' || c.kind === 'vv-api-unauthorized')
        .map((c) => ({ kind: c.kind, method: c.method, path: c.path.toLowerCase(), query: c.query, body: c.body }));
}

async function runOn(serverName, send, settleMs) {
    await vv.reset();

    const res = await send(servers[serverName].url);

    await new Promise((resolve) => setTimeout(resolve, settleMs || 1500));

    return { body: res.body, status: res.status, calls: scriptCalls(await vv.calls()), allCalls: await vv.calls() };
}

beforeAll(async () => {
    const baselineDir = h.makeTempDir('rt-baseline-');

    execSync('git archive ' + baselineRef + ' lib/VVRestApi | tar -x -C "' + baselineDir + '"', { cwd: h.repoRoot });
    fs.symlinkSync(path.join(h.repoRoot, 'node_modules'), path.join(baselineDir, 'node_modules'));

    fake = await h.startFakeVv(FAKE_PORT);

    const targets = {
        baseline: { appJs: path.join(baselineDir, 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'app.js'), port: 3912 },
        branch: { appJs: path.join(h.repoRoot, 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'app.js'), port: 3910 }
    };

    for (const name of Object.keys(targets)) {
        const t = targets[name];
        const handle = await h.startServer(t.appJs, t.port, h.makeTempDir('rt-log-' + name + '-'), h.makeTempDir('rt-marker-'));

        servers[name] = { handle: handle, url: 'http://localhost:' + t.port };
    }
});

afterAll(async () => {
    for (const s of Object.values(servers)) {
        await s.handle.stop();
    }

    await fake?.stop();
});

const cases = [
    {
        name: 'legacy scheduled, multipart (TaskService shape)',
        send: (url) => h.postScheduledMultipart(url, 'rtDiffSched', { script: h.renderScript('legacy-scheduled', placeholders), baseUrl: fakeUrl, token: 'diff-token' })
    },
    {
        name: 'legacy on-demand, Key/Value JSON (VV API /Scripts shape)',
        send: (url) => h.postKeyValueJson(url, 'scripts', 'rtDiffOnDemand', {
            script: h.renderScript('legacy-ondemand', placeholders),
            baseUrl: fakeUrl,
            fields: [{ name: 'Name', value: 'Alice' }]
        })
    },
    {
        name: 'legacy scheduled that requires ../VVRestApi',
        send: (url) => h.postScheduledMultipart(url, 'rtDiffEmbedded', { script: h.renderScript('legacy-embedded-require', placeholders), baseUrl: fakeUrl, token: 'diff-embedded' })
    },
    {
        name: 'bad body: no script',
        send: (url) => h.postKeyValueJson(url, 'scripts', 'rtDiffBad', { baseUrl: fakeUrl })
    }
];

// User-supplied legacy scripts for gate 2: drop .js files into test/roundtrip/scripts/legacy-local/.
// They run as on-demand scripts unless the file name contains "scheduled".
const localDir = path.join(__dirname, 'scripts', 'legacy-local');

if (fs.existsSync(localDir)) {
    fs.readdirSync(localDir).filter((f) => f.endsWith('.js')).forEach((file) => {
        const text = fs.readFileSync(path.join(localDir, file), 'utf8');
        const id = 'rtLocal' + file.replace(/\W/g, '');

        cases.push({
            name: 'local script ' + file,
            send: /scheduled/i.test(file)
                ? (url) => h.postScheduledMultipart(url, id, { script: text, baseUrl: fakeUrl, token: 'local-token' })
                : (url) => h.postKeyValueJson(url, 'scripts', id, { script: text, baseUrl: fakeUrl, fields: [] })
        });
    });
}

describe('baseline vs branch', () => {
    it.each(cases)('$name', async (c) => {
        const before = await runOn('baseline', c.send);
        const after = await runOn('branch', c.send).catch((e) => ({ error: e.message }));

        expect(servers.branch.handle.child.exitCode, 'the branch server exited:\n' + servers.branch.handle.output().slice(-1500)).toBeNull();

        expect(after.status).toBe(before.status);
        expect(after.body).toEqual(before.body);
        expect(after.calls).toEqual(before.calls);
    });
});
