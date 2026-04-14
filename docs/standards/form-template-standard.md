# Form Template Standards

Standards for VV form template XML construction. Each standard is a single atomic check with a pass/fail outcome, enforced by a rule in `tools/review/rules/`. Run `node tools/review/review-forms.js --project <name>` to check compliance.

## Standards Index

| #   | Rule ID                    | Standard                                               | Severity | Rule File                                                         |
| --- | -------------------------- | ------------------------------------------------------ | -------- | ----------------------------------------------------------------- |
| 1   | `title-case`               | Input field names must be Title Case                   | warning  | [field-naming.js](../../tools/review/rules/field-naming.js)       |
| 2   | `default-name`             | Fields must not have default/generic names             | warning  | [field-naming.js](../../tools/review/rules/field-naming.js)       |
| 3   | `duplicate-name`           | Field names must be unique within the template         | error    | [field-naming.js](../../tools/review/rules/field-naming.js)       |
| 4   | `empty-name`               | Fields must have a non-empty name                      | error    | [field-naming.js](../../tools/review/rules/field-naming.js)       |
| 5   | `valid-identifier`         | Field names must be valid JS identifiers               | warning  | [field-naming.js](../../tools/review/rules/field-naming.js)       |
| 6   | `accessibility-label`      | Input fields must have an AccessibilityLabel           | warning  | [accessibility.js](../../tools/review/rules/accessibility.js)     |
| 7   | `tab-order-zero`           | TabOrder must be 0 (auto-calculated)                   | warning  | [tab-order.js](../../tools/review/rules/tab-order.js)             |
| 8   | `tab-order-unique`         | No duplicate non-zero TabOrder per page                | error    | [tab-order.js](../../tools/review/rules/tab-order.js)             |
| 9   | `calendar-name-match`      | Calendar config should match field name intent         | warning  | [calendar-config.js](../../tools/review/rules/calendar-config.js) |
| 10  | `calendar-legacy`          | Calendar fields should not use legacy datepicker       | info     | [calendar-config.js](../../tools/review/rules/calendar-config.js) |
| 11  | `calendar-valid-config`    | Calendar config must be a known A-H combination        | warning  | [calendar-config.js](../../tools/review/rules/calendar-config.js) |
| 12  | `script-orphan-assignment` | Script assignments must reference existing controls    | warning  | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)   |
| 13  | `script-unassigned`        | Event scripts must be assigned to a control            | warning  | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)   |
| 14  | `script-unused-template`   | Template helpers must be referenced from other scripts | warning  | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)   |
| 15  | `script-empty-body`        | Scripts must have non-empty bodies                     | warning  | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)   |
| 16  | `script-field-reference`   | Script field references must exist in template         | warning  | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)   |
| 17  | `orphan-container-ref`     | ContainerId must reference a valid FieldContainer      | error    | [orphan-refs.js](../../tools/review/rules/orphan-refs.js)         |
| 18  | `orphan-group-member`      | Group FieldMember must reference a valid field         | warning  | [orphan-refs.js](../../tools/review/rules/orphan-refs.js)         |

---

## Standard Definitions

### 1. `title-case` — Title Case Field Names

Input field names must use Title Case: each word capitalized except exception words.

- **Exception words (lowercase OK):** of, to, a, and, the, in, on, for, at, by, or
- **Exception words (uppercase OK):** ID, SSN, EIN, DOB, POA, POC, POI, POE, CSV, MPI, DBA, DP
- **Applies to:** FieldTextbox3, FieldTextArea3, FieldCalendar3, FieldDropDownList3, FieldCheckbox, CellField, UserIDStamp
- **Pass:** `Violation Date`, `PCHB Decision`, `Date of Receipt`
- **Fail:** `violation date`, `ViolationDate`, `Pre hearing Date`

### 2. `default-name` — Default Field Names

Fields must not retain their auto-generated default names.

- **Default patterns:** `DataField[N]`, `UploadButton[N]`, `Image[N]`, `RepeatingRowControl[N]`, `DataGrid[N]`, `FormIDStamp[N]`
- **Pass:** `Violation Date`, `Upload Document`
- **Fail:** `DataField1`, `UploadButton3`, `Image57`

### 3. `duplicate-name` — Duplicate Field Names

Field names must be unique within a template (case-insensitive).

- **Pass:** All fields have distinct names
- **Fail:** Two fields both named `Status Date`

### 4. `empty-name` — Empty Field Names

Every field must have a non-empty, non-whitespace name.

- **Pass:** Any non-empty string
- **Fail:** `""`, `"  "`

### 5. `valid-identifier` — Valid Identifier Characters

Field names, when spaces are replaced with underscores, must be valid JavaScript identifiers. This ensures compatibility with VV script APIs.

- **Pass:** `Violation Date` → `Violation_Date` (valid)
- **Fail:** Field names containing special characters that break `GetFieldValue()`

### 6. `accessibility-label` — Accessibility Labels

Input fields must have a non-empty `AccessibilityLabel` for screen reader support.

- **Applies to:** FieldTextbox3, FieldTextArea3, FieldCalendar3, FieldDropDownList3, FieldCheckbox, CellField, UploadButton, UserIDStamp
- **Pass:** AccessibilityLabel has any non-empty value
- **Fail:** AccessibilityLabel is empty or absent

