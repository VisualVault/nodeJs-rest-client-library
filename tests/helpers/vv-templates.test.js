const vvTemplates = require('../../tools/helpers/vv-templates');

// ── Fixtures ──────────────────────────────────────────────────────────

const RAW_API_TEMPLATE = {
    href: '~/formtemplates/72c4f324-c4c9-ef11-aa72-eb211e6c4aa6',
    dataType: 'FormTemplate',
    id: '72c4f324-c4c9-ef11-aa72-eb211e6c4aa6',
    name: 'Access Code',
    modifyDate: '2025-05-22T12:21:06.87Z',
    modifyById: 'e7a370ff-6f44-ef11-aa37-fe84da466cac',
    modifyBy: 'jason.hatch@visualvault.com',
    createDate: '2025-01-03T03:16:15.497Z',
    createById: 'e1e7b15f-7fc4-ef11-aa70-9fcff9ac1f76',
    createBy: 'alfredo.scilabra@visualvault.com',
    description: 'Access Code',
    revisionId: 'cece51c3-4137-f011-aa96-ed284a10c535',
    revision: 10,
    templateRevision: '2.3',
    status: 1,
};

const RAW_API_TEMPLATES = [
    RAW_API_TEMPLATE,
    {
        ...RAW_API_TEMPLATE,
        id: '67c80698-aece-ef11-aa74-c29172065942',
        name: 'Activity Map',
        revisionId: '558fe4f7-945d-f011-aaa6-9e13636b1cee',
        description: 'Map Editor',
        templateRevision: '3.1',
        revision: 14,
    },
    {
        ...RAW_API_TEMPLATE,
        id: '0c49611e-7861-f011-aaa8-cc4c74363fab',
        name: 'Appendix A Water Type Classification',
        revisionId: '799e9473-d431-f111-aaf6-9b37bbfb8ae4',
        description: 'Appendix A Water Type Classification',
        templateRevision: '1.2.3',
        revision: 37,
    },
    {
        ...RAW_API_TEMPLATE,
        id: 'test-draft-001',
        name: 'z-Test Draft Template',
        revisionId: 'draft-rev-001',
        description: 'Draft template for testing',
        templateRevision: '0.1',
        revision: 1,
        status: 0,
    },
];

const MOCK_CONFIG = {
    baseUrl: 'https://vv5dev.visualvault.com',
    customerAlias: 'WADNR',
    databaseAlias: 'fpOnline',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    username: 'test@example.com',
    password: 'test-password',
    audience: '',
};

// ── normalizeResponse ─────────────────────────────────────────────────

describe('normalizeResponse', () => {
    test('parses object with data key', () => {
        const result = vvTemplates.normalizeResponse({ data: RAW_API_TEMPLATES });
        expect(result).toEqual(RAW_API_TEMPLATES);
    });

    test('parses top-level array', () => {
        const result = vvTemplates.normalizeResponse(RAW_API_TEMPLATES);
        expect(result).toEqual(RAW_API_TEMPLATES);
    });

    test('parses JSON string with data key', () => {
        const json = JSON.stringify({ data: RAW_API_TEMPLATES });
        const result = vvTemplates.normalizeResponse(json);
        expect(result).toEqual(RAW_API_TEMPLATES);
    });

    test('parses JSON string with top-level array', () => {
        const json = JSON.stringify(RAW_API_TEMPLATES);
        const result = vvTemplates.normalizeResponse(json);
        expect(result).toEqual(RAW_API_TEMPLATES);
    });

    test('throws on non-array response', () => {
        expect(() => vvTemplates.normalizeResponse({ error: 'bad' })).toThrow(
            'Unexpected API response: expected array of templates'
        );
    });

    test('throws on invalid JSON string', () => {
        expect(() => vvTemplates.normalizeResponse('not-json')).toThrow();
    });

    test('handles empty array', () => {
        expect(vvTemplates.normalizeResponse([])).toEqual([]);
    });

    test('handles data key with empty array', () => {
        expect(vvTemplates.normalizeResponse({ data: [] })).toEqual([]);
    });
});

// ── shapeTemplate ─────────────────────────────────────────────────────

