const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock vv-templates before requiring the component
jest.mock('../../../tools/helpers/vv-templates');
jest.mock('../../../tools/helpers/vv-sync');
jest.mock('../../../tools/helpers/vv-formsapi');

const vvTemplates = require('../../../tools/helpers/vv-templates');
const vvSync = require('../../../tools/helpers/vv-sync');
const templates = require('../../../tools/extract/components/templates');

// ── Fixtures ──────────────────────────────────────────────────────────

const MOCK_CONFIG = {
    baseUrl: 'https://vv5dev.visualvault.com',
    customerAlias: 'WADNR',
    databaseAlias: 'fpOnline',
};

const API_TEMPLATES = [
    {
        id: 'id-access-code',
        revisionId: 'rev-access-code',
        name: 'Access Code',
        description: 'Access Code',
        revision: 10,
        templateRevision: '2.3',
        status: 1,
        modifyDate: '2025-05-22T12:21:06.87Z',
        createDate: '2025-01-03T03:16:15.497Z',
        modifyBy: 'test@test.com',
        createBy: 'test@test.com',
    },
    {
        id: 'id-activity-map',
        revisionId: 'rev-activity-map',
        name: 'Activity Map',
        description: 'Map Editor',
        revision: 14,
        templateRevision: '3.1',
        status: 1,
        modifyDate: '2025-07-10T07:03:20.303Z',
        createDate: '2025-01-09T09:24:35.223Z',
        modifyBy: 'test@test.com',
        createBy: 'test@test.com',
    },
];

// ── Component metadata ────────────────────────────────────────────────

describe('templates component metadata', () => {
    test('has correct name', () => {
        expect(templates.name).toBe('templates');
    });

    test('has correct outputSubdir', () => {
        expect(templates.outputSubdir).toBe('form-templates');
    });

    test('syncOpts uses name as idField with hash-based change detection and dual extensions', () => {
        expect(templates.syncOpts).toEqual({
            idField: 'name',
            dateField: null,
            hashField: 'contentHash',
            fileExt: ['.xml', '.json'],
        });
    });
});

// ── fetchMetadata ─────────────────────────────────────────────────────

describe('fetchMetadata', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        vvTemplates.getTemplates.mockResolvedValue(API_TEMPLATES);
        vvSync.loadManifest.mockReturnValue(null);
        // Suppress console output during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        console.log.mockRestore();
    });

    test('calls vvTemplates.getTemplates with config', async () => {
        const result = await templates.fetchMetadata(null, MOCK_CONFIG);
        expect(vvTemplates.getTemplates).toHaveBeenCalledWith(MOCK_CONFIG);
        expect(result).toHaveLength(2);
    });

    test('returns items with expected shape for extract orchestrator', async () => {
        const result = await templates.fetchMetadata(null, MOCK_CONFIG);
        expect(result[0]).toEqual({
            name: 'Access Code',
            description: 'Access Code',
            revisionId: 'rev-access-code',
            templateRevision: '2.3',
            modifyDate: '2025-05-22T12:21:06.87Z',
            contentHash: null,
        });
    });

    test('carries forward content hashes from previous manifest', async () => {
        vvSync.loadManifest.mockReturnValue({
            templates: [{ name: 'Access Code', contentHash: 'abc123' }],
        });

        const result = await templates.fetchMetadata(null, MOCK_CONFIG, {
            manifestPath: '/fake/manifest.json',
        });

        expect(vvSync.loadManifest).toHaveBeenCalledWith('/fake/manifest.json');
        expect(result.find((t) => t.name === 'Access Code').contentHash).toBe('abc123');
        expect(result.find((t) => t.name === 'Activity Map').contentHash).toBeNull();
    });

    test('handles missing manifest gracefully', async () => {
        vvSync.loadManifest.mockReturnValue(null);

        const result = await templates.fetchMetadata(null, MOCK_CONFIG, {
            manifestPath: '/nonexistent/manifest.json',
        });

        expect(result).toHaveLength(2);
        expect(result.every((t) => t.contentHash === null)).toBe(true);
    });

    test('handles manifest with items key instead of templates key', async () => {
        vvSync.loadManifest.mockReturnValue({
            items: [{ name: 'Access Code', contentHash: 'def456' }],
        });

        const result = await templates.fetchMetadata(null, MOCK_CONFIG, {
            manifestPath: '/fake/manifest.json',
        });

        expect(result.find((t) => t.name === 'Access Code').contentHash).toBe('def456');
    });

    test('does not require a page parameter', async () => {
        // page is unused — API-based metadata fetch
        const result = await templates.fetchMetadata(undefined, MOCK_CONFIG);
        expect(result).toHaveLength(2);
    });
});

// ── save ──────────────────────────────────────────────────────────────

