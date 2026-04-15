#!/usr/bin/env node
/**
 * Generates a redesigned DateTest form template XML with:
 * - Descriptive field names (Cal_A, Pre_B, Cur_C, etc.)
 * - Labels for every calendar field showing its config
 * - Clear visual grouping by section (Base, Preset, Current Date)
 * - 2-column layout: Modern (A-D) left, Legacy (E-H) right
 *
 * Every XML element and attribute is copied verbatim from the original
 * DateTest and Subscription Pack template exports to avoid introducing
 * structural bugs. Only values (name, position, config flags) change.
 */

const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

// ── Config definitions ──────────────────────────────────────────────
const CONFIGS = [
    { letter: 'A', enableTime: false, ignoreTZ: false, useLegacy: false, label: 'Date-only' },
    { letter: 'B', enableTime: false, ignoreTZ: true, useLegacy: false, label: 'Date-only \u00b7 IgnoreTZ' },
    { letter: 'C', enableTime: true, ignoreTZ: false, useLegacy: false, label: 'DateTime' },
    { letter: 'D', enableTime: true, ignoreTZ: true, useLegacy: false, label: 'DateTime \u00b7 IgnoreTZ' },
    { letter: 'E', enableTime: false, ignoreTZ: false, useLegacy: true, label: 'Date-only \u00b7 Legacy' },
    {
        letter: 'F',
        enableTime: false,
        ignoreTZ: true,
        useLegacy: true,
        label: 'Date-only \u00b7 IgnoreTZ \u00b7 Legacy',
    },
    { letter: 'G', enableTime: true, ignoreTZ: false, useLegacy: true, label: 'DateTime \u00b7 Legacy' },
    { letter: 'H', enableTime: true, ignoreTZ: true, useLegacy: true, label: 'DateTime \u00b7 IgnoreTZ \u00b7 Legacy' },
];

const MODERN = CONFIGS.filter((c) => !c.useLegacy);
const LEGACY = CONFIGS.filter((c) => c.useLegacy);

const SECTIONS = [
    { prefix: 'Cal', title: 'Base Fields (No Initial Value)', enableInitial: false, mode: 'CurrentDate' },
    { prefix: 'Pre', title: 'Preset Date (03/01/2026)', enableInitial: true, mode: 'PresetDate' },
    { prefix: 'Cur', title: 'Current Date (Auto-Fill)', enableInitial: true, mode: 'CurrentDate' },
];

// ── Layout constants ────────────────────────────────────────────────
const LEFT_X = 30;
const RIGHT_X = 430;
const FIELD_W = 300;
const LABEL_W = 360;
const ROW_SPACING = 55;
const SECTION_GAP = 50;

// ── IDs ─────────────────────────────────────────────────────────────
const TEMPLATE_ID = uuid();
const TEMPLATE_CH_ID = uuid();
const PAGE_ID = uuid();
const CONTAINER_ID = uuid();
const BTN_SAVE_ID = uuid();
const BTN_CALLWS_ID = uuid();
const CREATOR_ID = '54c4dd9c-5ec8-eb11-a9c8-86f2d773c51f';
const PRESET_DATE = '2026-03-01T03:00:00Z';
const CONFIG_TS = '2026-04-02T20:00:00Z';
const T = '\t';

// ── XML escape ──────────────────────────────────────────────────────
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ──────────────────────────────────────────────────────────────────
// Field generators — each matches the exact element order from the
// original VV template exports (DateTest + Subscription Pack).
// ──────────────────────────────────────────────────────────────────

/**
 * Shared base properties — identical element set across all BaseField types
 * in the DateTest template. Matches lines 41-86 / 95-140 / 174-219.
 */