describe('shapeTemplate', () => {
    test('extracts all canonical fields', () => {
        const shaped = vvTemplates.shapeTemplate(RAW_API_TEMPLATE);
        expect(shaped).toEqual({
            id: '72c4f324-c4c9-ef11-aa72-eb211e6c4aa6',
            revisionId: 'cece51c3-4137-f011-aa96-ed284a10c535',
            name: 'Access Code',
            description: 'Access Code',
            revision: 10,
            templateRevision: '2.3',
            status: 1,
            modifyDate: '2025-05-22T12:21:06.87Z',
            createDate: '2025-01-03T03:16:15.497Z',
            modifyBy: 'jason.hatch@visualvault.com',
            createBy: 'alfredo.scilabra@visualvault.com',
        });
    });

    test('strips extra API fields (href, dataType, *ById)', () => {
        const shaped = vvTemplates.shapeTemplate(RAW_API_TEMPLATE);
        expect(shaped).not.toHaveProperty('href');
        expect(shaped).not.toHaveProperty('dataType');
        expect(shaped).not.toHaveProperty('modifyById');
        expect(shaped).not.toHaveProperty('createById');
    });

    test('defaults missing optional fields', () => {
        const minimal = { id: 'abc', revisionId: 'def', name: 'Test', revision: 1, status: 1 };
        const shaped = vvTemplates.shapeTemplate(minimal);
        expect(shaped.description).toBe('');
        expect(shaped.templateRevision).toBe('');
        expect(shaped.modifyDate).toBeNull();
        expect(shaped.createDate).toBeNull();
        expect(shaped.modifyBy).toBe('');
        expect(shaped.createBy).toBe('');
    });
});

// ── filterTemplates ───────────────────────────────────────────────────

describe('filterTemplates', () => {
    const shaped = RAW_API_TEMPLATES.map(vvTemplates.shapeTemplate);

    test('excludes z-prefixed templates by default', () => {
        const result = vvTemplates.filterTemplates(shaped);
        expect(result.every((t) => !t.name.toLowerCase().startsWith('z'))).toBe(true);
        expect(result).toHaveLength(3);
    });

    test('excludePrefix is case-insensitive', () => {
        const withUpperZ = [...shaped, vvTemplates.shapeTemplate({ ...RAW_API_TEMPLATE, name: 'Z-Upper' })];
        const result = vvTemplates.filterTemplates(withUpperZ, { excludePrefix: 'z' });
        expect(result.find((t) => t.name === 'Z-Upper')).toBeUndefined();
    });

    test('excludePrefix: null disables prefix filtering', () => {
        const result = vvTemplates.filterTemplates(shaped, { excludePrefix: null });
        expect(result).toHaveLength(4);
    });

    test('custom excludePrefix works', () => {
        const result = vvTemplates.filterTemplates(shaped, { excludePrefix: 'access' });
        expect(result.find((t) => t.name === 'Access Code')).toBeUndefined();
    });

    test('filter with glob pattern', () => {
        const result = vvTemplates.filterTemplates(shaped, { filter: 'Appendix*' });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Appendix A Water Type Classification');
    });

    test('filter with question mark wildcard', () => {
        const result = vvTemplates.filterTemplates(shaped, { filter: 'Access Cod?' });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Access Code');
    });

    test('filter is case-insensitive', () => {
        const result = vvTemplates.filterTemplates(shaped, { filter: 'access code' });
        expect(result).toHaveLength(1);
    });

    test('status filter', () => {
        const result = vvTemplates.filterTemplates(shaped, { excludePrefix: null, status: 0 });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('z-Test Draft Template');
    });

    test('combined filters', () => {
        const result = vvTemplates.filterTemplates(shaped, {
            excludePrefix: null,
            filter: 'A*',
            status: 1,
        });
        expect(result).toHaveLength(3);
        expect(result.map((t) => t.name)).toEqual([
            'Access Code',
            'Activity Map',
            'Appendix A Water Type Classification',
        ]);
    });

    test('results are sorted by name', () => {
        const result = vvTemplates.filterTemplates(shaped);
        const names = result.map((t) => t.name);
        expect(names).toEqual([...names].sort());
    });

    test('empty input returns empty array', () => {
        expect(vvTemplates.filterTemplates([])).toEqual([]);
    });

    test('no matches returns empty array', () => {
        const result = vvTemplates.filterTemplates(shaped, { filter: 'NonexistentTemplate' });
        expect(result).toEqual([]);
    });
});

