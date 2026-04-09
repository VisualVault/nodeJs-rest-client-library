# Form Template XML Export Reference

Structure and contents of the VV form template XML export format. Templates can be exported and imported via the VV admin interface.

---

## Root Element

```xml
<FormEntity xmlns:xsd="http://www.w3.org/2001/XMLSchema"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
```

## What's Included

| Section                | Description                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Template metadata**  | `FormTemplateId`, `FormTemplateChId`, `Version`, dimensions (`FormWidth`/`FormHeight`), `CreateByUsId`, `ModifyByUsId`, `SaveDateTime` |
| **Page structure**     | `FormPages` → `FormPage` entries with page ID, dimensions, background color                                                            |
| **Field definitions**  | `FieldList` → `BaseField` entries with full config: type, layout, properties, validation, IDs                                          |
| **Script library**     | `ScriptLibrary` → `FormScriptItem` entries with inline JavaScript code, names, arguments                                               |
| **Script assignments** | `ScriptAssignments` → binds scripts to controls via `ControlId` + `EventId`                                                            |
| **Groups/conditions**  | `GroupsHolder` → `GroupCollection` with visibility/readonly conditions, security members                                               |
| **PDF settings**       | Paper size, margins, orientation                                                                                                       |
| **Form settings**      | `AssimilateLatestFormTemplate`, `ExternalScriptFile`, `DefaultFormLanguage`, `RenderOptimization`, etc.                                |

## What's NOT Included

| Missing                                 | Where it lives                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Form **display name** (human-readable)  | Server-side metadata, available via `docInfo.formTemplateName` at runtime                                                                                                                                                                                                                                                                        |
| **Form data/records**                   | Database — field `<Value>` tags in the XML are always empty                                                                                                                                                                                                                                                                                      |
| **Workflow** definitions                | Separate VV workflow configuration                                                                                                                                                                                                                                                                                                               |
| **Folder/site** context                 | Library folder assignment is independent of the template                                                                                                                                                                                                                                                                                         |
| **Display format** (date format string) | Only present if `<Mask>` is explicitly set on the field; otherwise platform default applies. **Caution:** vv5dev auto-populates `<Mask>MM/dd/yyyy</Mask>` on all calendar fields during import/creation even if the source XML has no `<Mask>` — always verify after import. See `docs/reference/form-fields.md` § Kendo UI Version Differences. |
| **Global scripts**                      | Site-level script library (`VV.Form.Global.*`), not template-specific                                                                                                                                                                                                                                                                            |
| **RRC definitions**                     | Repeating Row Controls are separate related templates                                                                                                                                                                                                                                                                                            |
| **Form instance history**               | Revision tracking, audit logs live in the database                                                                                                                                                                                                                                                                                               |
| **Field-level security**                | Only present if Groups are configured in `GroupsHolder`                                                                                                                                                                                                                                                                                          |

---

## Field Types

Fields are `<BaseField xsi:type="...">` elements within the page's `<FieldList>`.

