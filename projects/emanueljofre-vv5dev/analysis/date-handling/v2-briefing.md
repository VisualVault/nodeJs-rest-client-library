# V2 Date-Handling Briefing — EmanuelJofre-vv5dev

A 5-minute summary of what the V2 calendar pipeline does to date handling. Intended for engineering and architecture leadership. Companion to the comprehensive analysis in [v2-impact-analysis.md](v2-impact-analysis.md).

---

## What V2 is

V2 is the rewritten calendar code path on the VisualVault FormViewer (Kendo v2 + new init logic, gated by `useUpdatedCalendarValueLogic = true` at the Database scope). V1 — the legacy path — runs in production on most customers today. V2 is being trialed on this sandbox (`EmanuelJofre / Main / vv5dev`) as the V2 reference environment for the date-handling investigation.

## What V2 fixes

V2 closes three V1 forms-calendar defects:

- **FORM-BUG-5** (fake-Z drift in `GetFieldValue`) — V1 added a fake `Z` suffix that caused `SetFieldValue(GetFieldValue())` round-trips to drift by the user's TZ offset every cycle. V2 returns the raw value without the fake Z. Round-trips are stable.
- **FORM-BUG-4** (save format strips Z) — V1's `getSaveValue()` deliberately stripped the Z UTC marker on save, producing TZ-ambiguous local strings. V2 routes through `moment().toISOString()` and stores full ISO+Z.
- **FORM-BUG-6** (Invalid Date / RangeError on empty fields) — V1's `GetFieldValue` on empty DateTime fields returned `"Invalid Date"` for Config D and threw `RangeError` for Config C. V2 returns empty/null cleanly.

Each fix represents real customer-facing improvement on the script-driven workflow path.

## What V2 breaks

V2 introduces three forms-calendar defects, two of which are **silent data integrity regressions**:

- **FORM-BUG-V2-TYPED-MM-OVERFLOW** (HIGH severity, silent corruption) — A LATAM/EU user typing `15/03/2026` (DD/MM intent) into an enUS-Culture form silently stores **May 3, 2026** instead. JS `Date(Y, M-1, D)` overflow-normalizes any out-of-range month/day without validation.
- **FORM-BUG-V2-CONFIG-D-TYPED-EMPTY** (MEDIUM severity, silent loss) — Typing into Config D fields (DateTime, ignoreTZ, non-legacy) does not commit. The field appears to accept the input; the underlying value is `""`. SFV path is unaffected.
- **FORM-BUG-8** (MEDIUM severity, hangs) — `SetFieldValue(field, '' | null)` never resolves. The browser tab freezes indefinitely.

Plus three additional V2-only defects of lower individual severity but related architectural concerns: `FORM-BUG-V2-EPOCH-PRESERVED`, `FORM-BUG-V2-URL-PARAM-NORMALIZE`, `FORM-BUG-V2-PRESET-YEAR`. And two stored-format-only changes: `FORM-BUG-V2-LEGACY-Z` and `FORM-BUG-V2-UTCMIDNIGHT` (both Low — calendar instant preserved, format differs from V1).

## What V2 does not change

The V1/V2 toggle is **forms-only**. Server-side, dashboard, and DocLib defects apply identically on V1 and V2. So even on V2:

- Web Services (REST API): WS-BUG-1 cross-layer shift, WS-BUG-2 LATAM null, WS-BUG-3 ambiguous swap, WS-BUG-4 endpoint mismatch, WS-BUG-5 silent null formats, WS-BUG-6 date-only takes time
- Dashboards: DB-BUG-1 format inconsistency
- Document Library: DOC-BUG-1 TZ→UTC, Z stripped

And three V1 forms-calendar defects persist on V2 unchanged:

- FORM-BUG-1 (Z stripped on form load)
- FORM-BUG-2 (popup vs typed legacy fields)
- FORM-BUG-7 (UTC+ users save the previous day on date-only fields)

## The bottom line

**V2 is not a strict upgrade.** Customers considering enabling V2 are trading three V1 defects (script-API drift, save-format strip, empty-field crash) for three V2 defects (silent typed-input corruption, silent typed-input loss, SFV-null hang) — plus six format/structural changes that complicate cross-environment data flows.

**For most customers**, the V2 trade-off is favorable IF:
1. Their integrations use SFV more than typed input
2. Their user input culture matches the customer Culture setting
3. They don't rely on Form Designer presets
4. They don't have Config D fields with significant typed-input usage

**For LATAM/EU customers** with Culture-mismatched typed input, V2 makes the situation worse — silent data corruption replaces no-op or clear errors.

**For all customers**, the cross-component bugs (WS, DocLib, Dashboard) and the persistent V1 forms-calendar bugs (FORM-BUG-1, -2, -7) are unaffected by V2 — these need their own fixes regardless.

## Two production-active risks

1. **The #124697 chain** — every `postForms`-written DateTime record silently shifts on first user open and saves the shifted value. This is an existing customer-impacting issue; V2 does not fix it but does not worsen it. Workaround: `forminstance/` endpoint. Hundreds of thousands of records were corrupted in one production case before the workaround landed.

2. **LATAM typed-input on V2** — the most concerning new V2 risk. Customer onboards LATAM users to a V2-enabled enUS-Culture form, users type DD/MM dates, every day-≤-12 input is silently stored as MM/DD-overflowed. Detection requires manual audit; downstream business consequences are unpredictable.

## What's needed

**For VV Engineering:**
- Add per-segment range validation in Kendo v2's typed-input pipeline (closes FORM-BUG-V2-TYPED-MM-OVERFLOW + likely closes the ISO-misparse case as a side benefit)
- Align `postForms` server-side serialization with `forminstance/` (closes WS-BUG-1 + WS-BUG-4)
- Refactor `initCalendarValueV2()` to remove FORM-BUG-3's hardcoded params (root cause of FORM-BUG-V2-PRESET-YEAR and a contributor to V2-UTCMIDNIGHT)

These three fixes account for ~60% of the V2 risk surface measured by weighted real impact.

**For Customer Success:**
- Pre-V2 readiness checklist for any customer enabling the toggle: API integrations, presets, typed-input culture, Config D fields
- Post-V2 monitoring: data audit for typed-input anomalies and presets-shifted records

**For integration partners:**
- Always normalize to ISO at the integration boundary
- Use `forminstance/` for any record that will be edited in Forms downstream

---

## Pointers

- Comprehensive analysis: [`v2-impact-analysis.md`](v2-impact-analysis.md)
- Bug catalog: [`v2-bugs-catalog.md`](v2-bugs-catalog.md)
- Per-bug dossiers: [`bug-reports/`](bug-reports/)
- Test evidence: [`testing/date-handling/`](../../testing/date-handling/)