function baseProps(id, name, fieldType, containerId, x, y, zOrder, version, isDataReporting = true) {
    const p = (n) => `${T}${T}${T}${T}${T}`;
    return [
        `${p()}<BackgroundColor>0</BackgroundColor>`,
        `${p()}<BackgroundColorString>#00FFFFFF</BackgroundColorString>`,
        `${p()}<ConnectionString />`,
        `${p()}<Container>0</Container>`,
        `${p()}<ContainerId>${containerId}</ContainerId>`,
        `${p()}<ContainerLayoutTopOffset>0</ContainerLayoutTopOffset>`,
        `${p()}<ErrorMessage />`,
        `${p()}<ErrorPIC>~\\scripts\\error.gif</ErrorPIC>`,
        `${p()}<ExtCcID>00000000-0000-0000-0000-000000000000</ExtCcID>`,
        `${p()}<ExtCqID>00000000-0000-0000-0000-000000000000</ExtCqID>`,
        `${p()}<ExtEnableQuery>false</ExtEnableQuery>`,
        `${p()}<ExternalQuery />`,
        `${p()}<FieldMappings />`,
        `${p()}<FieldToColumnMappingList />`,
        `${p()}<QueryColumnOperatorMappingList />`,
        `${p()}<FieldType>${fieldType}</FieldType>`,
        `${p()}<ForeColor>0</ForeColor>`,
        `${p()}<ForegroundColorString>#FF000000</ForegroundColorString>`,
        `${p()}<ID>${id}</ID>`,
        `${p()}<IsRetired>false</IsRetired>`,
        `${p()}<LayoutLeft>${x}</LayoutLeft>`,
        `${p()}<LayoutTop>${y}</LayoutTop>`,
        `${p()}<Name>${esc(name)}</Name>`,
        `${p()}<ObjectProperty xsi:nil="true" />`,
        `${p()}<ObjectModel xsi:nil="true" />`,
        `${p()}<PageId>${PAGE_ID}</PageId>`,
        `${p()}<PrimaryKey />`,
        `${p()}<RenderAsReadOnly>false</RenderAsReadOnly>`,
        `${p()}<RenderValidationError>false</RenderValidationError>`,
        `${p()}<RowID />`,
        `${p()}<Section508Compliant>false</Section508Compliant>`,
        `${p()}<SectionID />`,
        `${p()}<SectionIndex>0</SectionIndex>`,
        `${p()}<TabOrder>0</TabOrder>`,
        `${p()}<UseColor>false</UseColor>`,
        `${p()}<ValidationErrorMessage />`,
        `${p()}<ValidationErrorPic>~\\scripts\\error.gif</ValidationErrorPic>`,
        `${p()}<Value />`,
        `${p()}<Version>${version}</Version>`,
        `${p()}<ZOrder>${zOrder}</ZOrder>`,
        `${p()}<IsDataReportingColumn>${isDataReporting}</IsDataReportingColumn>`,
        `${p()}<IsPrintableField>true</IsPrintableField>`,
        `${p()}<FormVersion>FormVersion4</FormVersion>`,
        `${p()}<AccessibilityLabel />`,
        `${p()}<AccessibilityLabelType>Attribute</AccessibilityLabelType>`,
        `${p()}<LocalizationStrings />`,
    ].join('\n');
}

const P5 = `${T}${T}${T}${T}${T}`;
const P4 = `${T}${T}${T}${T}`;

/**
 * FieldContainer — matches DateTest lines 40-93 exactly.
 */
function makeContainer(id, w, h) {
    return [
        `${P4}<BaseField xsi:type="FieldContainer">`,
        baseProps(id, 'Container1', 'Container', '00000000-0000-0000-0000-000000000000', 0, 0, 1, 1),
        `${P5}<Index>0</Index>`,
        `${P5}<Width>${w}</Width>`,
        `${P5}<Height>${h}</Height>`,
        `${P5}<Style>0</Style>`,
        `${P5}<ResponsiveFlow>0</ResponsiveFlow>`,
        `${P5}<isCollapsible>false</isCollapsible>`,
        `${P4}</BaseField>`,
    ].join('\n');
}

/**
 * FieldLabel — matches Subscription Pack template lines 98-155.
 * Element order: base → Align → AssociatedControlID → Bold →
 * EnableQListener → FontSize → LabelWrap → Text → Width
 */