| `xsi:type`           | `<FieldType>`      | Description                                                                                                                                                                   |
| -------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FieldCalendar3`     | `Calendar`         | Date/DateTime field. Has `EnableTime`, `IgnoreTimezone`, `UseLegacy`, `EnableInitialValue`, `InitialValueMode`, `InitialDate`, `Mask`, `Placeholder`                          |
| `FieldTextbox3`      | `TextBox`          | Single-line text. Has `Length`, `ReadOnly`, `InitialValue`, `EnableMasking`, `Formula`, `Placeholder`, `Borderless`, printing styles                                          |
| `FieldTextArea3`     | `MultiLineTextbox` | Multi-line text. Has `Length`, `Rows`, `RenderAsHtmlEditor`                                                                                                                   |
| `FieldDropDownList3` | `DropDownList`     | Dropdown with inline `<ItemList>` or query-driven options. Has `EnableQListener`, `EnableCascadedList`, cascade config, `ReportingProperty`, `WorkflowConditionsDataProperty` |
| `FieldCheckbox`      | `Checkbox`         | Boolean field. Has `<Text>` (label), `<CheckBoxValue>`                                                                                                                        |
| `FieldLabel`         | `Label`            | Static display text                                                                                                                                                           |
| `FieldContainer`     | `Container`        | Layout container. Has `ResponsiveFlow`, `isCollapsible`, nested `FieldList` (optional)                                                                                        |
| `FormButton`         | `FormButton`       | Action button. Has `FormSaveEnabled`, `OpenNewWindow`, `RedirectUrl`, `RelateForm`, `EnableFillinRelate`, `FillinRelateFieldList`, `OutsideValidationEnabled`                 |
| `FormIDStamp`        | `FormIDStamp`      | Auto-generated form ID. Has `<Prefix>`, `<AutoNumber>`, `<IsReadOnly>`                                                                                                        |
| `UploadButton`       | `UploadButton`     | File upload. Has `<MIMEFilter>`, `<UploadFolderPath>`, `<MaximumFileSize>`                                                                                                    |
| `CellField`          | `CellField`        | Numeric/cell field                                                                                                                                                            |

### Common Field Properties (all types)

Every `BaseField` shares these base properties:

```xml
<ID>                    <!-- Field GUID -->
<Name>                  <!-- Field name (used in GetFieldValue/SetFieldValue) -->
<FieldType>             <!-- Type string -->
<PageId>                <!-- Page GUID -->
<ContainerId>           <!-- Parent container GUID -->
<LayoutLeft>            <!-- X position (px) -->
<LayoutTop>             <!-- Y position (px) -->
<ZOrder>                <!-- Z-index -->
<Version>               <!-- Field version -->
<IsRetired>             <!-- Whether retired -->
<IsDataReportingColumn> <!-- Included in reporting -->
<IsPrintableField>      <!-- Included in print -->
<RenderAsReadOnly>      <!-- Read-only rendering -->
<TabOrder>              <!-- Tab order -->
<FormVersion>           <!-- "FormVersion4" -->
<ValidationType>        <!-- "NoValidation" or validation type -->
<EnableQListener>       <!-- URL parameter listener -->
<AccessibilityLabel>    <!-- 508 accessibility label -->
```

---

## Groups and Conditions

Groups control field visibility, read-only state, and security. Defined in `<GroupsHolder> → <GroupCollection> → <Group>`.

```xml
<Group>
    <GroupID>...</GroupID>
    <GroupName>Administrator Section</GroupName>

    <!-- Visibility conditions (show/hide) -->
    <ConditionCollection>
        <ConditionBase xsi:type="LogicCondition">
            <LogicType>Equals</LogicType>
            <FieldValue1>                        <!-- Source: a form field -->
                <FieldID>...</FieldID>
                <ParentType>Form</ParentType>
            </FieldValue1>
            <FieldValue2>                        <!-- Comparison: a literal value -->
                <ParentType>Value</ParentType>
                <Value xsi:type="xsd:string">True</Value>
            </FieldValue2>
            <Outcome>IsVisible</Outcome>         <!-- or AND for compound conditions -->
        </ConditionBase>
    </ConditionCollection>

    <!-- Read-only conditions -->
    <ReadOnlyConditionCollection>
        <ConditionBase xsi:type="LogicCondition">
            <Outcome>IsReadOnly</Outcome>
        </ConditionBase>
    </ReadOnlyConditionCollection>

    <!-- Which fields/controls this group affects -->
    <FieldCollection>
        <FieldMember>
            <FieldID>...</FieldID>
            <FieldType>FieldControls</FieldType>
        </FieldMember>
    </FieldCollection>

    <!-- Security: which users/groups can see this section -->
    <SecurityMemberCollection>
        <SecurityMember>
            <SecurityMemberID>...</SecurityMemberID>
            <SecurityMemberType>Group</SecurityMemberType>  <!-- or User -->
        </SecurityMember>
    </SecurityMemberCollection>
    <SecurityMemberReadonlyCollection>...</SecurityMemberReadonlyCollection>
