const path = require('path');
const fs = require('fs');
const os = require('os');
const {
    parseTemplate,
    parseJsonTemplate,
    FIELD_TYPE_MAP,
    toBool,
} = require('../../../tools/review/lib/parse-template');

// ── Fixtures ──────────────────────────────────────────────────────────

/** Minimal JSON fixture matching preformsapi merged format. */
const JSON_FIXTURE = {
    pages: {
        formTemplateId: 'tmpl-rev-id',
        name: 'Test Template',
        revision: 5,
        displayRevision: '1.0.2',
        pages: [
            {
                pageId: 'page-1',
                pageNumber: 1,
                pageName: 'Page 1',
                width: 900,
                height: 990,
                backgroundColor: '#FFFFFFFF',
                isRetired: false,
            },
            {
                pageId: 'page-2',
                pageNumber: 2,
                pageName: 'Details',
                width: 900,
                height: 500,
                backgroundColor: '#FFFFFFFF',
                isRetired: false,
            },
        ],
        isReleased: true,
    },
    controls: {
        formTemplateId: 'tmpl-rev-id',
        revision: 5,
        pages: [
            {
                pageId: 'page-1',
                fields: [
                    {
                        name: 'Con_Header',
                        id: 'field-container-1',
                        fieldType: 103,
                        width: 860,
                        height: 120,
                        responsiveFlow: 4,
                        backgroundColorString: '#ff003b71',
                        defaultValue: '',
                        errorMessage: '',
                        formVersion: 3,
                        pageId: 'page-1',
                        useColor: false,
                        version: '1',
                        zOrder: 1,
                    },
                    {
                        name: 'First Name',
                        id: 'field-textbox-1',
                        fieldType: 1,
                        width: 300,
                        height: 20,
                        length: 100,
                        enableQListener: true,
                        accessibilityLabel: 'First Name Input',
                        containerId: 'field-container-1',
                        layoutLeft: 10,
                        layoutTop: 20,
                        defaultValue: '',
                        errorMessage: '',
                        formVersion: 3,
                        pageId: 'page-1',
                        useColor: false,
                        version: '1',
                        zOrder: 2,
                    },
                    {
                        name: 'Status',
                        id: 'field-dropdown-1',
                        fieldType: 5,
                        width: 200,
                        containerId: 'field-container-1',
                        layoutLeft: 320,
                        layoutTop: 20,
                        defaultValue: '',
                        errorMessage: '',
                        formVersion: 3,
                        pageId: 'page-1',
                        useColor: false,
                        version: '1',
                        zOrder: 3,
                    },
                    {
                        name: 'btnSave',
                        id: 'field-button-1',
                        fieldType: 17,
                        width: 80,
                        height: 30,
                        text: 'Save',
                        layoutLeft: 10,
                        layoutTop: 100,
                        defaultValue: '',
                        errorMessage: '',
                        formVersion: 3,
                        pageId: 'page-1',
                        useColor: false,
                        version: '1',
                        zOrder: 4,
                    },
                ],
            },
            {
                pageId: 'page-2',
                fields: [
                    {
                        name: 'Notes',
                        id: 'field-textarea-1',
                        fieldType: 3,
                        width: 600,
                        height: 200,
                        length: 2000,
                        rows: 8,
                        layoutLeft: 10,
                        layoutTop: 10,
                        defaultValue: '',
                        errorMessage: '',
                        formVersion: 3,
                        pageId: 'page-2',
                        useColor: false,
                        version: '1',
                        zOrder: 1,
                    },
                ],
            },
        ],
    },
    scripts: [
        { name: 'SaveForm', scriptItemType: 0, controlId: null, eventId: null },
        { name: 'ClearFields', scriptItemType: 2, controlId: null, eventId: null },
        { name: 'FormatDateFields', scriptItemType: 2, controlId: null, eventId: null },
        { name: 'btnSave_onClick', scriptItemType: 1, controlId: 'field-button-1', eventId: 4 },
    ],
    conditions: [
        {
            groupId: 'group-1',
            groupName: 'AdminOverride',
            formControls: [{ fieldID: 'field-textbox-1', fieldName: '', fieldType: 2, formControlType: 0 }],
            isReadOnlyConditionList: [],
            isVisibleConditionList: [],
            isReadOnlyList: [],
            isVisibleList: [{ securityMemberID: 'sec-1', securityMemberType: 1 }],
        },
        {
            groupId: 'group-2',
            groupName: 'HideControls',
            formControls: [
                { fieldID: '00000001-0000-0000-0000-e1000000f003', fieldName: '', fieldType: 3, formControlType: 3 },
            ],
            isReadOnlyConditionList: [],
            isVisibleConditionList: [],
            isReadOnlyList: [],
            isVisibleList: [],
        },
    ],
    _meta: {
        source: 'preformsapi',
        fetchedAt: '2026-04-16T10:00:00.000Z',
        revisionId: 'tmpl-rev-id',
    },
};

