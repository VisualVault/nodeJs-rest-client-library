# Standards Review — Status

Last updated: 2026-04-15

## Current State

Tool infrastructure complete. Now reviewing each standard individually: validate logic, test against real data, calibrate severity/exceptions, approve or rework.

## Standards Review Tracker

Each standard goes through: **Draft** → **Under Review** → **Approved**

- **Draft**: Rule implemented, not yet validated against real findings
- **Under Review**: Actively inspecting output, calibrating, fixing false positives
- **Approved**: Logic validated, severity confirmed, exceptions documented, standard finalized

### Implemented Standards

| #   | Rule ID                        | Standard                                                | Severity | Findings |                        Rule Script                        | Next Action                                                 | Status |
| --- | ------------------------------ | ------------------------------------------------------- | :------: | :------: | :-------------------------------------------------------: | ----------------------------------------------------------- | ------ |
| 1   | `title-case`                   | Input field names must be Title Case                    | warning  |   533    |    [script](../../tools/review/rules/field-naming.js)     | Review exceptions list, check false positives               | Draft  |
| 2   | `default-name`                 | Fields must not have default/generic names              | warning  |    99    |    [script](../../tools/review/rules/field-naming.js)     | Verify all default patterns are covered                     | Draft  |
| 3   | `duplicate-name`               | Field names must be unique within template              |  error   |    1     |    [script](../../tools/review/rules/field-naming.js)     | Quick review — 1 finding                                    | Draft  |
| 4   | `empty-name`                   | Fields must have a non-empty name                       |  error   |    0     |    [script](../../tools/review/rules/field-naming.js)     | Clean — verify with edge cases                              | Draft  |
| 5   | `valid-identifier`             | Field names must be valid JS identifiers                | warning  |    19    |    [script](../../tools/review/rules/field-naming.js)     | Review which characters are flagged                         | Draft  |
| 6   | `accessibility-label`          | Input fields must have an AccessibilityLabel            | warning  |   463    |    [script](../../tools/review/rules/accessibility.js)    | Review which field types truly need labels                  | Draft  |
| 7   | `tab-order-zero`               | TabOrder must be 0 (auto-calculated)                    | warning  |    4     |      [script](../../tools/review/rules/tab-order.js)      | Quick review — 4 findings                                   | Draft  |
| 8   | `tab-order-unique`             | No duplicate non-zero TabOrder per page                 |  error   |    0     |      [script](../../tools/review/rules/tab-order.js)      | Clean — verify with edge cases                              | Draft  |
| 9   | `calendar-name-match`          | Calendar config should match field name intent          | warning  |    8     |   [script](../../tools/review/rules/calendar-config.js)   | Review heuristic patterns                                   | Draft  |
| 10  | `calendar-legacy`              | Calendar fields should not use legacy datepicker        |   info   |    0     |   [script](../../tools/review/rules/calendar-config.js)   | Clean — verify detection works                              | Draft  |
| 11  | `calendar-valid-config`        | Calendar config must be a known A-H combination         | warning  |    0     |   [script](../../tools/review/rules/calendar-config.js)   | Clean — structural check                                    | Draft  |
| 12  | `script-orphan-assignment`     | Script assignments must reference existing controls     | warning  |  1,147   |   [script](../../tools/review/rules/script-hygiene.js)    | Investigate base-template inheritance                       | Draft  |
| 13  | `script-unassigned`            | Event scripts must be assigned to a control             | warning  |    0     |   [script](../../tools/review/rules/script-hygiene.js)    | Clean — only checks ControlEventScriptItem                  | Draft  |
| 14  | `script-unused-template`       | Template helpers must be referenced from other scripts  | warning  |   107    |   [script](../../tools/review/rules/script-hygiene.js)    | Review — may have dynamic call patterns                     | Draft  |
| 15  | `script-empty-body`            | Scripts must have non-empty bodies                      | warning  |    0     |   [script](../../tools/review/rules/script-hygiene.js)    | Clean — verify detection works                              | Draft  |
| 16  | `script-field-reference`       | Script field references must exist in template          | warning  |    92    |   [script](../../tools/review/rules/script-hygiene.js)    | Review false positives from dynamic refs                    | Draft  |
| 17  | `orphan-container-ref`         | ContainerId must reference a valid container            |  error   |    0     |     [script](../../tools/review/rules/orphan-refs.js)     | Clean — verify with edge cases                              | Draft  |
| 18  | `orphan-group-member`          | Group members must reference valid fields               | warning  |    0     |     [script](../../tools/review/rules/orphan-refs.js)     | Clean — verify with edge cases                              | Draft  |
| 19  | `container-responsive-flow`    | Multi-field containers must have responsive flow set    | warning  |   134    |  [script](../../tools/review/rules/container-config.js)   | Review — containers with >1 field                           | Draft  |
| 20  | `distance-to-border`           | Fields must not be too close to page edge               | warning  |   127    |       [script](../../tools/review/rules/layout.js)        | Review threshold (30px), check for false positives          | Draft  |
| 21  | `label-overlap`                | Labels must not overlap adjacent fields                 | warning  |   120    |       [script](../../tools/review/rules/layout.js)        | Review proximity thresholds (5px overlap, ±15px vertical)   | Draft  |
| 22  | `spelling`                     | Field names must be spelled correctly                   |   info   |   884    |      [script](../../tools/review/rules/spelling.js)       | High count — needs domain dictionary for acronyms           | Draft  |
| 23  | `default-text`                 | Fields must not have default text values                | warning  |    13    |    [script](../../tools/review/rules/default-text.js)     | Quick review — 13 findings                                  | Draft  |
| 24  | `accessibility-label-match`    | AccessibilityLabel must match visible label text        | warning  |  1,881   | [script](../../tools/review/rules/accessibility-match.js) | High count — proximity heuristic needs calibration          | Draft  |
| 25  | `simple-upload`                | Upload buttons must use simple upload mode              | warning  |    19    |    [script](../../tools/review/rules/upload-config.js)    | Quick review — 19 findings                                  | Draft  |
| 26  | `field-multiple-groups`        | Fields must not appear in more than one group           | warning  |   435    |    [script](../../tools/review/rules/group-checks.js)     | Common VV pattern (ReadOnly+Show/Hide). Severity→info?      | Draft  |
| 27  | `group-override-condition`     | Non-admin groups should include override condition      |   info   |   141    |    [script](../../tools/review/rules/group-checks.js)     | **Potentially customer-specific** (WADNR convention)        | Draft  |
| 28  | `field-max-length`             | Input fields must have appropriate MaxLength            |   info   |   246    |    [script](../../tools/review/rules/field-config.js)     | Heuristic: name→100, address→300, textarea→3000, default→50 | Draft  |
| 29  | `button-label-camelcase`       | Buttons and labels should use camelCase naming          | warning  |   529    | [script](../../tools/review/rules/naming-conventions.js)  | btn/lbl prefix convention                                   | Draft  |
| 30  | `label-unnamed-in-group`       | Only name labels if used in groups/conditions           |   info   |  1,175   |    [script](../../tools/review/rules/group-checks.js)     | High count — many renamed labels not in groups              | Draft  |
| 31  | `listener-disabled`            | Listeners should only be enabled when needed            |   info   |   399    |    [script](../../tools/review/rules/field-config.js)     | Security concern — verify fill-in/relate need               | Draft  |
| 32  | `admin-override-container`     | Template must have Admin Override container             | warning  |    0     |   [script](../../tools/review/rules/admin-override.js)    | Clean for WADNR — all templates have it                     | Draft  |
| 33  | `admin-override-security`      | Admin Override must have VaultAccess-only visibility    | warning  |    1     |   [script](../../tools/review/rules/admin-override.js)    | 1 template missing security group on admin container        | Draft  |
| 34  | `save-button-hidden`           | SaveButton FormControl must be hidden                   | warning  |    1     |    [script](../../tools/review/rules/form-controls.js)    | 1 template with visible SaveButton                          | Draft  |
| 35  | `tab-control-visible`          | TabControl FormControl must not be hidden               | warning  |    26    |    [script](../../tools/review/rules/form-controls.js)    | 26 templates hiding TabControl via groups                   | Draft  |
| 36  | `accessibility-required`       | Required fields must have "field Required" suffix       | warning  |    68    |    [script](../../tools/review/rules/accessibility.js)    | Required fields missing suffix in accessibility label       | Draft  |
| 37  | `button-min-size`              | Buttons must be at least 24x24 pixels                   | warning  |   234    |       [script](../../tools/review/rules/layout.js)        | 508 compliance — touch target minimum                       | Draft  |
| 38  | `group-meaningful-name`        | Group names should be descriptive                       |   info   |    0     |    [script](../../tools/review/rules/group-checks.js)     | Clean for WADNR — all groups have meaningful names          | Draft  |
| 39  | `group-consolidate-conditions` | Groups with identical conditions should be consolidated |   info   |    0     |    [script](../../tools/review/rules/group-checks.js)     | Clean for WADNR — no duplicate condition sets               | Draft  |
| 40  | `tab-reference-by-name`        | Scripts should reference tabs by name, not number       | warning  |    0     |   [script](../../tools/review/rules/script-hygiene.js)    | Clean for WADNR — no numeric tab references                 | Draft  |