function makeLabel(name, text, x, y, w, bold = false, fontSize = 10) {
    const id = uuid();
    return [
        `${P4}<BaseField xsi:type="FieldLabel">`,
        baseProps(id, name, 'Label', CONTAINER_ID, x, y, 1, 1),
        `${P5}<Align>Left</Align>`,
        `${P5}<AssociatedControlID>00000000-0000-0000-0000-000000000000</AssociatedControlID>`,
        `${P5}<Bold>${bold}</Bold>`,
        `${P5}<EnableQListener>false</EnableQListener>`,
        `${P5}<FontSize>${fontSize}</FontSize>`,
        `${P5}<LabelWrap>true</LabelWrap>`,
        `${P5}<Text>${esc(text)}</Text>`,
        `${P5}<Width>${w}</Width>`,
        `${P4}</BaseField>`,
    ].join('\n');
}

/**
 * FieldCalendar3 — matches DateTest lines 173-233 exactly.
 * Element order: base → IsValidatorShowing → ValidationType →
 * EnableTime → EnableInitialValue → EnableQListener → InitialDate →
 * InitialValueMode → Text → Width → ValidationIconHeight →
 * ValidationIconWidth → UseLegacy → IgnoreTimezone
 */
function makeCalendar(name, config, x, y, enableInitial, initialMode) {
    const id = uuid();
    const initDate = initialMode === 'PresetDate' ? PRESET_DATE : CONFIG_TS;
    return [
        `${P4}<BaseField xsi:type="FieldCalendar3">`,
        baseProps(id, name, 'Calendar', CONTAINER_ID, x, y, 1, 1),
        `${P5}<IsValidatorShowing>false</IsValidatorShowing>`,
        `${P5}<ValidationType>NoValidation</ValidationType>`,
        `${P5}<EnableTime>${config.enableTime}</EnableTime>`,
        `${P5}<EnableInitialValue>${enableInitial}</EnableInitialValue>`,
        `${P5}<EnableQListener>false</EnableQListener>`,
        `${P5}<InitialDate>${initDate}</InitialDate>`,
        `${P5}<InitialValueMode>${initialMode}</InitialValueMode>`,
        `${P5}<Text />`,
        `${P5}<Width>${FIELD_W}</Width>`,
        `${P5}<ValidationIconHeight>16</ValidationIconHeight>`,
        `${P5}<ValidationIconWidth>16</ValidationIconWidth>`,
        `${P5}<UseLegacy>${config.useLegacy}</UseLegacy>`,
        `${P5}<IgnoreTimezone>${config.ignoreTZ}</IgnoreTimezone>`,
        `${P4}</BaseField>`,
    ].join('\n');
}

/**
 * FormButton — matches DateTest lines 94-172 exactly.
 * Note: IsDataReportingColumn is false for buttons (line 135).
 * Element order: base → AssignToWFEnabled → CopyFieldValuesFieldList →
 * EnableCopyFieldValues → EnableEmailLink → EnableFillinRelate →
 * EnableQListener → FalseStep → FillinRelateFieldList →
 * FillinRelateLookupKey → FillinRelateTemplateId → FontSize →
 * FormSaveEnabled → Formula → NewWindowUrl → OpenNewWindow →
 * OutsideProcesID → OutsideValidationEnabled → RedirectUrl →
 * RedirectionEnabled → RelateForm → RenderAsHyperlink →
 * TaskOptionAssignment → Text → TrueStep →
 * ValidationTaskCompletionConfig → WFSequence → WaID → Width →
 * Height → WizardStepEnabled → IsDataReportingColumnHasBeenSet
 */
