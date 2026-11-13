import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const { VVClient } = require('visualvault-api');
const { applyModuleShims, applyV1Shims } = require('../lib/VVRestApi/VVRestApiNodeJs/compat/v1Shims');

// Port 1 is never listening, so every request rejects at once without DNS or egress.
const unreachable = 'http://127.0.0.1:1/';

let recorder = null;
let recorded = [];

beforeAll(async () => {
    recorder = createServer((req, res) => {
        recorded.push({ method: req.method, url: req.url });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ meta: { status: 200, statusMsg: 'OK', errors: [] }, data: {} }));
    });

    await new Promise((resolve) => recorder.listen(0, '127.0.0.1', resolve));
});

afterAll(() => new Promise((resolve) => recorder.close(resolve)));

function shimmedClientFor(baseUrl, apiUrl, script) {
    const client = new VVClient({
        tokenType: 'jwt',
        baseUrl: baseUrl,
        apiUrl: apiUrl,
        customerAlias: 'c',
        databaseAlias: 'd',
        accessToken: 't',
        expirationDate: new Date(Date.now() + 3600000)
    });

    applyV1Shims(client, script);

    return client;
}

function recordingClient() {
    recorded = [];

    return shimmedClientFor('http://127.0.0.1:' + recorder.address().port + '/', 'api/v1/c/d');
}

function shimmedClient() {
    return shimmedClientFor(unreachable, 'api/v1/');
}

describe('the v1 promise shim', () => {
    it('lets a failed call be caught with .fail()', async () => {
        const client = shimmedClient();

        let caught = null;
        await client.indexFields.getIndexFields({}).fail(function (error) {
            caught = error;
        });

        expect(caught).toBeInstanceOf(Error);
    });
    it('runs .fin() after a call settles', async () => {
        const client = shimmedClient();

        let ran = false;
        await client.indexFields.getIndexFields({}).fin(function () {
            ran = true;
        }).fail(function () {});

        expect(ran).toBe(true);
    });
    it('accepts a .progress() handler on the chain', async () => {
        const client = shimmedClient();

        const pending = client.indexFields.getIndexFields({});

        expect(pending.progress).toBeTypeOf('function');
        await pending.progress(function () {}).fail(function () {});
    });
    it('still resolves to the v2 value under await', async () => {
        const client = shimmedClient();
        client.notificationsApi = { isEnabled: true, users: { forceUIRefresh: async () => 'v2 payload' } };

        applyV1Shims(client);

        expect(await client.notificationsApi.users.forceUIRefresh('user-id')).toBe('v2 payload');
    });
    it('sends putIndexFields to the addIndexFieldToFolder endpoint', async () => {
        const client = recordingClient();

        await client.indexFields.putIndexFields('field-1', 'folder-9');

        expect(recorded).toEqual([
            { method: 'PUT', url: '/api/v1/c/d/indexfields/field-1/folders/folder-9' }
        ]);
    });
    it('sets the returnField values on the forms manager itself', () => {
        const client = shimmedClient();

        const field = client.forms.returnField('f-1', 'Status', 'Approved', true, 'needs review');

        expect(client.forms).toMatchObject({
            id: 'f-1',
            name: 'Status',
            value: 'Approved',
            isError: true,
            errorMessage: 'needs review'
        });
        expect(field.name).toBe('Status');
    });
    it('maps the old docApi method paths onto docApi.documents', async () => {
        const client = shimmedClient();
        const calls = [];
        const record = (name) => async (...args) => {
            calls.push([name, ...args]);

            return name;
        };

        client.docApi = {
            isEnabled: true,
            documents: {
                GetRevision: record('GetRevision'),
                getDocumentOcrStatus: record('getDocumentOcrStatus'),
                updateDocumentOcrStatus: record('updateDocumentOcrStatus'),
                search: record('search')
            }
        };

        applyV1Shims(client);

        expect(await client.docApi.GetRevision('rev-1')).toBe('GetRevision');
        await client.docApi.getDocumentOcrStatus('rev-1');
        await client.docApi.updateDocumentOcrStatus('rev-1', { status: 2 });
        await client.docApi.search([], ['folder-1'], [], 'name');

        expect(calls).toEqual([
            ['GetRevision', 'rev-1'],
            ['getDocumentOcrStatus', 'rev-1'],
            ['updateDocumentOcrStatus', 'rev-1', { status: 2 }],
            ['search', [], ['folder-1'], [], 'name']
        ]);
    });
    it('maps the old objectsApi method paths onto its models and objects managers', async () => {
        const client = shimmedClient();
        const calls = [];
        const record = (name) => async (...args) => {
            calls.push([name, ...args]);

            return name;
        };

        client.objectsApi = {
            isEnabled: true,
            models: { getModels: record('getModels'), getModelById: record('getModelById') },
            objects: {
                getObject: record('getObject'),
                getObjectsByModelId: record('getObjectsByModelId'),
                createObject: record('createObject'),
                updateObject: record('updateObject'),
                deleteObject: record('deleteObject')
            }
        };

        applyV1Shims(client);

        expect(await client.objectsApi.getModels()).toBe('getModels');
        await client.objectsApi.getModelById('model-1');
        await client.objectsApi.getObject('object-1');
        await client.objectsApi.getObjectsByModelId('model-1', {});
        await client.objectsApi.createObject('model-1', {});
        await client.objectsApi.updateObject('object-1', 'rev-1', {});
        await client.objectsApi.deleteObject('object-1');

        expect(calls.map((call) => call[0])).toEqual([
            'getModels',
            'getModelById',
            'getObject',
            'getObjectsByModelId',
            'createObject',
            'updateObject',
            'deleteObject'
        ]);
    });
    it('adds no method to a disabled or absent extended API', () => {
        const client = shimmedClient();
        client.objectsApi = { isEnabled: false, baseUrl: null };

        applyV1Shims(client);

        expect(client.docApi).toBeNull();
        expect(client.objectsApi.getModels).toBeUndefined();
        expect(client.objectsApi.getObject).toBeUndefined();
    });
});

describe('the clientCompatibility declaration', () => {
    function clientFor(script) {
        return shimmedClientFor(unreachable, 'api/v1/', script);
    }

    it('leaves the client unshimmed for a script that declares v2', async () => {
        const client = clientFor({ clientCompatibility: 'v2' });

        expect(client.indexFields.putIndexFields).toBeUndefined();

        const pending = client.indexFields.getIndexFields({});

        expect(pending.fail).toBeUndefined();
        // The request to the unreachable port always rejects; the test only checks the promise type.
        await pending.catch(() => {});
    });

    it('shims the client for a script that declares v1', () => {
        const client = clientFor({ clientCompatibility: 'v1' });

        expect(client.indexFields.putIndexFields).toBeTypeOf('function');
    });

    it('shims the client for a script that declares nothing', () => {
        const client = clientFor({});

        expect(client.indexFields.putIndexFields).toBeTypeOf('function');
    });

    it('falls back to shims for an unrecognized declaration', () => {
        const client = clientFor({ clientCompatibility: 'V2' });

        expect(client.indexFields.putIndexFields).toBeTypeOf('function');
    });
});


describe('the v1 module shim', () => {
    it('exposes authorize alongside Authorize on the package export', () => {
        const clientLibrary = require('visualvault-api');

        applyModuleShims();

        expect(clientLibrary.authorize).toBe(clientLibrary.Authorize);
        expect(clientLibrary.default.authorize).toBe(clientLibrary.Authorize);
    });
});
