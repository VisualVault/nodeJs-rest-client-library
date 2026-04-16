# Field Type → Standards Matrix

Generated: 2026-04-15 | Rules: 40

## By Field Type

| Field Type | Standards |
| :--------- | :-------- |
| CellField | title-case, default-name, accessibility-label, accessibility-required, tab-order-zero, tab-order-unique, distance-to-border, accessibility-label-match, spelling, listener-disabled |
| FieldCalendar3 | title-case, default-name, accessibility-label, accessibility-required, tab-order-zero, tab-order-unique, calendar-name-match, calendar-legacy, calendar-valid-config, distance-to-border, accessibility-label-match, spelling, listener-disabled |
| FieldCheckbox | title-case, default-name, accessibility-label, accessibility-required, tab-order-zero, tab-order-unique, default-text, distance-to-border, accessibility-label-match, spelling, listener-disabled |
| FieldContainer | container-responsive-flow |
| FieldDataGrid | default-name, spelling |
| FieldDropDownList3 | title-case, default-name, accessibility-label, accessibility-required, tab-order-zero, tab-order-unique, distance-to-border, accessibility-label-match, spelling, listener-disabled |
| FieldLabel | label-unnamed-in-group, label-overlap, button-label-camelcase |
| FieldTextArea3 | title-case, default-name, accessibility-label, accessibility-required, tab-order-zero, tab-order-unique, distance-to-border, accessibility-label-match, spelling, listener-disabled, field-max-length |
| FieldTextbox3 | title-case, default-name, accessibility-label, accessibility-required, tab-order-zero, tab-order-unique, distance-to-border, accessibility-label-match, spelling, listener-disabled, field-max-length |
| FormButton | tab-order-zero, tab-order-unique, default-text, distance-to-border, button-min-size, accessibility-label-match, button-label-camelcase |
| FormIDStamp | default-name, distance-to-border, accessibility-label-match, spelling |
| ImageFormControl | default-name, distance-to-border |
| RepeatingRowControl | default-name, spelling |
| UploadButton | default-name, accessibility-label, accessibility-required, tab-order-zero, tab-order-unique, simple-upload, distance-to-border, accessibility-label-match |
| UserIDStamp | title-case, accessibility-label, accessibility-required, default-text, distance-to-border, accessibility-label-match |

## All Fields

These standards apply to every field type:

- `duplicate-name` — Duplicate Field Names (error)
- `empty-name` — Empty Field Names (error)
- `valid-identifier` — Valid Identifier Characters (warning)

## Template-Level

These standards operate on the template as a whole (scripts, assignments, groups):

- `script-orphan-assignment` — Script Assignments Reference Valid Controls (warning)
- `script-unassigned` — Event Scripts Must Be Assigned to a Control (warning)
- `script-unused-template` — Template Helper Scripts Must Be Referenced (warning)
- `script-empty-body` — Scripts Have Non-Empty Bodies (warning)
- `script-field-reference` — Script Field References Exist (warning)
- `tab-reference-by-name` — Tab References Should Use Names Not Numbers (warning)
- `orphan-container-ref` — Container References Valid (error)
- `orphan-group-member` — Group Members Reference Valid Fields (warning)
- `field-multiple-groups` — Fields Must Not Appear in Multiple Groups (warning)
- `group-override-condition` — Group Override Condition (info)
- `group-meaningful-name` — Group Names Should Be Descriptive (info)
- `group-consolidate-conditions` — Groups With Identical Conditions Should Be Consolidated (info)
- `admin-override-container` — Template Must Have Admin Override Container (warning)
- `admin-override-security` — Admin Override Container Must Have Security Visibility (warning)
- `save-button-hidden` — SaveButton Must Be Hidden (warning)
- `tab-control-visible` — TabControl Must Not Be Hidden (warning)

**Total:** 40 standards across 15 field types