function makeButton(id, name, text, x, y) {
    return [
        `${P4}<BaseField xsi:type="FormButton">`,
        baseProps(id, name, 'FormButton', CONTAINER_ID, x, y, 1, 1, false),
        `${P5}<AssignToWFEnabled>false</AssignToWFEnabled>`,
        `${P5}<CopyFieldValuesFieldList />`,
        `${P5}<EnableCopyFieldValues>false</EnableCopyFieldValues>`,
        `${P5}<EnableEmailLink>false</EnableEmailLink>`,
        `${P5}<EnableFillinRelate>false</EnableFillinRelate>`,
        `${P5}<EnableQListener>false</EnableQListener>`,
        `${P5}<FalseStep>0</FalseStep>`,
        `${P5}<FillinRelateFieldList />`,
        `${P5}<FillinRelateLookupKey>00000000-0000-0000-0000-000000000000</FillinRelateLookupKey>`,
        `${P5}<FillinRelateTemplateId>00000000-0000-0000-0000-000000000000</FillinRelateTemplateId>`,
        `${P5}<FontSize>10</FontSize>`,
        `${P5}<FormSaveEnabled>false</FormSaveEnabled>`,
        `${P5}<Formula />`,
        `${P5}<NewWindowUrl />`,
        `${P5}<OpenNewWindow>false</OpenNewWindow>`,
        `${P5}<OutsideProcesID>00000000-0000-0000-0000-000000000000</OutsideProcesID>`,
        `${P5}<OutsideValidationEnabled>false</OutsideValidationEnabled>`,
        `${P5}<RedirectUrl />`,
        `${P5}<RedirectionEnabled>false</RedirectionEnabled>`,
        `${P5}<RelateForm>true</RelateForm>`,
        `${P5}<RenderAsHyperlink>false</RenderAsHyperlink>`,
        `${P5}<TaskOptionAssignment>0</TaskOptionAssignment>`,
        `${P5}<Text>${esc(text)}</Text>`,
        `${P5}<TrueStep>0</TrueStep>`,
        `${P5}<ValidationTaskCompletionConfig>0</ValidationTaskCompletionConfig>`,
        `${P5}<WFSequence>0</WFSequence>`,
        `${P5}<WaID>00000000-0000-0000-0000-000000000000</WaID>`,
        `${P5}<Width>75</Width>`,
        `${P5}<Height>28</Height>`,
        `${P5}<WizardStepEnabled>false</WizardStepEnabled>`,
        `${P5}<IsDataReportingColumnHasBeenSet>false</IsDataReportingColumnHasBeenSet>`,
        `${P4}</BaseField>`,
    ].join('\n');
}

/**
 * FieldTextArea3 — matches DateTest lines 1838-1898 exactly.
 * Note: BackgroundColorString is #FFFFFFFF (not #00FFFFFF).
 * Element order: base → IsValidatorShowing → ValidationType →
 * EnableQListener → Length → EnableCharCount → Rows → Text →
 * FontSize → Width → Height → RenderAsHtmlEditor →
 * ValidationIconHeight → ValidationIconWidth
 */
function makeTextArea(name, x, y, w, h, rows) {
    const id = uuid();
    // TextArea has white background (#FFFFFFFF) unlike other fields (#00FFFFFF)
    const lines = [
        `${P4}<BaseField xsi:type="FieldTextArea3">`,
        baseProps(id, name, 'MultiLineTextbox', CONTAINER_ID, x, y, 2, 3),
        `${P5}<IsValidatorShowing>false</IsValidatorShowing>`,
        `${P5}<ValidationType>NoValidation</ValidationType>`,
        `${P5}<EnableQListener>false</EnableQListener>`,
        `${P5}<Length>500</Length>`,
        `${P5}<EnableCharCount>false</EnableCharCount>`,
        `${P5}<Rows>${rows}</Rows>`,
        `${P5}<Text />`,
        `${P5}<FontSize>10</FontSize>`,
        `${P5}<Width>${w}</Width>`,
        `${P5}<Height>${h}</Height>`,
        `${P5}<RenderAsHtmlEditor>false</RenderAsHtmlEditor>`,
        `${P5}<ValidationIconHeight>16</ValidationIconHeight>`,
        `${P5}<ValidationIconWidth>16</ValidationIconWidth>`,
        `${P4}</BaseField>`,
    ].join('\n');
    // Fix BackgroundColorString for TextArea
    return lines.replace(
        '<BackgroundColorString>#00FFFFFF</BackgroundColorString>',
        '<BackgroundColorString>#FFFFFFFF</BackgroundColorString>'
    );
}

// ──────────────────────────────────────────────────────────────────
// Build the field list
// ──────────────────────────────────────────────────────────────────
const fields = [];
let curY = 10;

// ── Buttons ─────────────────────────────────────────────────────
fields.push(makeButton(BTN_SAVE_ID, 'btnSave', 'Save', 710, curY));
fields.push(makeButton(BTN_CALLWS_ID, 'btnCallWS', 'Call WS', 610, curY));
curY += 45;

