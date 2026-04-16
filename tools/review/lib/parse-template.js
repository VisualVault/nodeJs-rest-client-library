/**
 * parse-template.js
 *
 * Parses a VV form template XML file into a standardized context object
 * consumed by review rules. Consolidates XML traversal logic so rules
 * never touch raw XML themselves.
 */

const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
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
 * Parse a single XML file and return a review context.
 *
 * @param {string} filePath - Absolute path to the XML file
 * @returns {Object} context object for rule evaluation
 */
function parseTemplate(filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const doc = parser.parse(xml);
    const entity = doc?.FormEntity;
    if (!entity) {
        throw new Error(`No FormEntity found in ${filePath}`);
    }

    const templateName = require('path').basename(filePath, '.xml');

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
        // Separate field members from form control members
        // FormControls with a real FormControlType (SaveButton, TabControl, etc.) are platform controls.
        // FieldType "FieldControls" with FormControlType "None" is a regular field (e.g., container).
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

module.exports = { parseTemplate, toBool };