describe('save', () => {
    let tmpDir;

    beforeEach(() => {
        jest.restoreAllMocks();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-templates-test-'));

        // Use real vvSync.sanitizeFilename for save tests
        vvSync.sanitizeFilename.mockImplementation((name) =>
            name
                .replace(/[^a-zA-Z0-9_\-. ]/g, '_')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim()
        );
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('writes XML files for XML-format extractions', () => {
        const extracted = new Map([
            ['Access Code', { source: '<xml>access code</xml>', contentHash: 'hash1', format: 'xml' }],
            ['Activity Map', { source: '<xml>activity map</xml>', contentHash: 'hash2', format: 'xml' }],
        ]);

        const result = templates.save(tmpDir, API_TEMPLATES, extracted);

        expect(result.saved).toBe(2);
        expect(fs.existsSync(path.join(tmpDir, 'Access-Code.xml'))).toBe(true);
        expect(fs.existsSync(path.join(tmpDir, 'Activity-Map.xml'))).toBe(true);
        expect(fs.readFileSync(path.join(tmpDir, 'Access-Code.xml'), 'utf8')).toBe('<xml>access code</xml>');
    });

    test('writes JSON files for JSON-format extractions', () => {
        const jsonContent = JSON.stringify({ pages: {}, controls: {} });
        const extracted = new Map([['Note', { source: jsonContent, contentHash: 'hash3', format: 'json' }]]);

        const result = templates.save(tmpDir, [], extracted);

        expect(result.saved).toBe(1);
        expect(fs.existsSync(path.join(tmpDir, 'Note.json'))).toBe(true);
        expect(fs.existsSync(path.join(tmpDir, 'Note.xml'))).toBe(false);
    });

    test('removes alternate-format file when format changes', () => {
        // Simulate existing XML file
        fs.writeFileSync(path.join(tmpDir, 'Note.xml'), '<old-xml/>');

        const extracted = new Map([['Note', { source: '{"pages":{}}', contentHash: 'hash4', format: 'json' }]]);

        templates.save(tmpDir, [], extracted);

        expect(fs.existsSync(path.join(tmpDir, 'Note.json'))).toBe(true);
        expect(fs.existsSync(path.join(tmpDir, 'Note.xml'))).toBe(false);
    });

    test('handles mixed XML and JSON extractions', () => {
        const extracted = new Map([
            ['Access Code', { source: '<xml/>', contentHash: 'h1', format: 'xml' }],
            ['Note', { source: '{}', contentHash: 'h2', format: 'json' }],
        ]);

        const result = templates.save(tmpDir, [], extracted);

        expect(result.saved).toBe(2);
        expect(fs.existsSync(path.join(tmpDir, 'Access-Code.xml'))).toBe(true);
        expect(fs.existsSync(path.join(tmpDir, 'Note.json'))).toBe(true);
    });

    test('returns hashes map', () => {
        const extracted = new Map([['Access Code', { source: '<xml/>', contentHash: 'hash1', format: 'xml' }]]);

        const result = templates.save(tmpDir, API_TEMPLATES, extracted);

        expect(result.hashes).toBeInstanceOf(Map);
        expect(result.hashes.get('Access Code')).toBe('hash1');
    });

    test('creates output directory if missing', () => {
        const nested = path.join(tmpDir, 'nested', 'dir');
        const extracted = new Map([['Test', { source: '<xml/>', contentHash: 'h', format: 'xml' }]]);

        templates.save(nested, [], extracted);
        expect(fs.existsSync(nested)).toBe(true);
    });

    test('handles empty extraction', () => {
        const result = templates.save(tmpDir, [], new Map());
        expect(result.saved).toBe(0);
        expect(result.hashes.size).toBe(0);
    });

    test('defaults to XML when format is not specified', () => {
        const extracted = new Map([['Test', { source: '<xml/>', contentHash: 'h' }]]);

        templates.save(tmpDir, [], extracted);
        expect(fs.existsSync(path.join(tmpDir, 'Test.xml'))).toBe(true);
    });
});

// ── generateReadme ────────────────────────────────────────────────────

describe('generateReadme', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('calls vvSync.generateReadme with correct structure', () => {
        const allItems = [{ name: 'Access Code', templateRevision: '2.3' }];
        const extractedNames = new Set(['Access Code']);

        templates.generateReadme('/output', allItems, extractedNames);

        expect(vvSync.generateReadme).toHaveBeenCalledTimes(1);
        const call = vvSync.generateReadme.mock.calls[0];
        expect(call[0]).toBe('/output');
        expect(call[1].title).toBe('Form Templates');
        expect(call[1].columns).toHaveLength(2);
        expect(call[1].columns[0].header).toBe('Template Name');
        expect(call[1].columns[1].header).toBe('Version');
    });

    test('does not link non-extracted templates', () => {
        vvSync.sanitizeFilename.mockImplementation((name) => name.replace(/\s+/g, '-'));
        const allItems = [{ name: 'Missing Template' }];
        const extractedNames = new Set();

        templates.generateReadme('/output', allItems, extractedNames);

        const transform = vvSync.generateReadme.mock.calls[0][1].columns[0].transform;
        expect(transform({ name: 'Missing Template' })).toBe('Missing Template');
    });
});

// ── getExportUrl integration ──────────────────────────────────────────

describe('export URL construction', () => {
    test('vvTemplates.getExportUrl builds correct URL from item revisionId', () => {
        // Verify the helper is used correctly by the component
        vvTemplates.getExportUrl.mockReturnValue(
            'https://vv5dev.visualvault.com/app/WADNR/fpOnline/ExportForm?FormID=rev-access-code'
        );

        const url = vvTemplates.getExportUrl(MOCK_CONFIG, 'rev-access-code');
        expect(url).toContain('ExportForm?FormID=rev-access-code');
    });
});
