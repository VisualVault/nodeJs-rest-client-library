# Form Template Standards

Standards for VV form template XML construction. Each standard is a single atomic check with a pass/fail outcome, enforced by a rule in `tools/review/rules/`. Run `node tools/review/review-forms.js --project <name>` to check compliance.

## Standards Index

| #   | Rule ID                        | Standard                                                | Severity | Applies To                        | Rule File                                                                 |
| --- | ------------------------------ | ------------------------------------------------------- | -------- | --------------------------------- | ------------------------------------------------------------------------- |
| 1   | `title-case`                   | Input field names must be Title Case                    | warning  | 7 input types                     | [field-naming.js](../../tools/review/rules/field-naming.js)               |
| 2   | `default-name`                 | Fields must not have default/generic names              | warning  | 11 field types (type-specific)    | [field-naming.js](../../tools/review/rules/field-naming.js)               |
| 3   | `duplicate-name`               | Field names must be unique within the template          | error    | All fields                        | [field-naming.js](../../tools/review/rules/field-naming.js)               |
| 4   | `empty-name`                   | Fields must have a non-empty name                       | error    | All fields                        | [field-naming.js](../../tools/review/rules/field-naming.js)               |
| 5   | `valid-identifier`             | Field names must be valid JS identifiers                | warning  | All fields                        | [field-naming.js](../../tools/review/rules/field-naming.js)               |
| 6   | `accessibility-label`          | Input fields must have an AccessibilityLabel            | warning  | 8 input types                     | [accessibility.js](../../tools/review/rules/accessibility.js)             |
| 7   | `tab-order-zero`               | TabOrder must be 0 (auto-calculated)                    | warning  | 8 navigable types                 | [tab-order.js](../../tools/review/rules/tab-order.js)                     |
| 8   | `tab-order-unique`             | No duplicate non-zero TabOrder per page                 | error    | 8 navigable types                 | [tab-order.js](../../tools/review/rules/tab-order.js)                     |
| 9   | `calendar-name-match`          | Calendar config should match field name intent          | warning  | FieldCalendar3                    | [calendar-config.js](../../tools/review/rules/calendar-config.js)         |
| 10  | `calendar-legacy`              | Calendar fields should not use legacy datepicker        | info     | FieldCalendar3                    | [calendar-config.js](../../tools/review/rules/calendar-config.js)         |
| 11  | `calendar-valid-config`        | Calendar config must be a known A-H combination         | warning  | FieldCalendar3                    | [calendar-config.js](../../tools/review/rules/calendar-config.js)         |
| 12  | `script-orphan-assignment`     | Script assignments must reference existing controls     | warning  | Template-level                    | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)           |
| 13  | `script-unassigned`            | Event scripts must be assigned to a control             | warning  | Template-level                    | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)           |
| 14  | `script-unused-template`       | Template helpers must be referenced from other scripts  | warning  | Template-level                    | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)           |
| 15  | `script-empty-body`            | Scripts must have non-empty bodies                      | warning  | Template-level                    | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)           |
| 16  | `script-field-reference`       | Script field references must exist in template          | warning  | Template-level                    | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)           |
| 17  | `orphan-container-ref`         | ContainerId must reference a valid FieldContainer       | error    | Template-level                    | [orphan-refs.js](../../tools/review/rules/orphan-refs.js)                 |
| 18  | `orphan-group-member`          | Group FieldMember must reference a valid field          | warning  | Template-level                    | [orphan-refs.js](../../tools/review/rules/orphan-refs.js)                 |
| 19  | `container-responsive-flow`    | Multi-field containers must have responsive flow set    | warning  | FieldContainer                    | [container-config.js](../../tools/review/rules/container-config.js)       |
| 20  | `distance-to-border`           | Fields must not be too close to page edge               | warning  | 11 field types                    | [layout.js](../../tools/review/rules/layout.js)                           |
| 21  | `label-overlap`                | Labels must not overlap adjacent fields                 | warning  | FieldLabel                        | [layout.js](../../tools/review/rules/layout.js)                           |
| 22  | `spelling`                     | Field names must be spelled correctly                   | info     | 9 named field types               | [spelling.js](../../tools/review/rules/spelling.js)                       |
| 23  | `default-text`                 | Fields must not have default text values                | warning  | Checkbox, UserIDStamp, FormButton | [default-text.js](../../tools/review/rules/default-text.js)               |
| 24  | `accessibility-label-match`    | AccessibilityLabel must match visible label text        | warning  | Input fields + self-labeled       | [accessibility-match.js](../../tools/review/rules/accessibility-match.js) |
| 25  | `simple-upload`                | Upload buttons must use simple upload mode              | warning  | UploadButton                      | [upload-config.js](../../tools/review/rules/upload-config.js)             |
| 26  | `field-multiple-groups`        | Fields must not appear in more than one group           | warning  | Template-level                    | [group-checks.js](../../tools/review/rules/group-checks.js)               |
| 27  | `group-override-condition`     | Non-admin groups should include override condition      | info     | Template-level                    | [group-checks.js](../../tools/review/rules/group-checks.js)               |
| 28  | `field-max-length`             | Input fields must have appropriate MaxLength            | info     | FieldTextbox3, FieldTextArea3     | [field-config.js](../../tools/review/rules/field-config.js)               |
| 29  | `button-label-camelcase`       | Buttons and labels should use camelCase naming          | warning  | FormButton, FieldLabel            | [naming-conventions.js](../../tools/review/rules/naming-conventions.js)   |
| 30  | `label-unnamed-in-group`       | Only name labels if used in groups/conditions           | info     | FieldLabel                        | [group-checks.js](../../tools/review/rules/group-checks.js)               |
| 31  | `listener-disabled`            | Listeners should only be enabled when needed            | info     | 6 input types                     | [field-config.js](../../tools/review/rules/field-config.js)               |
| 32  | `admin-override-container`     | Template must have Admin Override container             | warning  | Template-level                    | [admin-override.js](../../tools/review/rules/admin-override.js)           |
| 33  | `admin-override-security`      | Admin Override must have VaultAccess-only visibility    | warning  | Template-level                    | [admin-override.js](../../tools/review/rules/admin-override.js)           |
| 34  | `save-button-hidden`           | SaveButton FormControl must be hidden                   | warning  | Template-level                    | [form-controls.js](../../tools/review/rules/form-controls.js)             |
| 35  | `tab-control-visible`          | TabControl FormControl must not be hidden               | warning  | Template-level                    | [form-controls.js](../../tools/review/rules/form-controls.js)             |
| 36  | `accessibility-required`       | Required fields must have "field Required" suffix       | warning  | 8 input types                     | [accessibility.js](../../tools/review/rules/accessibility.js)             |
| 37  | `button-min-size`              | Buttons must be at least 24x24 pixels                   | warning  | FormButton                        | [layout.js](../../tools/review/rules/layout.js)                           |
| 38  | `group-meaningful-name`        | Group names should be descriptive                       | info     | Template-level                    | [group-checks.js](../../tools/review/rules/group-checks.js)               |
| 39  | `group-consolidate-conditions` | Groups with identical conditions should be consolidated | info     | Template-level                    | [group-checks.js](../../tools/review/rules/group-checks.js)               |
| 40  | `tab-reference-by-name`        | Scripts should reference tabs by name, not number       | warning  | Template-level                    | [script-hygiene.js](../../tools/review/rules/script-hygiene.js)           |

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
- **Config reference:** See `research/form-templates/README.md` for A-H matrix

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