### 7. `tab-order-zero` — Tab Order Auto-Calculated

TabOrder must be 0 on all keyboard-navigable fields, letting the platform auto-calculate navigation order.

- **Applies to:** FieldTextbox3, FieldTextArea3, FieldCalendar3, FieldDropDownList3, FieldCheckbox, CellField, UploadButton, FormButton
- **Pass:** `TabOrder = 0`
- **Fail:** `TabOrder = 5` (manual override)

### 8. `tab-order-unique` — Tab Order Unique Per Page

If non-zero TabOrder values exist, they must be unique within the same page. Duplicate values cause unpredictable keyboard navigation.

- **Pass:** No two fields on the same page share a non-zero TabOrder
- **Fail:** Two fields on Page 1 both have `TabOrder = 3`

### 9. `calendar-name-match` — Calendar Config Matches Name

Calendar field configuration (enableTime) should match the intent implied by the field name.

- **Fail (warning):** Name contains "DateTime" or "Timestamp" but `enableTime` is OFF
- **Fail (info):** Name suggests date-only (e.g., "Due Date", "Date of Receipt") but `enableTime` is ON
- **Config reference:** See `tasks/form-templates/README.md` for A-H matrix

### 10. `calendar-legacy` — Calendar Legacy Datepicker

Calendar fields should use the modern datepicker unless backwards compatibility requires the legacy one.

- **Pass:** `useLegacy = false`
- **Fail:** `useLegacy = true`

### 11. `calendar-valid-config` — Calendar Valid Configuration

Calendar field config (enableTime × ignoreTimezone × useLegacy) must map to a known A-H combination.

- **Pass:** Any of the 8 recognized combinations
- **Fail:** Unknown combination (should not occur in practice)

### 12. `script-orphan-assignment` — Script Assignments Reference Valid Controls

Script assignments must bind to a control (field) that exists in the template.

- **Exclusions:** Form-level zero GUID, platform built-in controls (`00000001-*`)
- **Pass:** ControlId matches a field's ID in the template
- **Fail:** ControlId points to a deleted or non-existent field

### 13. `script-unassigned` — Event Scripts Must Be Assigned

`ControlEventScriptItem` scripts must have at least one `FormScriptAssignment` binding them to a control event. An event handler with no assignment is dead code.

- **Applies to:** `ControlEventScriptItem` only (NOT `TemplateScriptItem` — see `script-unused-template`)
- **Pass:** Script has at least one assignment in FormScriptAssignments
- **Fail:** Event script exists with no matching assignment

### 14. `script-unused-template` — Template Helpers Must Be Referenced

`TemplateScriptItem` scripts (helper functions accessed via `VV.Form.Template.<Name>()`) must be referenced from at least one other script's code body. An unreferenced helper is dead code.

- **Applies to:** `TemplateScriptItem` only
- **Detection:** Searches all other scripts' code for `VV.Form.Template.<Name>()` or `<Name>(` patterns
- **Limitation:** Only detects literal name references. Dynamic calls (e.g., building the function name from variables) are not detected.
- **Pass:** Script name appears in at least one other script's code
- **Fail:** No other script references this helper by name

### 15. `script-empty-body` — Scripts Have Non-Empty Bodies

Scripts in the ScriptLibrary must contain code. Empty scripts indicate leftover definitions.

- **Pass:** Script body has at least one non-whitespace character
- **Fail:** Script body is empty or whitespace-only

### 16. `script-field-reference` — Script Field References Exist

Literal field name references in `GetFieldValue('X')` / `SetFieldValue('X')` must match an actual field in the template.

- **Limitation:** Only checks literal string arguments. Dynamic field name construction (e.g., `GetFieldValue(prefix + suffix)`) is not detected.
- **Pass:** Referenced field name exists in the template
- **Fail:** `GetFieldValue('StatusDate')` where no field named `StatusDate` exists

### 17. `orphan-container-ref` — Container References Valid

A field's `ContainerId` must reference a `FieldContainer` that exists in the template.

- **Exclusions:** Zero GUID (not in a container)
- **Pass:** ContainerId matches an existing FieldContainer's ID
- **Fail:** ContainerId points to a deleted container

### 18. `orphan-group-member` — Group Members Reference Valid Fields

Group `FieldMember` entries must reference field IDs that exist in the template.

- **Exclusions:** Zero GUID, platform built-in GUIDs (`00000001-*`)
- **Pass:** FieldID matches an existing field's ID
- **Fail:** FieldID points to a deleted or non-existent field

---

## Adding New Standards

1. Add a `check()` function to an existing rule file or create a new one in `tools/review/rules/`
2. Each rule exports: `{ id, name, severity, check(context) }` returning an array of findings
3. If new file: add `require('./{file}')` to `tools/review/rules/index.js`
4. Document the standard in this file
5. Add a row to `tasks/standards-review/status.md`

## Report Output

Reports are written to `projects/{customer}/analysis/standards-review/`:

- **Per-template:** `{template-name}.md` — all findings for one template
- **Summary:** `summary.md` — cross-template aggregation by rule and severity