</Group>
```

### Built-in Form Control GUIDs

Groups can target built-in form controls (SaveButton, tabs, etc.) using well-known GUIDs:

| GUID                                   | Control Type       |
| -------------------------------------- | ------------------ |
| `00000001-0000-0000-0000-e1000000f001` | PageTitle          |
| `00000001-0000-0000-0000-e1000000f002` | TabControl         |
| `00000001-0000-0000-0000-e1000000f003` | SaveButton         |
| `00000001-0000-0000-0000-e1000000f004` | PageNavigation     |
| `00000001-0000-0000-0000-e1000000f005` | PrintPreviewButton |
| `00000001-0000-0000-0000-e1000000f006` | PrintPDFButton     |
| `00000001-0000-0000-0000-e1000000f007` | PublicSubmitButton |

Pattern: `00000001-0000-0000-0000-e1000000f0XX`. These are referenced in `<FieldMember xsi:type="FormControlFieldMember">` entries within group field collections.

A separate built-in GUID is used as the `ControlId` target for `onDataLoad` (EventId 16) script assignments:

| GUID                                   | Purpose           |
| -------------------------------------- | ----------------- |
| `00000001-0000-0000-0000-e0000000f010` | onDataLoad target |

Pattern: `e0000000f010` (note: `e0` prefix, not `e1` like the form controls above).

---

## Script Library

Scripts are stored inline in the XML as `<FormScriptItem>` entries.

```xml
<FormScriptItem>
    <ScriptItemId>...</ScriptItemId>
    <Name>FormValidation</Name>
    <Arguments>ControlName</Arguments>        <!-- empty string if no args -->
    <Script>/* inline JavaScript */</Script>
    <ScriptItemType>TemplateScriptItem</ScriptItemType>   <!-- or ControlEventScriptItem -->
</FormScriptItem>
```

### Script Types

| `ScriptItemType`         | Access at runtime           | Description                                                         |
| ------------------------ | --------------------------- | ------------------------------------------------------------------- |
| `TemplateScriptItem`     | `VV.Form.Template.<Name>()` | Reusable template functions (FormValidation, FillinAndRelate, etc.) |
| `ControlEventScriptItem` | Bound via ScriptAssignment  | Event handlers (onClick, onBlur, onChange)                          |

### Script Assignments

Bind scripts to controls and events:

```xml
<FormScriptAssignment>
    <ScriptItemId>...</ScriptItemId>     <!-- References FormScriptItem -->
    <ControlId>...</ControlId>           <!-- Field GUID to bind to -->
    <EventId>4</EventId>                 <!-- See EventId table below -->
</FormScriptAssignment>
```

#### EventId Reference

| EventId | Event      | Typical handler signature            | Notes                                                                                        |
| :-----: | ---------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
|   `1`   | onChange   | `event, control`                     | Dropdown selection, checkbox toggle, field value change                                      |
|   `3`   | onBlur     | `calendarObject` or `event, control` | Calendar fields receive `calendarObject`; text fields receive `event, control`               |
|   `4`   | onClick    | `event, control`                     | Button click (most common)                                                                   |
|  `10`   | (unknown)  | —                                    | Observed in WADNR `Communications-Log` template; needs investigation                         |
|  `15`   | formLevel  | —                                    | Form-level validation/logic (not bound to a specific control)                                |
|  `16`   | onDataLoad | `event`                              | Runs after form data loads; bound to built-in control `00000001-0000-0000-0000-e0000000f010` |

```

### Script Versioning

Template exports may contain multiple versions of the same script with `_0`, `_1` suffixes (e.g., `FormValidation`, `FormValidation_0`, `FormValidation_1`). These appear to be historical revisions preserved in the export. The version without a suffix is the active one at runtime.

---

## XML Encoding Notes

- HTML entities are used for special characters in inline scripts: `&amp;` for `&`, `&gt;` for `>`, `&lt;` for `<`, `&#x2014;` for `—`, `&#x2018;` for `'`
- Empty elements use self-closing or empty tags: `<Value />` or `<Value></Value>`
- Null values use `xsi:nil="true"`: `<ObjectProperty xsi:nil="true" />`
- GUIDs use lowercase hex with hyphens: `7f7b433e-f36b-1410-896b-005f6a77cdf8`
- Zero GUID (`00000000-0000-0000-0000-000000000000`) indicates "not set" / null reference
```
