// T1: round trip through the real Node script server and the real visualvault-api client, against
// the fake VV API and fake StudioApi. Covers the Pre-M1 story scenarios (ADO 30781) that do not need
// a deployed lab. Run: npm run test:roundtrip
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const h = require('./harness');

const FAKE_PORT = 3901;
const SERVER_PORT = 3900;
const fakeUrl = 'http://localhost:' + FAKE_PORT;
const nodeUrl = 'http://localhost:' + SERVER_PORT;
const appJs = path.join(h.repoRoot, 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'app.js');

const scriptCreds = {
    customerAlias: 'rt-customer',
    databaseAlias: 'rt-database',
    userId: 'script-user',
    password: 'script-password',
    clientId: 'script-client',
    clientSecret: 'script-secret'
};

const RUN_AS_KEY = 'runas-key-id-7f3a';
const RUN_AS_SECRET = 'runas-secret-9c41e2';

const runContext = {
    version: 1,
    secrets: { clientId: RUN_AS_KEY, clientSecret: RUN_AS_SECRET, customerAlias: 'rt-customer', databaseAlias: 'rt-database' }
};

const placeholders = {
    CUSTOMER_ALIAS: scriptCreds.customerAlias,
    DATABASE_ALIAS: scriptCreds.databaseAlias,
    SCRIPT_USER: scriptCreds.userId,
    SCRIPT_PASSWORD: scriptCreds.password,
    SCRIPT_CLIENT_ID: scriptCreds.clientId,
    SCRIPT_CLIENT_SECRET: scriptCreds.clientSecret,
    RUN_SECONDS: 0
};

let fake;
let server;
let logDir;
let markerDir;
let markerCount = 0;
const vv = h.fakeClient(fakeUrl);

function script(name, extra) {
    const marker = name + '-' + (++markerCount);
    const text = h.renderScript(name, Object.assign({ MARKER: marker, GET_CREDENTIALS: '' }, placeholders, extra || {}));

    return { text: text, ran: () => fs.existsSync(path.join(markerDir, marker)) };
}

function withCredentials() {
    return { GET_CREDENTIALS: h.getCredentialsExport(scriptCreds) };
}

const passwordLogins = (calls) => calls.filter((c) => c.kind === 'oauth' && c.grant === 'password').map((c) => c.username);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
    logDir = h.makeTempDir('rt-log-');
    markerDir = h.makeTempDir('rt-marker-');
    fake = await h.startFakeVv(FAKE_PORT);
    server = await h.startServer(appJs, SERVER_PORT, logDir, markerDir);
});

afterAll(async () => {
    await server?.stop();
    await fake?.stop();
});

beforeEach(async () => {
    await vv.reset();
});

describe('legacy parity', () => {
    it('runs a legacy scheduled script and sends its Completion to VVCore', async () => {
        const s = script('legacy-scheduled');
        const res = await h.postScheduledMultipart(nodeUrl, 'rtLegacySched', { script: s.text, baseUrl: fakeUrl, token: 'legacy-token-1' });

        expect(res.body).toEqual({ message: 'legacy scheduled script started' });
        expect(res.headers['vv-completion-target']).toBeUndefined();
        expect(res.headers['vv-identity-source']).toBe('script-credentials');

        const completions = await vv.waitFor((c) => c.kind === 'vvcore-completion');

        expect(completions[0].id).toBe('legacy-token-1');
        expect(completions[0].query).toMatchObject({ action: 'complete', result: 'true', message: 'legacy scheduled done' });
        expect((await vv.calls()).some((c) => c.kind === 'studioapi-completion')).toBe(false);
        expect(passwordLogins(await vv.calls())).toEqual(['script-user']);
    });

    it('runs a legacy on-demand script with v1 calls through the shims', async () => {
        const s = script('legacy-ondemand');
        const res = await h.postKeyValueJson(nodeUrl, 'scripts', 'rtLegacyOnDemand', {
            script: s.text,
            baseUrl: fakeUrl,
            fields: [{ name: 'Name', value: 'Alice' }]
        });

        expect(res.headers['vv-identity-source']).toBe('script-credentials');
        expect(res.body).toEqual([{
            name: 'steps',
            value: [
                { step: 'field', value: 'Alice' },
                { step: 'returnField', managerId: 'f1', managerName: 'Field One' },
                { step: 'getUser', status: 200 },
                { step: 'putIndexFields', status: 200 }
            ]
        }]);

        const calls = await vv.calls();

        expect(calls.some((c) => c.kind === 'vv-api' && c.method === 'PUT' && /indexfields\/index-field-1\/folders\/folder-1/i.test(c.path))).toBe(true);
    });
});

