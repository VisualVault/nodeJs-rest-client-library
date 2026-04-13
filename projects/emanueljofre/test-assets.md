# Test Assets — EmanuelJofre (vvdemo / EmanuelJofre / Main)

Read-write: **Yes** — primary development/testing environment.

## Forms

| Name | Template ID | Purpose | Configs | Notes |
|------|-------------|---------|---------|-------|
| DateTest | `6be0265c-152a-f111-ba23-0afff212cc87` | Full date config coverage — primary test harness | A-H × 3 modes (26 fields) | Field map in `testing/fixtures/vv-config.js` FIELD_MAP |
| TargetDateTest | `203734a0-5433-f111-ba23-0afff212cc87` | URL parameter input (Category 4) — all fields have `enableQListener=true` | A-H × 3 modes (26 fields) | Same field layout as DateTest |
| Date Bug 1 | — | Reproduction form for FORM-BUG-1 | — | Single-purpose |
| Date Shifting | — | Demonstrates cross-layer date shifting | — | Single-purpose |
| Date to global function | — | Tests global function date handling | — | Single-purpose |

### DateTest — Field Map

8 configs × 3 initial-value modes. Full executable config in `testing/fixtures/vv-config.js`.

| Config | enableTime | ignoreTZ | useLegacy | Base | Preset | CurrentDate |
|--------|-----------|----------|-----------|------|--------|-------------|
| A | false | false | false | Field7 | Field2 | Field1 |
| B | false | true | false | Field10 | Field27 | Field28 |
| C | true | false | false | Field6 | Field15 | Field17 |
| D | true | true | false | Field5 | Field16 | Field18 |
| E | false | false | true | Field12 | Field19 | Field23 |
| F | false | true | true | Field11 | Field20 | Field24 |
| G | true | false | true | Field14 | Field21 | Field25 |
| H | true | true | true | Field13 | Field22 | Field26 |

## Web Services

| Name | Script ID | Purpose | Parameters/Actions |
|------|-----------|---------|-------------------|
| DateTestWSHarness | `da6277cd-b32e-f111-ba23-0afff212cc87` | Multi-purpose WS date testing | Action (WS-1 through WS-7), TargetConfigs (A-H), RecordID, InputDate, InputFormats |

Run via: `node tools/runners/run-ws-test.js --action WS-2`

## Saved Records

Created by `testing/global-setup.js` and cached in `testing/config/saved-records.json`. Fallback hardcoded records in `vv-config.js` HARDCODED_SAVED_RECORDS.

| Key | Configs | TZ | Input Method | Purpose |
|-----|---------|-----|-------------|---------|
| cat3-A-BRT | A + D | BRT | typed | Reload test — date-only + datetime |
| cat3-AD-IST | A + D | IST | typed | Cross-TZ reload — same configs, different TZ |
| cat3-C-BRT | C | BRT | popup | Reload test — datetime, popup input |
| cat3-B-BRT | B | BRT | typed | Reload test — date-only + ignoreTZ |
| cat3-G-BRT | G | BRT | typed | Reload test — legacy datetime |
| cat3-EF-BRT | E + F | BRT | typed | Reload test — legacy date-only |
| cat3-H-BRT | H | BRT | typed | Reload test — legacy datetime + ignoreTZ |
| cat3-B-IST | B | IST | typed | Cross-TZ reload — ignoreTZ |

## Scheduled Processes

| Name | Script Location | Purpose |
|------|----------------|---------|
| ScheduledProcessTestHarness | `scripts/test-scripts/scheduled/ScheduledProcessTestHarness.js` | Validates SP pattern: auth, read-only query, postCompletion |

Run via:
- Direct: `node tools/runners/run-sp-test.js`
- Direct (no completion): `node tools/runners/run-sp-test.js --skip-completion`
- Server: `curl http://localhost:3000/testscripts/scheduled/ScheduledProcessTestHarness`

### VV Admin Objects

| Name | Type | Script ID | Notes |
|------|------|-----------|-------|
| ScheduledProcessTestHarness | Outside Process (Scheduled, Node.Js) | `ccdc50f3-5e37-f111-ba23-0e3ceb11fc25` | Completion Callback enabled |
| SPTestHarness | Scheduled Service | — | Linked to ScheduledProcessTestHarness. **Disabled** after testing. |

### Log Behavior Finding (2026-04-13)

The `response.json()` message appears in the VV Scheduled Service Log for **both** the Test button and the scheduler path. The `postCompletion()` message does NOT appear in the log — it signals completion to the scheduler (advances recurrence, sets Result flag) but the visible Message column comes from `response.json()`. Confirmed on WADNR production schedules (CommunicationLogSendImmediate, AGOLPostFponlineDataToAGOLTables).

## Notes

- **Playwright integration**: `testing/fixtures/vv-config.js` exports `FORM_TEMPLATE_URL`, `TARGET_FORM_TEMPLATE_URL`, `FIELD_MAP`, `SAVED_RECORDS`, and `RECORD_DEFINITIONS` for programmatic test use.
- **TargetDateTest** shares the same `xcid`/`xcdid` revision GUIDs as DateTest — they're sibling revisions of the same field layout.