// ── Helpers ───────────────────────────────────────────────────────────

let tmpDir;

function writeJsonFixture(name, data) {
    const filePath = path.join(tmpDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
}

// ── Setup / Teardown ─────────────────────────────────────────────────

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-parse-template-test-'));
});

afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── toBool ───────────────────────────────────────────────────────────

describe('toBool', () => {
    test('handles boolean values', () => {
        expect(toBool(true)).toBe(true);
        expect(toBool(false)).toBe(false);
    });

    test('handles string values', () => {
        expect(toBool('true')).toBe(true);
        expect(toBool('True')).toBe(true);
        expect(toBool('false')).toBe(false);
        expect(toBool('other')).toBe(false);
    });

    test('handles other types', () => {
        expect(toBool(undefined)).toBe(false);
        expect(toBool(null)).toBe(false);
        expect(toBool(0)).toBe(false);
    });
});

// ── FIELD_TYPE_MAP ───────────────────────────────────────────────────

describe('FIELD_TYPE_MAP', () => {
    test('maps all known numeric types to XML type names', () => {
        expect(FIELD_TYPE_MAP[1]).toBe('FieldTextbox3');
        expect(FIELD_TYPE_MAP[3]).toBe('FieldTextArea3');
        expect(FIELD_TYPE_MAP[4]).toBe('FieldCheckbox');
        expect(FIELD_TYPE_MAP[5]).toBe('FieldDropDownList3');
        expect(FIELD_TYPE_MAP[6]).toBe('FieldLabel');
        expect(FIELD_TYPE_MAP[13]).toBe('FieldCalendar3');
        expect(FIELD_TYPE_MAP[17]).toBe('FormButton');
        expect(FIELD_TYPE_MAP[103]).toBe('FieldContainer');
    });
});

// ── parseTemplate dispatch ───────────────────────────────────────────

describe('parseTemplate dispatch', () => {
    test('dispatches .json files to JSON parser', () => {
        const filePath = writeJsonFixture('Test-Template', JSON_FIXTURE);
        const ctx = parseTemplate(filePath);
        expect(ctx.templateName).toBe('Test-Template');
        expect(ctx.doc).toBeNull();
    });
});

// ── parseJsonTemplate ────────────────────────────────────────────────

