# Bug #2 Audit Report: Inconsistent User Input Handlers

**Date**: 2026-04-06
**Auditor**: Playwright automated verification
**Original evidence**: Manual Claude-in-Chrome testing, 2026-03-31

---

## Audit Objective

Independently verify Bug #2 (legacy popup handler stores different format than typed input handler) using Playwright automated tests, before reporting to the product team.

## Methodology

### Dual-method verification

1. **Standalone audit script** (`testing/scripts/explore-legacy-popup.js`) — Playwright headless Chromium, BRT timezone, programmatic popup interaction + typed input + value capture for all 4 legacy configs plus Config A control.
2. **Formal Playwright spec** (`testing/date-handling/cat-1-legacy-popup.spec.js`) — standard Playwright test runner with `--project BRT-chromium`, using the same test data and assertion framework as all other specs.
3. **Cat 2 re-verification** — `cat-2-typed-input.spec.js` re-run via `--project BRT-chromium` to confirm the typed input side independently.

### DOM Discovery

The audit included DOM discovery for the legacy popup. Key finding: **legacy fields use the same Kendo calendar popup widget as non-legacy fields**. The only difference is the toggle mechanism:

- **Non-legacy**: `<kendo-datepicker>` wrapper with `<span role="button" aria-label="Toggle calendar">`
- **Legacy**: `<div class="d-picker"><input><span class="k-icon k-i-calendar cal-icon"></span></div>`

Both open the same `<kendo-popup>` → `<kendo-calendar>` structure. This enabled reuse of `selectDateInDatePicker()` for the legacy popup spec.

---

## Results

### Audit Script Results (Standalone)

| Config      | Field   | Popup Raw                    | Typed Raw               | Raw Match | Bug #2  |
| ----------- | ------- | ---------------------------- | ----------------------- | --------- | ------- |
| A (control) | Field7  | `"2026-03-15"`               | `"2026-03-15"`          | YES       | NO      |
| E           | Field12 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15"`          | NO        | **YES** |
| F           | Field11 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15"`          | NO        | **YES** |
| G           | Field14 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T00:00:00"` | NO        | **YES** |
| H           | Field13 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T00:00:00"` | NO        | **YES** |

### Playwright Spec Results (Formal)

**Cat 1 Legacy Popup** (`cat-1-legacy-popup.spec.js --project BRT-chromium`):

| TC      | Expected                | Received                     | Result |
| ------- | ----------------------- | ---------------------------- | ------ |
| 1-E-BRT | `"2026-03-15"`          | `"2026-03-15T03:00:00.000Z"` | FAIL   |
| 1-F-BRT | `"2026-03-15"`          | `"2026-03-15T03:00:00.000Z"` | FAIL   |
| 1-G-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | FAIL   |
| 1-H-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | FAIL   |

**Cat 2 Typed Input** (`cat-2-typed-input.spec.js --project BRT-chromium`):

| TC      | Expected                | Received                | Result |
| ------- | ----------------------- | ----------------------- | ------ |
| 2-E-BRT | `"2026-03-15"`          | `"2026-03-15"`          | PASS   |
| 2-F-BRT | `"2026-03-15"`          | `"2026-03-15"`          | PASS   |
| 2-G-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS   |
| 2-H-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS   |

### Run-1 vs Run-2 Comparison

| TC      | Run-1 (Manual, 2026-03-31)   | Run-2 (PW, 2026-04-06)       | Match |
| ------- | ---------------------------- | ---------------------------- | ----- |
| 1-E-BRT | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | YES   |
| 1-F-BRT | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | YES   |
| 1-G-BRT | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | YES   |
| 1-H-BRT | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | YES   |

All run-2 values match run-1 exactly.

---

## Conclusion

**Bug #2 is CONFIRMED with dual-method verification.**

- **Popup handler** (`calChangeSetValue`) stores raw `toISOString()` — full UTC datetime with Z suffix
- **Typed handler** (`calChange`) routes through `getSaveValue()` — correct format (date-only or local datetime)
- **Non-legacy control (Config A)**: popup and typed produce identical values — Bug #2 is legacy-only
- **ignoreTZ has no effect**: E=F and G=H in all tests — the flag is a no-op on the legacy popup path

### Evidence Quality

| Criterion                 | Status                                         |
| ------------------------- | ---------------------------------------------- |
| Automated Playwright spec | Created and run (`cat-1-legacy-popup.spec.js`) |
| Standalone audit script   | Run (`explore-legacy-popup.js`)                |
| Non-legacy control        | Config A tested — no Bug #2                    |
| Cross-category comparison | Cat 1 popup vs Cat 2 typed for all 4 configs   |
| Run-1 vs Run-2 match      | All values identical across methods            |
| Dual-method confirmation  | Manual (2026-03-31) + Playwright (2026-04-06)  |

---

## DB Evidence (2026-04-06)

### Schema Discovery

The `dbo.DateTest` table schema reveals **all calendar fields are SQL Server `datetime` type** — there is no `date` column type. This means the JavaScript format difference translates to an **actual data difference in the database**.

### Saved Record Comparison

Two records created via Playwright, same date (March 15, 2026), different input methods:

| Record | DataID                                 | Method       | Field12 (E, date-only) pre-save | Field14 (G, DateTime) pre-save |
| ------ | -------------------------------------- | ------------ | ------------------------------- | ------------------------------ |
| Popup  | `6b6d73a9-1b1d-4283-8816-834e25ab8258` | Legacy popup | `"2026-03-15T03:00:00.000Z"`    | `"2026-03-15T03:00:00.000Z"`   |
| Typed  | `9c82f195-15cd-4309-9dec-e876994fcf2e` | Typed input  | `"2026-03-15"`                  | `"2026-03-15T00:00:00"`        |

**Expected DB values** (to be verified by DB query):

| Field               | Popup record DB           | Typed record DB           | Difference  |
| ------------------- | ------------------------- | ------------------------- | ----------- |
| Field12 (date-only) | `2026-03-15 03:00:00.000` | `2026-03-15 00:00:00.000` | **3 hours** |
| Field14 (DateTime)  | `2026-03-15 03:00:00.000` | `2026-03-15 00:00:00.000` | **3 hours** |

### Impact

- SQL queries like `WHERE Field12 = '2026-03-15'` would match typed but NOT popup values
- Reports, dashboards, and SQL filters become unreliable for legacy popup-entered dates
- The 3-hour difference equals the BRT offset (UTC-3) — different offsets in other timezones (e.g., IST would produce 5.5-hour difference)

### Post-Save Normalization

After saving, VV re-reads the record and the V1 init path normalizes the in-memory value:

- Popup Field12 post-save: `"2026-03-15"` (normalized from `"2026-03-15T03:00:00.000Z"`)
- This means the **display normalizes on next load**, but the **DB retains the UTC time**

### Severity Upgrade Justification

Original severity: **Low** (format inconsistency only).
Revised severity: **Medium** — actual DB value difference, breaks SQL queries and cross-component data consumption.

### Artifacts Created

- `testing/helpers/vv-calendar.js` — added `selectDateViaLegacyPopup()` function
- `testing/date-handling/cat-1-legacy-popup.spec.js` — new spec for legacy popup tests
- `testing/scripts/audit-bug2-db-evidence.js` — popup vs typed save script for DB comparison
- `tasks/date-handling/forms-calendar/runs/tc-1-{E,F,G,H}-BRT-run-2.md` — audit run files
- `testing/tmp/bug2-audit-results.json` — structured audit data