### 19. `container-responsive-flow` — Container Responsive Flow

Containers with more than one child field must have `ResponsiveFlow` set to `1 Column` (value "3") or `2 Columns` (value "4").

- **Applies to:** FieldContainer with >1 child field
- **Pass:** ResponsiveFlow is "3" or "4"
- **Fail:** Container has multiple children with no responsive flow set

### 20. `distance-to-border` — Distance to Page Border

Fields must not be closer than 30px from the form's right border.

- **Applies to:** FormButton, FieldCalendar3, CellField, FieldCheckbox, FieldDropDownList3, FormIDStamp, ImageFormControl, UserIDStamp, FieldTextbox3, FieldTextArea3, UploadButton
- **Pass:** Field right edge is ≥30px from page right edge
- **Fail:** Field is <30px from right border

### 21. `label-overlap` — Label Overlapping Adjacent Field

Labels must not overlap adjacent fields. A label's right edge must not extend into a field's left edge by 5px or more on the same row (±15px vertical tolerance).

- **Applies to:** FieldLabel (checks relationship to other fields)
- **Pass:** Label right edge ends before field left edge (or overlap <5px)
- **Fail:** Label overlaps field by ≥5px

### 22. `spelling` — Field Name Spelling

Field names must be spelled correctly. Uses Hunspell dictionary with exceptions for known acronyms.