### Planned Standards (not yet implemented)

_(All standards from xml-fixer and VV Form Template standards have been implemented. No planned standards remaining.)_

### Calibration Notes (existing rules — field type coverage gaps)

During the xml-fixer audit, these field type coverage differences were found. Not new standards — to be addressed during Draft → Approved review of each existing rule.

| Rule                  | Harness coverage | xml-fixer also applies to                                                         | Action                                          |
| --------------------- | ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| `title-case`          | 7 types          | + FieldDataGrid, FormIDStamp, ImageFormControl, RepeatingRowControl, UploadButton | Review during `title-case` calibration          |
| `accessibility-label` | 8 types          | + ImageFormControl, RepeatingRowControl, FieldDataGrid                            | Review during `accessibility-label` calibration |
| `tab-order-zero`      | 8 types          | + UserIDStamp                                                                     | Review during `tab-order-zero` calibration      |

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
- [x] Declarative `appliesTo` metadata on all 18 rules (field type mapping)
- [x] Declarative `component` metadata on all 18 rules (multi-component support)
- [x] Query helpers in `rules/index.js` (`rulesForFieldType`, `fieldTypeMatrix`, `rulesForComponent`)
- [x] Unified CLI dispatcher (`review.js` with `--component` flag)
- [x] npm script (`review`) for unified entry point
- [x] Implemented all 9 xml-fixer standards (#19-27) — 27 total rules
- [x] Spelling rule with nspell + hunspell dictionaries (`tools/review/dictionaries/`)
- [x] Layout geometry rules (distance-to-border, label-overlap)
- [x] Group structural checks (field-multiple-groups, group-override-condition)
- [x] Full WADNR run — 77 templates, 6,227 findings across 27 rules
- [x] Implemented 13 VV Form Template standards (#28-40) — 40 total rules
- [x] Extended parser: group security members, FormControl members, raw group data
- [x] New rule files: naming-conventions.js, field-config.js, admin-override.js, form-controls.js
- [x] Full WADNR run — 77 templates, 8,751 findings across 40 rules

## Blocked

Nothing currently blocked.
