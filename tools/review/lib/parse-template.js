/**
 * parse-template.js
 *
 * Parses VV form template files (XML or JSON) into a standardized context
 * object consumed by review rules. Consolidates format-specific traversal
 * so rules never touch raw XML or JSON themselves.
 *
 * XML files come from the ExportForm endpoint. JSON files come from
 * preformsapi.visualvault.com (fallback for templates that can't be exported).
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) =>
        ['BaseField', 'FormScriptItem', 'FormScriptAssignment', 'FormPage', 'Group', 'FieldMember'].includes(name),
});

function toBool(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
}

/**
 * Numeric fieldType → XML @xsi:type name mapping.
 * Built from cross-referencing preformsapi JSON with exported XML across
 * all 88 WADNR templates.
 */
const FIELD_TYPE_MAP = {
    1: 'FieldTextbox3',
    3: 'FieldTextArea3',
    4: 'FieldCheckbox',
    5: 'FieldDropDownList3',
    6: 'FieldLabel',
    10: 'UserIDStamp',
    11: 'FormIDStamp',
    13: 'FieldCalendar3',
    14: 'CellField',
    17: 'FormButton',
    19: 'ImageFormControl',
    20: 'UploadButton',
    24: 'RepeatingRowControl',
    25: 'RepeatingRowControlColumn',
    26: 'FieldDataGrid',
    27: 'QuestionsControl',
    102: 'FieldRectangle',
    103: 'FieldContainer',
};

/**
 * Numeric formControlType → XML FormControlType name mapping.
 * Used in conditions/groups to classify platform controls vs fields.
 */
const FORM_CONTROL_TYPE_MAP = {
    0: 'None',
    3: 'SaveButton',
    8: 'TabControl',
};

/**
 * Dispatch: parse a template file (XML or JSON) and return a review context.
 *
 * @param {string} filePath - Absolute path to the template file
 * @returns {Object} context object for rule evaluation
 */
function parseTemplate(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') return parseJsonTemplate(filePath);
    return parseXmlTemplate(filePath);
}

// ─── XML Parser ──────────────────────────────────────────────────────────────

/**
 * Parse an XML template file (from ExportForm endpoint).
 */