- **Applies to:** FieldTextbox3, FieldTextArea3, FieldCalendar3, FieldDropDownList3, FieldCheckbox, CellField, FieldDataGrid, FormIDStamp, RepeatingRowControl
- **Preconditions:** Name must be non-default
- **Limitation:** Only checks against en_US dictionary. Domain-specific terms trigger false positives.
- **Pass:** All words in field name are correctly spelled or are known exceptions
- **Fail:** Word not in dictionary and not an exception

### 23. `default-text` — Default Text Values

Fields must not retain their auto-generated default text values.

- **Applies to:** FieldCheckbox ("Checkbox"), UserIDStamp ("Signature Stamp"), FormButton ("Next")
- **Pass:** Text property has been customized
- **Fail:** Text matches a default pattern for the field type

### 24. `accessibility-label-match` — Accessibility Label Matches Visible Text

AccessibilityLabel must match the visible label text (found by geometric proximity) or the field's own Text property for self-labeled types.

- **Distinct from** `accessibility-label` (which only checks presence)
- **Self-labeled types:** FieldCheckbox, FormButton, FormIDStamp, UploadButton (use own Text property)
- **Label-based types:** Find nearest label by proximity (same row ±15px, within 60px gap)
- **Pass:** AccessibilityLabel matches expected text (case-insensitive, ignoring "field Required" suffix)
- **Fail:** AccessibilityLabel doesn't match

### 25. `simple-upload` — Simple Upload Mode

Upload buttons must have `DisplayUploadedFiles` set to false (simple upload mode).

- **Applies to:** UploadButton
- **Pass:** `DisplayUploadedFiles` is "false"
- **Fail:** `DisplayUploadedFiles` is "true" or not set

### 26. `field-multiple-groups` — Fields in Multiple Groups

A field must not appear in more than one group's FieldMembers.

- **Applies to:** Template-level (groups)
- **Exclusions:** Zero GUID, platform built-in GUIDs
- **Pass:** Field appears in at most one group
- **Fail:** Field appears in 2+ groups

### 27. `group-override-condition` — Group Override Condition

Non-admin groups should include a condition that references a field with "override" in its name.

- **Applies to:** Template-level (groups, excluding groups with "admin" in name)
- **Note:** Potentially customer-specific convention (WADNR pattern)
- **Pass:** At least one condition references an override field
- **Fail:** No condition references an override field

### 28. `field-max-length` — Field MaxLength Appropriate

Input fields must have a MaxLength appropriate for their content type. Name fields→100, Address→300, Notes/TextArea→3000, Default→50.

- **Applies to:** FieldTextbox3, FieldTextArea3
- **Detection:** Heuristic matching of field name patterns to expected lengths
- **Pass:** MaxLength meets or exceeds the recommended minimum for the field's content type
- **Fail:** MaxLength is below the recommended minimum

### 29. `button-label-camelcase` — Button and Label CamelCase Naming

Buttons should be named with `btn` prefix and labels with `lbl` prefix (camelCase convention).

- **Applies to:** FormButton, FieldLabel
- **Pass:** `btnSubmit`, `lblInstructions`
- **Fail:** `Submit Button`, `Instructions` (no prefix)

### 30. `label-unnamed-in-group` — Labels Only Named If Used in Groups

Labels should only be given custom names if they are used in groups and conditions. Renaming labels that aren't controlled by groups wastes development time.

- **Applies to:** FieldLabel
- **Pass:** Label has a default name (Label1, etc.) OR label is referenced in a group
- **Fail:** Label has a custom name but isn't in any group

### 31. `listener-disabled` — Listener Should Be Disabled Unless Needed

EnableQListener should only be enabled on fields that require query string fill-in/relate capability. Listeners present a security concern.

