import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const { acknowledgeIdentitySource, readRunFields, resolveIdentity, routeCompletionsTo } = require('../lib/VVRestApi/VVRestApiNodeJs/routes/runRequest');

describe('reading the run fields', () => {
    it('reads completionTarget and runContext from a Key/Value array body', () => {
        const fields = readRunFields([
            { Key: 'script', Value: 'exports.main = function () {};' },
            { Key: 'completionTarget', Value: 'studioapi' },
            { Key: 'runContext', Value: '{"version":1}' }
        ]);

        expect(fields).toEqual({ completionTarget: 'studioapi', runContext: { version: 1 } });
    });

    it('reads both fields from an object body', () => {
        const fields = readRunFields({
            script: 'exports.main = function () {};',
            baseUrl: 'https://example.com/',
            completionTarget: 'studioapi',
            runContext: '{"version":1}'
        });

        expect(fields).toEqual({ completionTarget: 'studioapi', runContext: { version: 1 } });
    });

    it('reports no fields for a legacy body', () => {
        const fields = readRunFields({ script: 'exports.main = function () {};', baseUrl: 'https://example.com/' });

        expect(fields).toEqual({ completionTarget: null, runContext: null });
    });

    it('ignores a completion target it does not know', () => {
        const fields = readRunFields({ completionTarget: 'other', runContext: { version: 1 } });

        expect(fields.completionTarget).toBe(null);
    });

    it('keeps a runContext that arrives already parsed', () => {
        const fields = readRunFields({ completionTarget: 'studioapi', runContext: { version: 1 } });

        expect(fields.runContext).toEqual({ version: 1 });
    });

    it('reports no runContext when it cannot read the one the body carries', () => {
        const fields = readRunFields({ completionTarget: 'studioapi', runContext: '{"version":1' });

        expect(fields).toEqual({ completionTarget: 'studioapi', runContext: null });
    });
});

describe('routing the completions of a run', () => {
    it('points the client at the completion target', () => {
        const targets = [];

        routeCompletionsTo({ setCompletionTarget: (target) => targets.push(target) }, 'studioapi');

        expect(targets).toEqual(['studioapi']);
    });

    it('leaves the client on its own route when the request named no target', () => {
        const targets = [];

        routeCompletionsTo({ setCompletionTarget: (target) => targets.push(target) }, null);

        expect(targets).toEqual([]);
    });
});

describe('resolving the identity a run logs in with', () => {
    it('uses the script credentials when the script exports getCredentials', () => {
        const scriptCredentials = { clientId: 'script-key', clientSecret: 'script-secret', userId: 'script-user', password: 'script-password' };

        const identity = resolveIdentity({ getCredentials: () => scriptCredentials }, null);

        expect(identity.source).toBe('script-credentials');
        // `toBe`, not `toEqual`: the script's credentials object is handed on unchanged.
        expect(identity.params).toBe(scriptCredentials);
    });
    it('logs in with the run-as key when the script exports no getCredentials', () => {
        const identity = resolveIdentity({}, {
            version: 1,
            secrets: {
                clientId: 'run-as-key',
                clientSecret: 'run-as-secret',
                customerAlias: 'run-as-customer',
                databaseAlias: 'run-as-database'
            }
        });

        expect(identity.source).toBe('run-as-user');
        expect(identity.params).toEqual({
            clientId: 'run-as-key',
            clientSecret: 'run-as-secret',
            userId: 'run-as-key',
            password: 'run-as-secret',
            audience: null,
            customerAlias: 'run-as-customer',
            databaseAlias: 'run-as-database'
        });
    });
    it('carries an audience the run context names', () => {
        const identity = resolveIdentity({}, {
            secrets: {
                clientId: 'run-as-key',
                clientSecret: 'run-as-secret',
                audience: 'run-as-audience',
                customerAlias: 'run-as-customer',
                databaseAlias: 'run-as-database'
            }
        });

        expect(identity.params.audience).toBe('run-as-audience');
    });
    it('keeps the script credentials when the request also carries run-as secrets', () => {
        const script = { getCredentials: () => ({ clientId: 'script-key', clientSecret: 'script-secret' }) };

        const identity = resolveIdentity(script, {
            secrets: { clientId: 'run-as-key', clientSecret: 'run-as-secret' }
        });

        expect(identity.source).toBe('script-credentials');
        expect(identity.params.clientId).toBe('script-key');
    });

    it('resolves no identity when the run has neither', () => {
        expect(resolveIdentity({}, null)).toEqual({ source: null, params: null });
    });
    it('resolves no identity from secrets that carry no key', () => {
        expect(resolveIdentity({}, { version: 1, secrets: {} })).toEqual({ source: null, params: null });
    });

    it('resolves no identity from secrets that carry a key but no secret', () => {
        expect(resolveIdentity({}, { version: 1, secrets: { clientId: 'run-as-key' } })).toEqual({ source: null, params: null });
    });
});

describe('acknowledging the identity a run used', () => {
    it('names the identity source in the response header', () => {
        const headers = {};

        acknowledgeIdentitySource({ setHeader: (name, value) => (headers[name] = value) }, 'run-as-user');

        expect(headers).toEqual({ 'vv-identity-source': 'run-as-user' });
    });

    it('sets no header for a run that resolved no identity', () => {
        const headers = {};

        acknowledgeIdentitySource({ setHeader: (name, value) => (headers[name] = value) }, null);

        expect(headers).toEqual({});
    });
});