describe('scripts that load server modules', () => {
    it('runs a legacy script that requires ../VVRestApi and completes to VVCore', async () => {
        const s = script('legacy-embedded-require');
        const res = await h.postScheduledMultipart(nodeUrl, 'rtEmbeddedRequire', { script: s.text, baseUrl: fakeUrl, token: 'embedded-token' });

        expect(res.body).toEqual({ message: 'embedded require loaded', authorize: 'function', vvClient: 'function', formFieldCollection: 'function' });
        await vv.waitFor((c) => c.kind === 'vvcore-completion' && c.id === 'embedded-token');
    });

    it.each([
        ['scripts', (fields) => h.postKeyValueJson(nodeUrl, 'scripts', 'rtUnloadable', fields)],
        ['scheduledscripts', (fields) => h.postScheduledMultipart(nodeUrl, 'rtUnloadableSched', fields)]
    ])('/%s answers 500 for a script that cannot load, and the server keeps running', async (route, post) => {
        const res = await post({ script: 'require("../NoSuchServerModule");\nexports.main = function () {};', baseUrl: fakeUrl, token: 't' });

        expect(res.body.code).toBe(500);
        expect(res.body.error).toMatch(/^Unable to load script: Cannot find module/);
        expect(server.child.exitCode).toBeNull();
        expect((await fetch(nodeUrl + '/')).status).toBe(200);
    });
});

describe('completion routing', () => {
    it('acknowledges completionTarget=studioapi and sends the Completion to StudioApi with a fresh JWT', async () => {
        const s = script('legacy-scheduled');
        const res = await h.postScheduledMultipart(nodeUrl, 'rtTargetStudio', {
            script: s.text, baseUrl: fakeUrl, token: 'run-token-1', completionTarget: 'studioapi'
        });

        expect(res.headers['vv-completion-target']).toBe('studioapi');

        const [completion] = await vv.waitFor((c) => c.kind === 'studioapi-completion');

        expect(completion.runToken).toBe('run-token-1');
        expect(completion.tokenKind).toBe('jwt');
        expect(completion.query).toMatchObject({ action: 'complete', result: 'true' });

        const calls = await vv.calls();
        const completionIndex = calls.indexOf(calls.find((c) => c.kind === 'studioapi-completion'));
        const lastJwtBefore = calls.slice(0, completionIndex).map((c) => c.kind).lastIndexOf('getjwt');

        // A getjwt call right before the Completion: the fresh JWT, not the one from login.
        expect(calls.slice(lastJwtBefore + 1, completionIndex).every((c) => c.kind !== 'getjwt')).toBe(true);
        expect(calls.filter((c) => c.kind === 'getjwt').length).toBeGreaterThanOrEqual(2);
        expect(calls.some((c) => c.kind === 'vvcore-completion')).toBe(false);
    });

    it('ignores and logs an unknown target, and completes to VVCore', async () => {
        const s = script('legacy-scheduled');
        const res = await h.postScheduledMultipart(nodeUrl, 'rtTargetOther', {
            script: s.text, baseUrl: fakeUrl, token: 'legacy-token-2', completionTarget: 'other'
        });

        expect(res.headers['vv-completion-target']).toBeUndefined();
        await vv.waitFor((c) => c.kind === 'vvcore-completion' && c.id === 'legacy-token-2');
        expect(server.output()).toContain('Ignoring unknown completionTarget "other"');
    });

    it('never falls back to VVCore when the target is studioapi and StudioApi is not available', async () => {
        await vv.configure({ studioApiEnabled: false });

        const s = script('legacy-scheduled');
        const res = await h.postScheduledMultipart(nodeUrl, 'rtNoStudio', {
            script: s.text, baseUrl: fakeUrl, token: 'run-token-2', completionTarget: 'studioapi'
        });

        expect(res.headers['vv-completion-target']).toBe('studioapi');
        await sleep(3000);

        const calls = await vv.calls();

        expect(calls.some((c) => c.kind === 'vvcore-completion' || c.kind === 'studioapi-completion')).toBe(false);
        expect(server.output()).toContain('legacy scheduled completion failed');
    });

    it.each([
        ['multipart', (fields) => h.postScheduledMultipart(nodeUrl, 'rtBodyMultipart', fields)],
        ['Key/Value JSON', (fields) => h.postKeyValueJson(nodeUrl, 'scheduledscripts', 'rtBodyKeyValue', fields)],
        ['object JSON', (fields) => h.postObjectJson(nodeUrl, 'scheduledscripts', 'rtBodyObject', fields)]
    ])('reads completionTarget and runContext from a %s body', async (label, post) => {
        const s = script('v2-scheduled');
        const res = await post({ script: s.text, baseUrl: fakeUrl, token: 'body-' + label, completionTarget: 'studioapi', runContext: runContext });

        expect(res.headers['vv-completion-target']).toBe('studioapi');
        expect(res.headers['vv-identity-source']).toBe('run-as-user');

        const [completion] = await vv.waitFor((c) => c.kind === 'studioapi-completion');

        expect(completion.runToken).toBe('body-' + label);
        expect(passwordLogins(await vv.calls())).toEqual([RUN_AS_KEY]);
    });
});