- **Applies to:** FieldTextbox3, FieldTextArea3, FieldCalendar3, FieldDropDownList3, FieldCheckbox, CellField
- **Pass:** EnableQListener is false
- **Fail:** EnableQListener is true (advisory — verify the field needs it)

### 32. `admin-override-container` — Admin Override Container Required

Every template must have an Admin Override container with a checkbox named "Admin Override" and an Admin Save button.

- **Applies to:** Template-level
- **Pass:** Template has a container with "Admin Override" or "Admin Section" in name, containing a checkbox and button
- **Fail:** Missing container, missing checkbox, or missing button

### 33. `admin-override-security` — Admin Override Security Visibility

The group containing the Admin Override container must have a SecurityMemberCollection (VaultAccess-only visibility).

- **Applies to:** Template-level (groups)
- **Pass:** Admin Override container is in a group with security members
- **Fail:** Container not in any group, or group has no security visibility

### 34. `save-button-hidden` — SaveButton Must Be Hidden

The SaveButton FormControl must be placed in a hidden group.

- **Applies to:** Template-level (FormControls)
- **Pass:** SaveButton appears in a group
- **Fail:** SaveButton is not in any group

### 35. `tab-control-visible` — TabControl Must Not Be Hidden

The TabControl FormControl must not be hidden via groups. Tab access should be controlled in the Menu tab of the Template Details screen.

- **Applies to:** Template-level (FormControls)
- **Pass:** TabControl does not appear in any group
- **Fail:** TabControl is in a group

### 36. `accessibility-required` — Required Fields Must Have "field Required"

Required fields (indicated by `*` in the label) must include "field Required" in their AccessibilityLabel.

- **Applies to:** 8 input types (same as `accessibility-label`)
- **Detection:** Finds nearest label by proximity, checks for `*` indicator
- **Pass:** Required field's AccessibilityLabel contains "field Required"
- **Fail:** Required field's AccessibilityLabel is missing the suffix

### 37. `button-min-size` — Button Minimum Size

Buttons must be at least 24x24 pixels for 508 compliance (accessible touch target).

- **Applies to:** FormButton
- **Pass:** Width ≥24 AND Height ≥24
- **Fail:** Either dimension below 24px

### 38. `group-meaningful-name` — Group Names Should Be Descriptive

Group names should be meaningful and descriptive to aid in rapid maintenance.

- **Applies to:** Template-level (groups)
- **Pass:** Group name is descriptive (e.g., "BTN Manage Tab", "Hidden Fields")
- **Fail:** Default name ("Group1"), empty, or very short (<3 characters)

### 39. `group-consolidate-conditions` — Consolidate Duplicate Group Conditions

Groups with identical condition and security configurations should be consolidated to minimize maintenance.

- **Applies to:** Template-level (groups)
- **Pass:** No two groups share identical condition sets
- **Fail:** Two or more groups have the same conditions

### 40. `tab-reference-by-name` — Tab References Should Use Names

Scripts and conditions should reference tabs by name, not by numeric index, to ease future maintenance.

- **Applies to:** Template-level (scripts)
- **Detection:** Regex for `SelectTab(0)`, `TabIndex` numeric patterns
- **Pass:** No numeric tab references in script code
- **Fail:** Script contains `SelectTab(N)` or similar numeric tab reference

---

## Adding New Standards

1. Add a `check()` function to an existing rule file or create a new one in `tools/review/rules/`
2. Each rule exports: `{ id, name, component, appliesTo, severity, check(context) }` returning an array of findings
    - `component`: which component type this rule targets (e.g., `'form-templates'`)
    - `appliesTo`: field types array, `'*'` (all fields), or `'template'` (template-level check)
3. If new file: add `require('./{file}')` to `tools/review/rules/index.js`
4. Document the standard in this file
5. Add a row to `research/standards-review/status.md`

Query helpers in `rules/index.js`: `rulesForFieldType(type)`, `fieldTypeMatrix()`, `rulesForComponent(component)`.

## Report Output

Reports are written to `projects/{customer}/analysis/standards-review/`:

- **Per-template:** `{template-name}.md` — all findings for one template
- **Summary:** `summary.md` — cross-template aggregation by rule and severity