// ── getExportUrl ──────────────────────────────────────────────────────

describe('getExportUrl', () => {
    test('builds correct export URL', () => {
        const url = vvTemplates.getExportUrl(MOCK_CONFIG, 'cece51c3-4137-f011-aa96-ed284a10c535');
        expect(url).toBe(
            'https://vv5dev.visualvault.com/app/WADNR/fpOnline/ExportForm?FormID=cece51c3-4137-f011-aa96-ed284a10c535'
        );
    });

    test('works with different config', () => {
        const config = { baseUrl: 'https://vvdemo.visualvault.com', customerAlias: 'Demo', databaseAlias: 'Main' };
        const url = vvTemplates.getExportUrl(config, 'abc-123');
        expect(url).toBe('https://vvdemo.visualvault.com/app/Demo/Main/ExportForm?FormID=abc-123');
    });
});

// ── getTemplates (mocked API) ─────────────────────────────────────────

describe('getTemplates', () => {
    const mockVvClient = {
        forms: {
            getFormTemplates: jest.fn(),
        },
    };

    beforeEach(() => {
        mockVvClient.forms.getFormTemplates.mockReset();
    });

    test('returns shaped and filtered templates from API', async () => {
        mockVvClient.forms.getFormTemplates.mockResolvedValue({ data: RAW_API_TEMPLATES });

        const result = await vvTemplates.getTemplates(MOCK_CONFIG, { vvClient: mockVvClient });

        expect(mockVvClient.forms.getFormTemplates).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(3); // z-prefixed excluded
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('revisionId');
        expect(result[0]).not.toHaveProperty('href');
    });

    test('passes filter options through', async () => {
        mockVvClient.forms.getFormTemplates.mockResolvedValue({ data: RAW_API_TEMPLATES });

        const result = await vvTemplates.getTemplates(MOCK_CONFIG, {
            vvClient: mockVvClient,
            filter: 'Access*',
        });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Access Code');
    });

    test('handles string response', async () => {
        mockVvClient.forms.getFormTemplates.mockResolvedValue(JSON.stringify({ data: RAW_API_TEMPLATES }));

        const result = await vvTemplates.getTemplates(MOCK_CONFIG, { vvClient: mockVvClient });
        expect(result).toHaveLength(3);
    });

    test('propagates API errors', async () => {
        mockVvClient.forms.getFormTemplates.mockRejectedValue(new Error('Network error'));

        await expect(vvTemplates.getTemplates(MOCK_CONFIG, { vvClient: mockVvClient })).rejects.toThrow(
            'Network error'
        );
    });
});

// ── getTemplateByName (mocked API) ────────────────────────────────────

describe('getTemplateByName', () => {
    const mockVvClient = {
        forms: {
            getFormTemplates: jest.fn(),
        },
    };

    beforeEach(() => {
        mockVvClient.forms.getFormTemplates.mockReset();
        mockVvClient.forms.getFormTemplates.mockResolvedValue({ data: RAW_API_TEMPLATES });
    });

    test('finds template by exact name', async () => {
        const result = await vvTemplates.getTemplateByName(MOCK_CONFIG, 'Access Code', {
            vvClient: mockVvClient,
        });

        expect(result).not.toBeNull();
        expect(result.name).toBe('Access Code');
        expect(result.revisionId).toBe('cece51c3-4137-f011-aa96-ed284a10c535');
    });

    test('name match is case-insensitive', async () => {
        const result = await vvTemplates.getTemplateByName(MOCK_CONFIG, 'access code', {
            vvClient: mockVvClient,
        });

        expect(result).not.toBeNull();
        expect(result.name).toBe('Access Code');
    });

    test('returns null for non-existent template', async () => {
        const result = await vvTemplates.getTemplateByName(MOCK_CONFIG, 'Does Not Exist', {
            vvClient: mockVvClient,
        });

        expect(result).toBeNull();
    });

    test('returns shaped template (no extra API fields)', async () => {
        const result = await vvTemplates.getTemplateByName(MOCK_CONFIG, 'Access Code', {
            vvClient: mockVvClient,
        });

        expect(result).not.toHaveProperty('href');
        expect(result).not.toHaveProperty('dataType');
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('revisionId');
    });
});
