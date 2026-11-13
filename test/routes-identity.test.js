import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const fixture = fileURLToPath(new URL('./fixtures/call-route.js', import.meta.url));

// Marks a run that reached the script. A route that answers identity-missing never writes it.
const MAIN_RAN = 'MAIN-RAN';

const RUN_AS_SECRET = 'run-as-secret-nobody-may-log';

const runAsSecrets = {
    clientId: 'run-as-key',
    clientSecret: RUN_AS_SECRET,
    customerAlias: 'run-as-customer',
    databaseAlias: 'run-as-database'
};

function scriptText(options) {
    const credentials = (options || {}).getCredentials;
    const exportsCredentials = credentials
        ? 'exports.getCredentials = function () { return ' + JSON.stringify(credentials) + '; };'
        : '';

    return exportsCredentials + '\nexports.main = function () { console.log("' + MAIN_RAN + '"); };';
}

function callRoute(route, request) {
    const run = spawnSync(process.execPath, [fixture, route, JSON.stringify(request)], { encoding: 'utf8' });
    const lines = run.stdout.split('\n');
    const result = lines.find((line) => line.indexOf('RESULT:') === 0);

    if (!result) {
        throw new Error('The route fixture wrote no RESULT line. stdout: ' + run.stdout + ' stderr: ' + run.stderr);
    }

    const recorded = JSON.parse(result.slice('RESULT:'.length));

    return Object.assign(recorded, {
        // Everything the server wrote: winston's console transport (info to stdout, error to
        // stderr) and its file transport. The RESULT line is the fixture's own echo of the login.
        log: lines.filter((line) => line.indexOf('RESULT:') !== 0).join('\n') + run.stderr + (recorded.logFile || ''),
        mainRan: run.stdout.indexOf(MAIN_RAN) > -1
    });
}

describe('the scripts route', () => {
    it('logs in with the run-as key when the script exports no getCredentials', () => {
        const called = callRoute('scripts', {
            query: { id: 'run-as-script' },
            body: {
                script: scriptText(),
                baseUrl: 'https://example.com/',
                runContext: JSON.stringify({ version: 1, secrets: runAsSecrets })
            }
        });

        expect(called.headers['vv-identity-source']).toBe('run-as-user');
        expect(called.logins).toEqual([
            {
                clientId: 'run-as-key',
                clientSecret: RUN_AS_SECRET,
                userId: 'run-as-key',
                password: RUN_AS_SECRET,
                audience: null,
                baseUrl: 'https://example.com/',
                customerAlias: 'run-as-customer',
                databaseAlias: 'run-as-database'
            }
        ]);
        expect(called.mainRan).toBe(true);
    });

    it('answers identity-missing without running a script that has no identity', () => {
        const called = callRoute('scripts', {
            query: { id: 'no-identity-script' },
            body: { script: scriptText(), baseUrl: 'https://example.com/' }
        });

        expect(called.responses).toEqual([{ status: 200, body: { code: 400, error: 'identity-missing' } }]);
        expect(called.logins).toEqual([]);
        expect(called.mainRan).toBe(false);
        expect(called.headers['vv-identity-source']).toBe(undefined);
    });
});

describe('the scheduledscripts route', () => {
    it('logs in with the run-as key a Key/Value array body carries', () => {
        const called = callRoute('scheduledscripts', {
            query: { id: 'run-as-scheduled' },
            body: [
                { Key: 'script', Value: scriptText() },
                { Key: 'baseUrl', Value: 'https://example.com/' },
                { Key: 'token', Value: 'run-1' },
                { Key: 'runContext', Value: JSON.stringify({ version: 1, secrets: runAsSecrets }) }
            ]
        });

        expect(called.headers['vv-identity-source']).toBe('run-as-user');
        expect(called.logins).toEqual([
            {
                clientId: 'run-as-key',
                clientSecret: RUN_AS_SECRET,
                userId: 'run-as-key',
                password: RUN_AS_SECRET,
                audience: null,
                baseUrl: 'https://example.com/',
                customerAlias: 'run-as-customer',
                databaseAlias: 'run-as-database'
            }
        ]);
        expect(called.mainRan).toBe(true);
    });
    it('keeps the script credentials when the request also carries run-as secrets', () => {
        const called = callRoute('scheduledscripts', {
            query: { id: 'both-identities-scheduled' },
            body: {
                script: scriptText({
                    getCredentials: {
                        clientId: 'script-key',
                        clientSecret: 'script-secret',
                        userId: 'script-user',
                        password: 'script-password',
                        customerAlias: 'script-customer',
                        databaseAlias: 'script-database'
                    }
                }),
                baseUrl: 'https://example.com/',
                token: 'run-1',
                runContext: JSON.stringify({ version: 1, secrets: runAsSecrets })
            }
        });

        expect(called.headers['vv-identity-source']).toBe('script-credentials');
        expect(called.logins).toHaveLength(1);
        expect(called.logins[0].clientId).toBe('script-key');
        expect(called.logins[0].userId).toBe('script-user');
        expect(called.mainRan).toBe(true);
    });
    it('answers identity-missing without running a script that has no identity', () => {
        const called = callRoute('scheduledscripts', {
            query: { id: 'no-identity-scheduled' },
            body: { script: scriptText(), baseUrl: 'https://example.com/', token: 'run-1' }
        });

        expect(called.responses).toEqual([{ status: 200, body: { code: 400, error: 'identity-missing' } }]);
        expect(called.logins).toEqual([]);
        expect(called.mainRan).toBe(false);
        expect(called.headers['vv-identity-source']).toBe(undefined);
    });
});


describe('the secrets a run context carries', () => {
    // The request body holds a live API secret, so a run must leave no part of it behind.
    it.each(['scripts', 'scheduledscripts'])('reach no log line on the %s route', (route) => {
        const called = callRoute(route, {
            query: { id: 'logging-' + route },
            body: {
                script: scriptText(),
                baseUrl: 'https://example.com/',
                token: 'run-1',
                runContext: JSON.stringify({ version: 1, secrets: runAsSecrets })
            }
        });

        expect(called.headers['vv-identity-source']).toBe('run-as-user');
        expect(called.mainRan).toBe(true);
        expect(called.log).not.toContain(RUN_AS_SECRET);
        expect(called.log).not.toContain('run-as-key');
        expect(called.log).not.toContain('runContext');
        expect(JSON.stringify(called.responses)).not.toContain(RUN_AS_SECRET);
    });
});

describe('the branches that run a script the server already holds', () => {
    it('names the identity source of a localScript run', () => {
        const called = callRoute('scripts', {
            query: { id: 'localScript' },
            localScripts: {
                'held-script': scriptText({
                    getCredentials: { clientId: 'script-key', clientSecret: 'script-secret', userId: 'script-user', password: 'script-password' }
                })
            },
            body: { script: 'held-script', baseUrl: 'https://example.com/' }
        });

        expect(called.headers['vv-identity-source']).toBe('script-credentials');
        expect(called.mainRan).toBe(true);
    });

    it('answers identity-missing for a localScript that exports no getCredentials', () => {
        const called = callRoute('scripts', {
            query: { id: 'localScript' },
            localScripts: { 'held-script': scriptText() },
            body: { script: 'held-script', baseUrl: 'https://example.com/' }
        });

        expect(called.responses).toEqual([{ status: 200, body: { code: 400, error: 'identity-missing' } }]);
        expect(called.mainRan).toBe(false);
    });
});