// ── Calendar sections ───────────────────────────────────────────
for (const section of SECTIONS) {
    // Section header
    fields.push(
        makeLabel(`Lbl_${section.prefix}`, `\u2500\u2500 ${section.title} \u2500\u2500`, LEFT_X, curY, 780, true, 12)
    );
    curY += 30;

    // Column sub-headers
    fields.push(makeLabel(`Lbl_${section.prefix}_Modern`, 'Modern (useLegacy: OFF)', LEFT_X, curY, LABEL_W, true, 9));
    fields.push(makeLabel(`Lbl_${section.prefix}_Legacy`, 'Legacy (useLegacy: ON)', RIGHT_X, curY, LABEL_W, true, 9));
    curY += 22;

    // 4 rows: A+E, B+F, C+G, D+H
    for (let i = 0; i < 4; i++) {
        const mod = MODERN[i];
        const leg = LEGACY[i];
        const modName = `${section.prefix}_${mod.letter}`;
        const legName = `${section.prefix}_${leg.letter}`;

        // Labels
        fields.push(makeLabel(`Lbl_${modName}`, `${mod.letter} \u2014 ${mod.label}`, LEFT_X, curY, LABEL_W, false, 9));
        fields.push(makeLabel(`Lbl_${legName}`, `${leg.letter} \u2014 ${leg.label}`, RIGHT_X, curY, LABEL_W, false, 9));
        curY += 20;

        // Calendar fields
        fields.push(makeCalendar(modName, mod, LEFT_X, curY, section.enableInitial, section.mode));
        fields.push(makeCalendar(legName, leg, RIGHT_X, curY, section.enableInitial, section.mode));
        curY += ROW_SPACING;
    }
    curY += SECTION_GAP - ROW_SPACING + 20;
}

// ── WS Harness section ──────────────────────────────────────────
fields.push(makeLabel('Lbl_WS', '\u2500\u2500 WS Harness \u2500\u2500', LEFT_X, curY, 780, true, 12));
curY += 30;

fields.push(makeLabel('Lbl_WSAction', 'Action', LEFT_X, curY, 150, false, 9));
fields.push(makeLabel('Lbl_WSConfigs', 'Configs', RIGHT_X, curY, 150, false, 9));
curY += 20;
fields.push(makeTextArea('WSAction', LEFT_X, curY, 300, 50, 2));
fields.push(makeTextArea('WSConfigs', RIGHT_X, curY, 300, 50, 2));
curY += 60;

fields.push(makeLabel('Lbl_WSRecordID', 'Record ID', LEFT_X, curY, 150, false, 9));
fields.push(makeLabel('Lbl_WSInputDate', 'Input Date', RIGHT_X, curY, 150, false, 9));
curY += 20;
fields.push(makeTextArea('WSRecordID', LEFT_X, curY, 300, 50, 2));
fields.push(makeTextArea('WSInputDate', RIGHT_X, curY, 300, 50, 2));
curY += 60;

fields.push(makeLabel('Lbl_WSInputFormats', 'Input Formats (WS-5/WS-6)', LEFT_X, curY, 350, false, 9));
curY += 20;
fields.push(makeTextArea('WSInputFormats', LEFT_X, curY, 730, 50, 2));
curY += 60;

fields.push(makeLabel('Lbl_WSResult', 'Result', LEFT_X, curY, 150, false, 9));
curY += 20;
fields.push(makeTextArea('WSResult', LEFT_X, curY, 730, 100, 6));
curY += 120;

const FORM_H = curY + 40;

// ── Container wraps everything ──────────────────────────────────
const container = makeContainer(CONTAINER_ID, 860, FORM_H);

// ──────────────────────────────────────────────────────────────────
// Scripts — adapted from DateTest template (lines 2177-2270)
// ──────────────────────────────────────────────────────────────────
const CALLWS_SID = uuid();
const BTN_CALLWS_ONCLICK_SID = uuid();
const BTN_SAVE_ONCLICK_SID = uuid();

