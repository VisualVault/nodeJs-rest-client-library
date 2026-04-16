const path = require('path');
const fs = require('fs');
const os = require('os');
const vvSync = require('../../tools/helpers/vv-sync');

let tmpDir;

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-sync-test-'));
});

afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('computeChanges with array fileExt', () => {
    const manifest = {
        component: 'templates',
        templates: [
            { name: 'Access Code', contentHash: 'hash-ac' },
            { name: 'Note', contentHash: 'hash-note' },
            { name: 'Fee', contentHash: 'hash-fee' },
        ],
    };

    test('detects XML file as existing when fileExt is array', () => {
        fs.writeFileSync(path.join(tmpDir, 'Access-Code.xml'), '<xml/>');

        const items = [{ name: 'Access Code', contentHash: 'hash-ac' }];
        const result = vvSync.computeChanges(items, manifest, {
            idField: 'name',
            hashField: 'contentHash',
            fileExt: ['.xml', '.json'],
            fileDir: tmpDir,
            component: 'templates',
        });

        expect(result.unchanged).toBe(1);
        expect(result.toExtract).toHaveLength(0);
    });

    test('detects JSON file as existing when fileExt is array', () => {
        fs.writeFileSync(path.join(tmpDir, 'Note.json'), '{}');

        const items = [{ name: 'Note', contentHash: 'hash-note' }];
        const result = vvSync.computeChanges(items, manifest, {
            idField: 'name',
            hashField: 'contentHash',
            fileExt: ['.xml', '.json'],
            fileDir: tmpDir,
            component: 'templates',
        });

        expect(result.unchanged).toBe(1);
        expect(result.toExtract).toHaveLength(0);
    });

    test('marks item as new when neither XML nor JSON file exists', () => {
        // No file on disk for Fee
        const items = [{ name: 'Fee', contentHash: 'hash-fee' }];
        const result = vvSync.computeChanges(items, manifest, {
            idField: 'name',
            hashField: 'contentHash',
            fileExt: ['.xml', '.json'],
            fileDir: tmpDir,
            component: 'templates',
        });

        expect(result.added).toBe(1);
        expect(result.toExtract).toHaveLength(1);
    });

    test('backward compatible with scalar fileExt', () => {
        fs.writeFileSync(path.join(tmpDir, 'Access-Code.xml'), '<xml/>');

        const items = [{ name: 'Access Code', contentHash: 'hash-ac' }];
        const result = vvSync.computeChanges(items, manifest, {
            idField: 'name',
            hashField: 'contentHash',
            fileExt: '.xml',
            fileDir: tmpDir,
            component: 'templates',
        });

        expect(result.unchanged).toBe(1);
    });
});
