# Standards Review — Status

Last updated: 2026-04-14

## Current State

Tool infrastructure complete. Now reviewing each standard individually: validate logic, test against real data, calibrate severity/exceptions, approve or rework.

## Standards Review Tracker

Each standard goes through: **Draft** → **Under Review** → **Approved**

- **Draft**: Rule implemented, not yet validated against real findings
- **Under Review**: Actively inspecting output, calibrating, fixing false positives
- **Approved**: Logic validated, severity confirmed, exceptions documented, standard finalized

### Implemented Standards

| #   | Rule ID                    | Standard                                               | Findings |                                                          Standard Doc                                                          |                      Rule Script                      | Next Action                                   | Status |
| --- | -------------------------- | ------------------------------------------------------ | :------: | :----------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------: | --------------------------------------------- | ------ |
| 1   | `title-case`               | Input field names must be Title Case                   |   533    |                   [doc](../../docs/standards/form-template-standard.md#1-title-case--title-case-field-names)                   |  [script](../../tools/review/rules/field-naming.js)   | Review exceptions list, check false positives | Draft  |
| 2   | `default-name`             | Fields must not have default/generic names             |    99    |                   [doc](../../docs/standards/form-template-standard.md#2-default-name--default-field-names)                    |  [script](../../tools/review/rules/field-naming.js)   | Verify all default patterns are covered       | Draft  |
| 3   | `duplicate-name`           | Field names must be unique within template             |    1     |                 [doc](../../docs/standards/form-template-standard.md#3-duplicate-name--duplicate-field-names)                  |  [script](../../tools/review/rules/field-naming.js)   | Quick review — 1 finding                      | Draft  |
| 4   | `empty-name`               | Fields must have a non-empty name                      |    0     |                     [doc](../../docs/standards/form-template-standard.md#4-empty-name--empty-field-names)                      |  [script](../../tools/review/rules/field-naming.js)   | Clean — verify with edge cases                | Draft  |
| 5   | `valid-identifier`         | Field names must be valid JS identifiers               |    19    |             [doc](../../docs/standards/form-template-standard.md#5-valid-identifier--valid-identifier-characters)              |  [script](../../tools/review/rules/field-naming.js)   | Review which characters are flagged           | Draft  |
| 6   | `accessibility-label`      | Input fields must have an AccessibilityLabel           |   463    |               [doc](../../docs/standards/form-template-standard.md#6-accessibility-label--accessibility-labels)                |  [script](../../tools/review/rules/accessibility.js)  | Review which field types truly need labels    | Draft  |
| 7   | `tab-order-zero`           | TabOrder must be 0 (auto-calculated)                   |    4     |               [doc](../../docs/standards/form-template-standard.md#7-tab-order-zero--tab-order-auto-calculated)                |    [script](../../tools/review/rules/tab-order.js)    | Quick review — 4 findings                     | Draft  |
| 8   | `tab-order-unique`         | No duplicate non-zero TabOrder per page                |    0     |              [doc](../../docs/standards/form-template-standard.md#8-tab-order-unique--tab-order-unique-per-page)               |    [script](../../tools/review/rules/tab-order.js)    | Clean — verify with edge cases                | Draft  |
| 9   | `calendar-name-match`      | Calendar config should match field name intent         |    8     |           [doc](../../docs/standards/form-template-standard.md#9-calendar-name-match--calendar-config-matches-name)            | [script](../../tools/review/rules/calendar-config.js) | Review heuristic patterns                     | Draft  |
| 10  | `calendar-legacy`          | Calendar fields should not use legacy datepicker       |    0     |              [doc](../../docs/standards/form-template-standard.md#10-calendar-legacy--calendar-legacy-datepicker)              | [script](../../tools/review/rules/calendar-config.js) | Clean — verify detection works                | Draft  |
| 11  | `calendar-valid-config`    | Calendar config must be a known A-H combination        |    0     |          [doc](../../docs/standards/form-template-standard.md#11-calendar-valid-config--calendar-valid-configuration)          | [script](../../tools/review/rules/calendar-config.js) | Clean — structural check                      | Draft  |
| 12  | `script-orphan-assignment` | Script assignments must reference existing controls    |  1,147   | [doc](../../docs/standards/form-template-standard.md#12-script-orphan-assignment--script-assignments-reference-valid-controls) | [script](../../tools/review/rules/script-hygiene.js)  | Investigate base-template inheritance         | Draft  |
| 13  | `script-unassigned`        | Event scripts must be assigned to a control            |    0     |           [doc](../../docs/standards/form-template-standard.md#13-script-unassigned--event-scripts-must-be-assigned)           | [script](../../tools/review/rules/script-hygiene.js)  | Clean — only checks ControlEventScriptItem    | Draft  |
| 14  | `script-unused-template`   | Template helpers must be referenced from other scripts |   107    |      [doc](../../docs/standards/form-template-standard.md#14-script-unused-template--template-helpers-must-be-referenced)      | [script](../../tools/review/rules/script-hygiene.js)  | Review — may have dynamic call patterns       | Draft  |
| 15  | `script-empty-body`        | Scripts must have non-empty bodies                     |    0     |           [doc](../../docs/standards/form-template-standard.md#15-script-empty-body--scripts-have-non-empty-bodies)            | [script](../../tools/review/rules/script-hygiene.js)  | Clean — verify detection works                | Draft  |
| 16  | `script-field-reference`   | Script field references must exist in template         |    92    |         [doc](../../docs/standards/form-template-standard.md#16-script-field-reference--script-field-references-exist)         | [script](../../tools/review/rules/script-hygiene.js)  | Review false positives from dynamic refs      | Draft  |
| 17  | `orphan-container-ref`     | ContainerId must reference a valid container           |    0     |           [doc](../../docs/standards/form-template-standard.md#17-orphan-container-ref--container-references-valid)            |   [script](../../tools/review/rules/orphan-refs.js)   | Clean — verify with edge cases                | Draft  |
| 18  | `orphan-group-member`      | Group members must reference valid fields              |    0     |       [doc](../../docs/standards/form-template-standard.md#18-orphan-group-member--group-members-reference-valid-fields)       |   [script](../../tools/review/rules/orphan-refs.js)   | Clean — verify with edge cases                | Draft  |

### Planned Standards (not yet implemented)

| #   | Rule ID                     | Standard                                             | Source    | Notes                                 |
| --- | --------------------------- | ---------------------------------------------------- | --------- | ------------------------------------- |
| 17  | `container-responsive-flow` | Multi-field containers must have responsive flow set | xml-fixer | Containers with >1 field              |
| 18  | `distance-to-border`        | Fields must not be too close to page edge            | xml-fixer | <30px from right border               |
| 19  | `label-overlap`             | Labels must not overlap adjacent fields              | xml-fixer | Proximity-based detection             |
| 20  | `spelling`                  | Field names must be spelled correctly                | xml-fixer | nspell + hunspell                     |
| 21  | `default-text`              | Fields must not have default text values             | xml-fixer | "Checkbox", "Signature Stamp", "Next" |

### Future Capabilities

| Item                     | Status  | Notes                                     |
| ------------------------ | ------- | ----------------------------------------- |
| Auto-fix mode (`--fix`)  | Planned | Rule-level fix functions, flag-controlled |
| Web services review      | Planned | New component type                        |
| Dashboards review        | Planned | New component type                        |
| EmanuelJofre sandbox run | Pending | Compare findings across environments      |

## Review Log

Track decisions made during each standard's review session.

_(Empty — will be populated as we review each rule)_

<!--
Entry format:
### Rule: {rule-id} — {date}
- **Findings reviewed**: N of M
- **False positives found**: description
- **Changes made**: what was adjusted
- **Decision**: approved / needs rework / severity changed
-->

## Infrastructure Completed

- [x] Task scaffolding (`research/standards-review/`, CLAUDE.md)
- [x] Tool structure (`tools/review/` with `lib/`, `rules/`)
- [x] XML parsing helper (`lib/parse-template.js`)
- [x] Report generation (`lib/report.js`)
- [x] CLI entry point (`review-forms.js`)
- [x] Standards document (`docs/standards/form-template-standard.md`)
- [x] npm script (`review:forms`)
- [x] Updated CLAUDE.md files (root, research/, tools/)
- [x] First WADNR run — 77 templates, 2,366 findings

## Blocked

Nothing currently blocked.