describe('Run-as identity', () => {
    it.each([
        ['scripts', true, true, 'script-credentials', 'script-user'],
        ['scripts', false, true, 'run-as-user', RUN_AS_KEY],
        ['scripts', true, false, 'script-credentials', 'script-user'],
        ['scheduledscripts', true, true, 'script-credentials', 'script-user'],
        ['scheduledscripts', false, true, 'run-as-user', RUN_AS_KEY]
    ])('/%s, getCredentials=%s, secrets=%s -> %s', async (route, hasCredentials, hasSecrets, header, username) => {
        const name = route === 'scripts' ? 'v2-ondemand' : 'v2-scheduled';
        const s = script(name, hasCredentials ? withCredentials() : {});
        const fields = { script: s.text, baseUrl: fakeUrl, token: 'identity-token', fields: [{ name: 'Name', value: 'Bob' }] };

        if (hasSecrets) {
            fields.runContext = runContext;
        }

        const res = await h.postKeyValueJson(nodeUrl, route, 'rtIdentity' + route, fields);

        expect(res.headers['vv-identity-source']).toBe(header);
        expect(passwordLogins(await vv.calls())).toEqual([username]);
        expect(s.ran()).toBe(true);

        if (route === 'scripts') {
            expect(res.body).toEqual([
                { name: 'status', value: 200 },
                { name: 'nativePromise', value: true },
                { name: 'echo', value: 'Bob' }
            ]);
        }
    });

    it.each(['scripts', 'scheduledscripts'])('/%s answers identity-missing and never calls main()', async (route) => {
        const s = script('no-identity');
        const res = await h.postKeyValueJson(nodeUrl, route, 'rtNoIdentity' + route, { script: s.text, baseUrl: fakeUrl, token: 't' });

        expect(res.body).toMatchObject({ code: 400, error: 'identity-missing' });
        expect(res.headers['vv-identity-source']).toBeUndefined();
        expect(s.ran()).toBe(false);
        expect((await vv.calls()).some((c) => c.kind === 'oauth')).toBe(false);
    });

    it('keeps a Run-as session working past token expiry and still sends its Completion', async () => {
        // Tokens that expire 35 s after issue: the client refreshes inside 30 s of expiry, so a
        // 12-second run crosses the refresh point several times. Stands in for the 20-minute token.
        await vv.configure({ accessTokenLifetime: 35, jwtLifetime: 35 });

        const s = script('v2-scheduled', { RUN_SECONDS: 12 });
        const res = await h.postScheduledMultipart(nodeUrl, 'rtLongRun', {
            script: s.text, baseUrl: fakeUrl, token: 'long-run-token', completionTarget: 'studioapi', runContext: runContext
        });

        expect(res.headers['vv-identity-source']).toBe('run-as-user');

        const [completion] = await vv.waitFor((c) => c.kind === 'studioapi-completion', 30000);
        const calls = await vv.calls();

        expect(completion.query.result).toBe('true');
        expect(completion.query.message).toMatch(/failures=0$/);
        expect(calls.some((c) => c.kind === 'vv-api-unauthorized')).toBe(false);
        expect(calls.filter((c) => c.kind === 'oauth' && c.grant !== 'password').length).toBeGreaterThan(0);
    }, 60000);
});

describe('server log', () => {
    it('holds no part of runContext after every run above', async () => {
        await sleep(500);

        const everything = server.output() + '\n' + h.readLogFiles(logDir);

        expect(everything).not.toContain(RUN_AS_SECRET);
        expect(everything).not.toContain(RUN_AS_KEY);
        expect(everything).not.toContain('"secrets"');
    });
});