describe('parseJsonTemplate', () => {
    test('extracts template name from filename', () => {
        const filePath = writeJsonFixture('My-Template', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);
        expect(ctx.templateName).toBe('My-Template');
    });

    test('sets doc to null for JSON templates', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);
        expect(ctx.doc).toBeNull();
    });

    test('extracts pages with correct shape', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        expect(ctx.pages).toHaveLength(2);
        expect(ctx.pages[0]).toEqual({
            index: 0,
            id: 'page-1',
            name: 'Page 1',
            width: 900,
            height: 990,
        });
        expect(ctx.pages[1].name).toBe('Details');
    });

    test('extracts fields with XML-compatible type names', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        expect(ctx.fields).toHaveLength(5);

        const container = ctx.fields.find((f) => f.name === 'Con_Header');
        expect(container.type).toBe('FieldContainer');

        const textbox = ctx.fields.find((f) => f.name === 'First Name');
        expect(textbox.type).toBe('FieldTextbox3');

        const dropdown = ctx.fields.find((f) => f.name === 'Status');
        expect(dropdown.type).toBe('FieldDropDownList3');

        const button = ctx.fields.find((f) => f.name === 'btnSave');
        expect(button.type).toBe('FormButton');

        const textarea = ctx.fields.find((f) => f.name === 'Notes');
        expect(textarea.type).toBe('FieldTextArea3');
    });

    test('assigns correct pageIndex and pageName to fields', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        const firstPageFields = ctx.fields.filter((f) => f.pageIndex === 0);
        const secondPageFields = ctx.fields.filter((f) => f.pageIndex === 1);

        expect(firstPageFields).toHaveLength(4);
        expect(secondPageFields).toHaveLength(1);
        expect(firstPageFields[0].pageName).toBe('Page 1');
        expect(secondPageFields[0].pageName).toBe('Details');
    });

    test('extracts field properties correctly', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        const textbox = ctx.fields.find((f) => f.name === 'First Name');
        expect(textbox.id).toBe('field-textbox-1');
        expect(textbox.width).toBe(300);
        expect(textbox.containerId).toBe('field-container-1');
        expect(textbox.layoutLeft).toBe(10);
        expect(textbox.layoutTop).toBe(20);
        expect(textbox.accessibilityLabel).toBe('First Name Input');
        expect(textbox.zOrder).toBe(2);
    });

    test('builds synthetic _raw with PascalCase keys for rule compatibility', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        const textbox = ctx.fields.find((f) => f.name === 'First Name');
        expect(textbox._raw.Width).toBe(300);
        expect(textbox._raw.Height).toBe(20);
        expect(textbox._raw.EnableQListener).toBe(true);
        expect(textbox._raw.Length).toBe(100);
        expect(textbox._raw.Name).toBe('First Name');
    });

    test('populates controlMap correctly', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        expect(ctx.controlMap.size).toBe(5);
        const entry = ctx.controlMap.get('field-textbox-1');
        expect(entry).toEqual({ name: 'First Name', type: 'FieldTextbox3', pageIndex: 0 });
    });

    test('separates scripts from assignments by scriptItemType', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        // Scripts: type 0 (template) + type 2 (global)
        expect(ctx.scripts).toHaveLength(3);
        expect(ctx.scripts[0]).toEqual({ id: 'SaveForm', name: 'SaveForm', code: '', type: 'Template' });
        expect(ctx.scripts[1]).toEqual({ id: 'ClearFields', name: 'ClearFields', code: '', type: 'Global' });

        // Assignments: type 1
        expect(ctx.assignments).toHaveLength(1);
        expect(ctx.assignments[0]).toEqual({
            scriptId: 'btnSave_onClick',
            controlId: 'field-button-1',
            eventId: '4',
        });
    });

    test('extracts groups from conditions', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        expect(ctx.groups).toHaveLength(2);
        expect(ctx.groups[0].name).toBe('AdminOverride');
        expect(ctx.groups[0].securityMembers).toHaveLength(1);
    });

    test('classifies group members into fields vs form controls', () => {
        const filePath = writeJsonFixture('Test', JSON_FIXTURE);
        const ctx = parseJsonTemplate(filePath);

        // group-1: fieldType=2, formControlType=0 (None) → regular field
        expect(ctx.groups[0].fieldMembers).toHaveLength(1);
        expect(ctx.groups[0].formControlMembers).toHaveLength(0);

        // group-2: formControlType=3 (SaveButton) → form control
        expect(ctx.groups[1].fieldMembers).toHaveLength(0);
        expect(ctx.groups[1].formControlMembers).toEqual(['SaveButton']);
    });

    test('handles unknown field types gracefully', () => {
        const fixture = {
            ...JSON_FIXTURE,
            controls: {
                pages: [
                    {
                        pageId: 'page-1',
                        fields: [{ name: 'Unknown', id: 'u1', fieldType: 999, width: 100, zOrder: 1 }],
                    },
                ],
            },
        };
        const filePath = writeJsonFixture('Test', fixture);
        const ctx = parseJsonTemplate(filePath);

        expect(ctx.fields[0].type).toBe('Unknown_999');
    });

    test('handles empty controls', () => {
        const fixture = { ...JSON_FIXTURE, controls: { pages: [] }, scripts: [], conditions: [] };
        const filePath = writeJsonFixture('Empty', fixture);
        const ctx = parseJsonTemplate(filePath);

        expect(ctx.fields).toHaveLength(0);
        expect(ctx.scripts).toHaveLength(0);
        expect(ctx.groups).toHaveLength(0);
    });
});