// CallWS script — HTML-escaped for XML embedding (matches original)
const callWSScript = `/* global VV, $ */
// DateTest WS Harness &#x2014; Form Button Script
// Calls the DateTestWSHarness web service with test parameters.
// Fields: WSAction, WSConfigs, WSRecordID, WSInputDate, WSResult.

const webServiceName = 'DateTestWSHarness';
const formName = 'DateTest WS Harness';
let message;

VV.Form.ShowLoadingPanel();

function CallServerSide() {
    let formData = VV.Form.getFormDataCollection();

    formData.push({ name: 'Action', value: VV.Form.GetFieldValue('WSAction') || '' });
    formData.push({ name: 'TargetConfigs', value: VV.Form.GetFieldValue('WSConfigs') || 'ALL' });
    formData.push({ name: 'RecordID', value: VV.Form.GetFieldValue('WSRecordID') || '' });
    formData.push({ name: 'InputDate', value: VV.Form.GetFieldValue('WSInputDate') || '' });
    formData.push({ name: 'InputFormats', value: VV.Form.GetFieldValue('WSInputFormats') || '' });

    return $.ajax({
        type: 'POST',
        url: \`\${VV.BaseAppUrl}api/v1/\${VV.CustomerAlias}/\${VV.CustomerDatabaseAlias}/scripts?name=\${webServiceName}\`,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(formData),
        success: '',
        error: '',
    });
}

$.when(CallServerSide()).always(function (resp) {
    if (typeof resp.status != 'undefined') {
        message = \`A status code of \${resp.status} returned from the server. There is a communication problem with the web servers.\`;
    } else if (typeof resp.statusCode != 'undefined') {
        message = \`A status code of \${resp.statusCode} with a message of '\${resp.errorMessages[0].message}' returned from the server.\`;
    } else if (resp.meta.status == '200') {
        if (resp.data != undefined) {
            const output = resp.data;

            if (output.status === 'Success' || output.status === 'Warning') {
                message = \`\${output.status}: \${output.data ? output.data.action : 'No action'} completed.\`;

                VV.Form.SetFieldValue('WSResult', JSON.stringify(output, null, 2));

                if (output.errors &amp;&amp; output.errors.length &gt; 0) {
                    message += \` Warnings: \${output.errors.join('; ')}\`;
                }
            } else if (output.status === 'Error') {
                message = \`Error: \${output.errors ? output.errors.join('; ') : 'Unknown error'}\`;
                VV.Form.SetFieldValue('WSResult', JSON.stringify(output, null, 2));
            } else {
                message = \`Unhandled response from \${webServiceName}.\`;
                VV.Form.SetFieldValue('WSResult', JSON.stringify(resp, null, 2));
            }
        } else {
            message = 'Response data was undefined.';
            VV.Form.SetFieldValue('WSResult', JSON.stringify(resp, null, 2));
        }
    } else {
        message = \`Unhandled response: \${resp.data ? resp.data.error : 'unknown'}\`;
        VV.Form.SetFieldValue('WSResult', JSON.stringify(resp, null, 2));
    }

    VV.Form.Global.DisplayMessaging(message, formName);
    VV.Form.HideLoadingPanel();
});`;

// ──────────────────────────────────────────────────────────────────
// Assemble full XML — structure matches DateTest template exactly:
// FormEntity → metadata → FormPages → GroupsHolder → settings →
// ScriptLibrary → ScriptAssignments → trailing settings
// ──────────────────────────────────────────────────────────────────
const P1 = T;
const P2 = `${T}${T}`;
const P3 = `${T}${T}${T}`;