function parseXmlTemplate(filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const doc = xmlParser.parse(xml);
    const entity = doc?.FormEntity;
    if (!entity) {
        throw new Error(`No FormEntity found in ${filePath}`);
    }

    const templateName = path.basename(filePath, '.xml');

    // --- Pages ---
    const rawPages = entity.FormPages?.FormPage || [];
    const pages = rawPages.map((p, i) => ({
        index: i,
        id: p['@_ID'] || p.ID || String(i),
        name: p.Name || `Page ${i + 1}`,
        width: Number(p.Width || 0),
        height: Number(p.Height || 0),
    }));

    // --- Fields ---
    const fields = [];
    const controlMap = new Map();

    for (let pageIdx = 0; pageIdx < rawPages.length; pageIdx++) {
        const page = rawPages[pageIdx];
        const pageName = pages[pageIdx]?.name || `Page ${pageIdx + 1}`;
        const baseFields = page.FieldList?.BaseField || [];

        for (const bf of baseFields) {
            const fieldType = bf['@_xsi:type'] || '';
            const name = bf.Name || '';
            const id = bf.ID || '';

            const field = {
                name,
                id,
                type: fieldType,
                pageIndex: pageIdx,
                pageName,
                containerId: bf.ContainerId || '',
                layoutLeft: Number(bf.LayoutLeft || 0),
                layoutTop: Number(bf.LayoutTop || 0),
                width: Number(bf.Width || 0),
                tabOrder: Number(bf.TabOrder || 0),
                accessibilityLabel: bf.AccessibilityLabel || '',
                text: bf.Text || '',
                zOrder: Number(bf.ZOrder || 0),
                // Calendar-specific
                enableTime: toBool(bf.EnableTime),
                ignoreTimezone: toBool(bf.IgnoreTimezone),
                useLegacy: toBool(bf.UseLegacyDatePicker),
                // Container-specific
                responsiveFlow: bf.ResponsiveFlow || '',
                // Upload-specific
                displayUploadedFiles: bf.DisplayUploadedFiles || '',
                // Raw reference
                _raw: bf,
            };

            fields.push(field);
            controlMap.set(id, { name, type: fieldType, pageIndex: pageIdx });
        }
    }

    // --- Scripts ---
    const scripts = [];
    const scriptItems = entity.ScriptLibrary?.FormScriptItem || [];
    const itemList = Array.isArray(scriptItems) ? scriptItems : [scriptItems];
    for (const item of itemList) {
        if (!item || !item.ScriptItemId) continue;
        scripts.push({
            id: item.ScriptItemId,
            name: item.Name || '(unnamed)',
            code: String(item.Script || ''),
            type: item.ScriptItemType || '',
        });
    }

    // --- Script Assignments ---
    const assignments = [];
    const rawAssignments = entity.ScriptAssignments?.FormScriptAssignment || [];
    const assignList = Array.isArray(rawAssignments) ? rawAssignments : [rawAssignments];
    for (const assign of assignList) {
        if (!assign) continue;
        assignments.push({
            scriptId: assign.ScriptItemId || '',
            controlId: assign.ControlId || '',
            eventId: assign.EventId || '',
        });
    }

    // --- Groups ---
    const groups = [];
    const rawGroups = entity.GroupsHolder?.GroupCollection?.Group || [];
    for (const g of rawGroups) {
        const members = g.FieldCollection?.FieldMember || [];
        const memberList = Array.isArray(members) ? members : [members];
        const fieldMembersOut = [];
        const formControlMembers = [];
        for (const m of memberList.filter((x) => x)) {
            const fct = m.FormControlType || '';
            if (fct && fct !== 'None') {
                formControlMembers.push(fct);
            } else {
                fieldMembersOut.push({ fieldId: m.FieldID || '', fieldType: m.FieldType || '' });
            }
        }

        groups.push({
            name: g.GroupName || '(unnamed)',
            fieldMembers: fieldMembersOut,
            formControlMembers,
            conditions: g.ConditionCollection || null,
            readOnlyConditions: g.ReadOnlyConditionCollection || null,
            securityMembers: g.SecurityMemberCollection || null,
            readOnlySecurityMembers: g.SecurityMemberReadonlyCollection || null,
            _raw: g,
        });
    }

    return {
        doc: entity,
        fields,
        pages,
        scripts,
        assignments,
        groups,
        controlMap,
        templateName,
    };
}

// ─── JSON Parser ─────────────────────────────────────────────────────────────

/**
 * Build a synthetic PascalCase _raw object from a JSON field.
 * Rules that access _raw expect PascalCase property names (XML convention).
 * Only includes properties that existing rules actually use.
 */
function buildSyntheticRaw(jf) {
    return {
        Width: jf.width,
        Height: jf.height,
        EnableQListener: jf.enableQListener,
        Length: jf.length,
        TabOrder: 0,
        Name: jf.name,
        ID: jf.id,
        Text: jf.text || '',
        AccessibilityLabel: jf.accessibilityLabel || '',
        ContainerId: jf.containerId || '',
        LayoutLeft: jf.layoutLeft,
        LayoutTop: jf.layoutTop,
        ZOrder: jf.zOrder,
        ResponsiveFlow: jf.responsiveFlow,
        DisplayUploadedFiles: jf.displayUploadedFiles,
    };
}

/**
 * Parse a JSON template file (from preformsapi.visualvault.com fallback).
 *
 * The JSON file is a merged object with: pages, controls, scripts, conditions.
 * Produces the same context shape as parseXmlTemplate.
 */