const xml = `<?xml version="1.0" encoding="us-ascii"?>
<FormEntity xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
${P1}<BackgroundColor>#FFFFFFFF</BackgroundColor>
${P1}<FormTemplateId>${TEMPLATE_ID}</FormTemplateId>
${P1}<FormTemplateChId>${TEMPLATE_CH_ID}</FormTemplateChId>
${P1}<CreateByUsId>${CREATOR_ID}</CreateByUsId>
${P1}<ModifyByUsId>${CREATOR_ID}</ModifyByUsId>
${P1}<CustomerCategoryId>00000000-0000-0000-0000-000000000000</CustomerCategoryId>
${P1}<Version>4</Version>
${P1}<FormWidth>800</FormWidth>
${P1}<FormHeight>${FORM_H}</FormHeight>
${P1}<MaximumAttachment>0</MaximumAttachment>
${P1}<AttachmentRequired>false</AttachmentRequired>
${P1}<UseWorkflowTaskSecurity>false</UseWorkflowTaskSecurity>
${P1}<AllowOwner>true</AllowOwner>
${P1}<AllowEditor>true</AllowEditor>
${P1}<AllowViewer>true</AllowViewer>
${P1}<AllowRelatedDocumentAccess>false</AllowRelatedDocumentAccess>
${P1}<ConfirmationPage />
${P1}<AttachmentsFolder>/Attachments</AttachmentsFolder>
${P1}<AttachmentsFolderID>00000000-0000-0000-0000-000000000000</AttachmentsFolderID>
${P1}<AlwaysShowValidationTooltip>false</AlwaysShowValidationTooltip>
${P1}<OutsideFormValidationEnabled>false</OutsideFormValidationEnabled>
${P1}<OutsideProcessID>00000000-0000-0000-0000-000000000000</OutsideProcessID>
${P1}<ModelID xsi:nil="true" />
${P1}<FormPages>
${P2}<FormPage>
${P3}<PageId>${PAGE_ID}</PageId>
${P3}<PageNumber>1</PageNumber>
${P3}<PageName>Page 1</PageName>
${P3}<FactoryPageName>Page 1</FactoryPageName>
${P3}<Version>0</Version>
${P3}<Width>800</Width>
${P3}<Height>${FORM_H}</Height>
${P3}<BackgroundColor>#FFFFFFFF</BackgroundColor>
${P3}<FormCanvasWidth>0</FormCanvasWidth>
${P3}<FormCanvasHeight>0</FormCanvasHeight>
${P3}<ScaleFactor>1</ScaleFactor>
${P3}<FieldList>
${container}
${fields.join('\n')}
${P3}</FieldList>
${P3}<IsRetired>false</IsRetired>
${P2}</FormPage>
${P1}</FormPages>
${P1}<GroupsHolder>
${P2}<FormTemplateID>${TEMPLATE_ID}</FormTemplateID>
${P2}<GroupCollection />
${P2}<HasBuiltinGroups>false</HasBuiltinGroups>
${P1}</GroupsHolder>
${P1}<TextboxFontSize>10</TextboxFontSize>
${P1}<PrintAreaWidthOption>0</PrintAreaWidthOption>
${P1}<PrintAreaWidth>1024</PrintAreaWidth>
${P1}<PdfPaperSize>1</PdfPaperSize>
${P1}<PdfPaperSizeWidth>0</PdfPaperSizeWidth>
${P1}<PdfPaperSizeHeight>0</PdfPaperSizeHeight>
${P1}<PdfTopMargin>0</PdfTopMargin>
${P1}<PdfRightMargin>0</PdfRightMargin>
${P1}<PdfBottomMargin>0</PdfBottomMargin>
${P1}<PdfLeftMargin>0</PdfLeftMargin>
${P1}<PdfPageOrientation>Portrait</PdfPageOrientation>
${P1}<AssimilateLatestFormTemplate>true</AssimilateLatestFormTemplate>
${P1}<FieldListSaveKey>00000000-0000-0000-0000-000000000000</FieldListSaveKey>
${P1}<UpdateDocumentRelationshipDocId>false</UpdateDocumentRelationshipDocId>
${P1}<FormTemplateType>FormTemplate</FormTemplateType>
${P1}<InheritedFormTemplateType>FormTemplate</InheritedFormTemplateType>
${P1}<InheritedFormTemplateId>00000000-0000-0000-0000-000000000000</InheritedFormTemplateId>
${P1}<InheritedFormTemplateRevisionId>00000000-0000-0000-0000-000000000000</InheritedFormTemplateRevisionId>
${P1}<SaveDateTime>${CONFIG_TS}</SaveDateTime>
${P1}<ScriptLibrary>
${P2}<FormScriptItem>
${P3}<ScriptItemId>${CALLWS_SID}</ScriptItemId>
${P3}<FormChId>00000000-0000-0000-0000-000000000000</FormChId>
${P3}<Name>CallWS</Name>
${P3}<Arguments />
${P3}<Script>${callWSScript}</Script>
${P3}<ScriptItemType>TemplateScriptItem</ScriptItemType>
${P3}<FormTemplateIdList />
${P2}</FormScriptItem>
${P2}<FormScriptItem>
${P3}<ScriptItemId>${BTN_CALLWS_ONCLICK_SID}</ScriptItemId>
${P3}<FormChId>00000000-0000-0000-0000-000000000000</FormChId>
${P3}<Name>btnCallWS_onClick</Name>
${P3}<Arguments>event, control</Arguments>
${P3}<Script>VV.Form.Template.CallWS();</Script>
${P3}<ScriptItemType>ControlEventScriptItem</ScriptItemType>
${P3}<FormTemplateIdList />
${P2}</FormScriptItem>
${P2}<FormScriptItem>
${P3}<ScriptItemId>${BTN_SAVE_ONCLICK_SID}</ScriptItemId>
${P3}<FormChId>00000000-0000-0000-0000-000000000000</FormChId>
${P3}<Name>btnSave_onClick</Name>
${P3}<Arguments>event, control</Arguments>
${P3}<Script>VV.Form.DoAjaxFormSave();</Script>
${P3}<ScriptItemType>ControlEventScriptItem</ScriptItemType>
${P3}<FormTemplateIdList />
${P2}</FormScriptItem>
${P1}</ScriptLibrary>
${P1}<ScriptAssignments>
${P2}<FormScriptAssignment>
${P3}<ScriptAssignmentId>${uuid()}</ScriptAssignmentId>
${P3}<FormTemplateId>00000000-0000-0000-0000-000000000000</FormTemplateId>
${P3}<ScriptItemId>${BTN_CALLWS_ONCLICK_SID}</ScriptItemId>
${P3}<ControlId>${BTN_CALLWS_ID}</ControlId>
${P3}<EventId>4</EventId>
${P3}<DefinedFormTemplateId>00000000-0000-0000-0000-000000000000</DefinedFormTemplateId>
${P3}<DefinedTemplateRevision>1</DefinedTemplateRevision>
${P2}</FormScriptAssignment>
${P2}<FormScriptAssignment>
${P3}<ScriptAssignmentId>${uuid()}</ScriptAssignmentId>
${P3}<FormTemplateId>00000000-0000-0000-0000-000000000000</FormTemplateId>
${P3}<ScriptItemId>${BTN_SAVE_ONCLICK_SID}</ScriptItemId>
${P3}<ControlId>${BTN_SAVE_ID}</ControlId>
${P3}<EventId>4</EventId>
${P3}<DefinedFormTemplateId>00000000-0000-0000-0000-000000000000</DefinedFormTemplateId>
${P3}<DefinedTemplateRevision>1</DefinedTemplateRevision>
${P2}</FormScriptAssignment>
${P1}</ScriptAssignments>
${P1}<ImageControlImages />
${P1}<Groups />
${P1}<AllPagesRenderAsOne>false</AllPagesRenderAsOne>
${P1}<ShowPanelMenu>false</ShowPanelMenu>
${P1}<BrowserContextMenu>true</BrowserContextMenu>
${P1}<ExternalScriptFile>true</ExternalScriptFile>
${P1}<ClientSideGroupsAndConditions>false</ClientSideGroupsAndConditions>
${P1}<HybridGroupsAndConditions>false</HybridGroupsAndConditions>
${P1}<CombineQueryRequests>false</CombineQueryRequests>
${P1}<CombineRrcDataGridRequests>false</CombineRrcDataGridRequests>
${P1}<ShowTabs>true</ShowTabs>
${P1}<DefaultFormLanguage>en-US</DefaultFormLanguage>
${P1}<RenderOptimization>true</RenderOptimization>
${P1}<OriginatorGroups />
${P1}<OfflineFormEnabled>false</OfflineFormEnabled>
${P1}<OfflineGroups />
${P1}<TemplateQueries />
${P1}<ApplyCultureChanges>false</ApplyCultureChanges>
${P1}<IgnoreControlAccessibilityTitles>false</IgnoreControlAccessibilityTitles>
</FormEntity>`;

process.stdout.write(xml);