function parseJsonTemplate(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const templateName = path.basename(filePath, '.json');

    // --- Pages ---
    // Pages come from both `pages` (template metadata) and `controls` (field data).
    // The pages endpoint has page metadata; controls has the per-page fields.
    const pagesData = raw.pages?.pages || raw.controls?.pages || [];
    const pageIdToIndex = new Map();

    const pages = pagesData.map((p, i) => {
        pageIdToIndex.set(p.pageId, i);
        return {
            index: i,
            id: p.pageId || String(i),
            name: p.pageName || `Page ${i + 1}`,
            width: Number(p.width || 0),
            height: Number(p.height || 0),
        };
    });

    // --- Fields ---
    const fields = [];
    const controlMap = new Map();
    const controlPages = raw.controls?.pages || [];

    for (const cp of controlPages) {
        const pageIdx = pageIdToIndex.get(cp.pageId) ?? 0;
        const pageName = pages[pageIdx]?.name || `Page ${pageIdx + 1}`;

        for (const jf of cp.fields || []) {
            const numericType = jf.fieldType;
            const fieldType = FIELD_TYPE_MAP[numericType] || `Unknown_${numericType}`;
            const name = jf.name || '';
            const id = jf.id || '';

            const field = {
                name,
                id,
                type: fieldType,
                pageIndex: pageIdx,
                pageName,
                containerId: jf.containerId || '',
                layoutLeft: Number(jf.layoutLeft || 0),
                layoutTop: Number(jf.layoutTop || 0),
                width: Number(jf.width || 0),
                tabOrder: 0,
                accessibilityLabel: jf.accessibilityLabel || '',
                text: jf.text || '',
                zOrder: Number(jf.zOrder || 0),
                // Calendar-specific (not present in preformsapi Controls)
                enableTime: false,
                ignoreTimezone: false,
                useLegacy: false,
                // Container-specific
                responsiveFlow: jf.responsiveFlow != null ? String(jf.responsiveFlow) : '',
                // Upload-specific
                displayUploadedFiles: jf.displayUploadedFiles || '',
                // Synthetic PascalCase raw for rules that access _raw
                _raw: buildSyntheticRaw(jf),
            };

            fields.push(field);
            controlMap.set(id, { name, type: fieldType, pageIndex: pageIdx });
        }
    }

    // --- Scripts ---
    // JSON scripts endpoint returns merged list: type 0 (template), 1 (assigned), 2 (global).
    // No source code is available from this endpoint.
    const scripts = [];
    const assignments = [];
    const rawScripts = raw.scripts || [];

    for (const s of rawScripts) {
        if (s.scriptItemType === 1) {
            // Assigned script → goes into assignments
            assignments.push({
                scriptId: s.name || '',
                controlId: s.controlId || '',
                eventId: String(s.eventId ?? ''),
            });
        } else {
            // Template (0) or Global (2) script → goes into scripts
            const typeStr = s.scriptItemType === 0 ? 'Template' : 'Global';
            scripts.push({
                id: s.name || '',
                name: s.name || '(unnamed)',
                code: '',
                type: typeStr,
            });
        }
    }

    // --- Groups (from conditions endpoint) ---
    const groups = [];
    const rawConditions = raw.conditions || [];

    for (const g of rawConditions) {
        const fieldMembersOut = [];
        const formControlMembers = [];

        for (const fc of g.formControls || []) {
            const fctName = FORM_CONTROL_TYPE_MAP[fc.formControlType] || '';
            if (fctName && fctName !== 'None') {
                formControlMembers.push(fctName);
            } else {
                const ftName = FIELD_TYPE_MAP[fc.fieldType] || `Unknown_${fc.fieldType}`;
                fieldMembersOut.push({ fieldId: fc.fieldID || '', fieldType: ftName });
            }
        }

        groups.push({
            name: g.groupName || '(unnamed)',
            fieldMembers: fieldMembersOut,
            formControlMembers,
            conditions: g.isVisibleConditionList?.length ? g.isVisibleConditionList : null,
            readOnlyConditions: g.isReadOnlyConditionList?.length ? g.isReadOnlyConditionList : null,
            securityMembers: g.isVisibleList?.length ? g.isVisibleList : null,
            readOnlySecurityMembers: g.isReadOnlyList?.length ? g.isReadOnlyList : null,
            _raw: g,
        });
    }

    return {
        doc: null,
        fields,
        pages,
        scripts,
        assignments,
        groups,
        controlMap,
        templateName,
    };
}

module.exports = { parseTemplate, parseXmlTemplate, parseJsonTemplate, toBool, FIELD_TYPE_MAP };
