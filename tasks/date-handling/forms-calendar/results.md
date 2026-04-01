# Date Handling Bug — Live Test Results

> **ARCHIVED** — This file documents test sessions run through 2026-03-31.
> New test records are in `runs/` (per-TC run files) and `summaries/` (per-TC status).
> Do not append new session narratives here. See [Session Index](#session-index-from-2026-04-01) below for new run references.

## Purpose

Live browser testing of date handling defects in the VisualVault Forms calendar field component. Tests were performed against the draft analysis in `../analysis.md` (same folder) which identifies 5 potential bugs across 8 user scenarios. This is part of a broader date handling investigation across all VV components — see `../CLAUDE.md` for full scope.

## Test Environment

| Parameter                          | Value                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Browser Timezone**               | America/Sao_Paulo (UTC-3), with Mumbai (UTC+5:30) override for cross-TZ tests                                                                                            |
| **Test Date**                      | 2026-03-27                                                                                                                                                               |
| **Platform**                       | VisualVault FormViewer, Build 20260304.1                                                                                                                                 |
| **`useUpdatedCalendarValueLogic`** | `false` — **confirmed live** from CalendarValueService instance. Verify snippet: `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` — `false` = V1, `true` = V2 |
| **`useLegacy`**                    | `false` on all tested fields — legacy control config not available                                                                                                       |

## Related Files

- **Draft analysis**: `analysis.md` — initial code review, treat as hypothesis
- **This file**: `results.md` — live test evidence (source of truth for confirmed findings)
- **Overall context**: `../CLAUDE.md` — full investigation scope across all VV components
- **Test matrix**: `matrix.md` — authoritative coverage tracker (~242 slots)

**Test ID namespaces** (two coexist — never mix): session execution IDs like `1.1`, `2.3` identify actual test runs and map to H3 headings below; category test IDs like `7-D-isoNoZ`, `12-year-boundary` identify planned test slots in `matrix.md`.

## Form URLs

| Form                             | URL                                                                                                                                                                                                      | Notes                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Test Form 1 (Subscription Packs) | Template creates new instance each load — use DataID URL to reopen                                                                                                                                       | Original test, 2 date fields                           |
| Test Form 2 (DateTest) template  | `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939`           | Creates new form each load (000004, 000005, 000006...) |
| DateTest-000004 Rev 1 (saved)    | `https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939` | Saved record used for reload and cross-TZ tests        |

---

## Session 1, Group 1: Initial Bug Discovery — Subscription Packs Form (BRT)

**Date**: 2026-03-27 | **TZ**: America/Sao_Paulo (UTC-3) | **Form**: Subscription Packs (000-000190) | **Config tested**: D only
**Purpose**: Initial discovery — confirm fake-Z hypothesis, measure round-trip drift
**Key outcome**: Bug #5 confirmed; -3h drift per trip established

**Fields**: Start Date & End Date
**Config**: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`

### Test 1.1: Scenario 1 — Calendar Popup (Start Date)

**Action**: Opened calendar popup → selected March 15, 2026 → Time defaulted to 12:00 AM → clicked Set

| Metric                          | Value                        |
| ------------------------------- | ---------------------------- |
| Display in input                | `03/15/2026` ✓               |
| Raw stored value (partition)    | `"2026-03-15T00:00:00"`      |
| GetFieldValue() return          | `"2026-03-15T00:00:00.000Z"` |
| Expected from `e.toISOString()` | `"2026-03-15T03:00:00.000Z"` |
| Has Z suffix in raw             | **NO**                       |

**Key Finding**: Value IS transformed between `toISOString()` and storage. The analysis claims `calChangeSetValue()` bypasses `getSaveValue()`, but the stored format `"2026-03-15T00:00:00"` matches the legacy `getSaveValue()` output exactly: `moment(input).format("YYYY-MM-DD[T]HH:mm:ss")`. This means the value goes through additional processing somewhere in the pipeline.

### Test 1.2: Scenario 2 — Typed Input (End Date)

**Action**: Clicked End Date input → typed 03/15/2026 segment by segment → Tab to confirm

| Metric                       | Value                        |
| ---------------------------- | ---------------------------- |
| Display in input             | `03/15/2026` ✓               |
| Raw stored value (partition) | `"2026-03-15T00:00:00"`      |
| GetFieldValue() return       | `"2026-03-15T00:00:00.000Z"` |
| Has Z suffix in raw          | **NO**                       |

**Key Finding**: Both popup (Scenario 1) and typed input (Scenario 2) produce **identical stored values**. Bug #2 (inconsistent handlers) was **NOT reproduced** with this config (`useLegacy=false`, `enableTime=true`, `ignoreTimezone=true`).

### Test 1.3: Bug #5 — SetFieldValue/GetFieldValue Round-Trip

**Action**: Retrieved End Date via `GetFieldValue()`, then set it back via `SetFieldValue()`

```
Step 1: Raw stored                    → "2026-03-15T00:00:00"
Step 2: GetFieldValue() returned      → "2026-03-15T00:00:00.000Z"  (fake [Z] added)
Step 3: SetFieldValue() with fake Z   → "2026-03-15T00:00:00.000Z"
Step 4: JS interprets Z as UTC        → March 15, 00:00 UTC = March 14, 21:00 BRT
Step 5: New raw stored value          → "2026-03-14T21:00:00"
Step 6: Display now shows             → 03/14/2026  ← DATE SHIFTED!
```

| Metric        | Before                       | After Round-Trip              |
| ------------- | ---------------------------- | ----------------------------- |
| Raw stored    | `"2026-03-15T00:00:00"`      | `"2026-03-14T21:00:00"`       |
| GetFieldValue | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14T21:00:00.000Z"`  |
| Display       | `03/15/2026`                 | **`03/14/2026`**              |
| Shift         | —                            | **-3 hours (= UTC-3 offset)** |

**CONFIRMED**: Bug #5 causes a **date shift on every round-trip**. The fake `[Z]` from `getCalendarFieldValue()` makes the value LOOK like UTC but it's actually local time. When `SetFieldValue` receives it back, JS interprets the Z as real UTC, shifting the date by the timezone offset.

**Severity**: Each call to `SetFieldValue(GetFieldValue("field"))` drifts the date by -3 hours. After 8 round-trips, the date would shift by a full day.

---

## Session 1, Group 2: Multi-Config Baseline and Bug #5 Deep-Dive — DateTest Form (BRT)

**Date**: 2026-03-27 | **TZ**: America/Sao_Paulo (UTC-3) [+ inline IST partial in Test 2.5] | **Form**: DateTest-000004/5/6 — 8 fields (Configs A/B/C/D)
**Purpose**: Full config matrix baseline, Bug #5 mechanics, popup vs typed parity, server reload, DB evidence
**Key outcomes**: Bug #2 not reproduced; DB stores mixed UTC/local; typed = popup with useLegacy=false

### Test Form Configuration

**8 fields with different configurations** (DataField10 added during session):

| Field       | enableInitialValue | Mode            | enableTime | ignoreTZ | useLegacy | Config ID |
| ----------- | :----------------: | --------------- | :--------: | :------: | :-------: | :-------: |
| DataField1  |         ✓          | Current Date    |    OFF     |   OFF    |    OFF    |     A     |
| DataField2  |         ✓          | Preset 3/1/2026 |    OFF     |   OFF    |    OFF    |     A     |
| DataField3  |         ✓          | Current Date    |    OFF     |   OFF    |    OFF    |     A     |
| DataField4  |         ✓          | Preset 3/1/2026 |    OFF     |   OFF    |    OFF    |     A     |
| DataField5  |        OFF         | —               |   **ON**   |  **ON**  |    OFF    |     D     |
| DataField6  |        OFF         | —               |   **ON**   |   OFF    |    OFF    |     C     |
| DataField7  |        OFF         | —               |    OFF     |   OFF    |    OFF    |     A     |
| DataField10 |        OFF         | —               |    OFF     |  **ON**  |    OFF    |     B     |

_DataField1-4 have initial values (used for Scenario 5/6 testing). DataField5-7,10 are empty (used for popup/typed/API testing)._
_DataField8/9 do not exist — naming jumped from 7 to 10._

### Test 2.1: Baseline — Initial Values on Form Load (Scenarios 5 & 6)

**Observation**: DataField1-4 store actual **Date objects** (not strings) in the partition.

| Field                     | Stored Type | ISO Value                  | Display              |
| ------------------------- | ----------- | -------------------------- | -------------------- |
| DataField1 (Current Date) | Date object | `2026-03-27T20:02:51.472Z` | `03/27/2026` ✓       |
| DataField2 (Preset 3/1)   | Date object | `2026-03-01T03:00:00.000Z` | `03/01/2026` ✓       |
| DataField3 (Current Date) | Date object | `2026-03-27T20:02:51.475Z` | `03/27/2026` ✓       |
| DataField4 (Preset 3/1)   | Date object | `2026-03-01T03:00:00.000Z` | `03/01/2026` ✓       |
| DataField5 (empty)        | string      | `""`                       | `MM/dd/yyyy hh:mm a` |
| DataField6 (empty)        | string      | `""`                       | `MM/dd/yyyy hh:mm a` |
| DataField7 (empty)        | string      | `""`                       | `MM/dd/yyyy`         |

**Key Findings for Initial Values**:

- **Scenario 6 (Current Date)**: Works correctly ✓ — `new Date()` stored as Date object with correct UTC time
- **Scenario 5 (Preset Date 3/1/2026)**: Stored as `2026-03-01T03:00:00.000Z` — midnight local BRT (UTC-3) in UTC. Display is correct.
    - **Risk**: On server save/reload, `parseDateString()` may strip Z and reinterpret, potentially shifting the date
- **GetFieldValue for date-only fields (DataField1-4)**: Returns the Date object's `.toString()` — e.g., `"Fri Mar 27 2026 17:02:51 GMT-0300 (Brasilia Standard Time)"`. This is neither ISO format nor the raw stored value. Developers using this value would get an unpredictable format.
- **After server save/reload**: Date-only initial value fields change from Date objects to strings in `"MM/dd/yyyy HH:mm:ss"` format (e.g., `"03/27/2026 20:02:51"`) — format changes but display remains correct

### Test 2.2: Scenario 1 — Calendar Popup (DataField5, 6, 7)

**Action**: Opened calendar popup on each field → selected March 15, 2026 → For DateTime fields: selected 12:00 AM on Time tab → clicked Set. For date-only field: clicked 15 directly (no Set button needed).

**All three fields displayed `03/15/2026` (with 12:00 AM for DateTime fields) after popup selection ✓**

#### Stored Values After Popup Selection

| Field          | Config            | Raw Stored              | GetFieldValue()              | Has Z |
| -------------- | ----------------- | ----------------------- | ---------------------------- | :---: |
| **DataField5** | eTime=✓ iTz=**✓** | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` |  NO   |
| **DataField6** | eTime=✓ iTz=**✗** | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` |  NO   |
| **DataField7** | eTime=✗ iTz=✗     | `"2026-03-15"`          | `"2026-03-15"`               |  NO   |

**Critical Finding — GetFieldValue differs by `ignoreTimezone` setting**:

- **DataField5 (ignoreTZ=true)**: `getCalendarFieldValue()` adds a **fake literal `[Z]`** via `moment(value).format("....[Z]")`.
  Returns `"2026-03-15T00:00:00.000Z"` — LOOKS like UTC midnight but is actually **local midnight**.

- **DataField6 (ignoreTZ=false)**: `getCalendarFieldValue()` does `new Date(value).toISOString()`.
  Returns `"2026-03-15T03:00:00.000Z"` — **correct UTC conversion** of local midnight in UTC-3.

- **DataField7 (date-only)**: Returns raw value `"2026-03-15"` — clean, no issues.

### Test 2.3: Bug #5 — Round-Trip Comparison Across Configs

**Action**: For each field, called `VV.Form.SetFieldValue(field, VV.Form.GetFieldValue(field))`

| Field          | Config    | Before Raw            | GFV Used                   | After Raw             | Display After           | **Shifted?** |
| -------------- | --------- | --------------------- | -------------------------- | --------------------- | ----------------------- | :----------: |
| **DataField5** | iTz=**✓** | `2026-03-15T00:00:00` | `2026-03-15T00:00:00.000Z` | `2026-03-14T21:00:00` | **03/14/2026 09:00 PM** | **YES -3h**  |
| **DataField6** | iTz=**✗** | `2026-03-15T00:00:00` | `2026-03-15T03:00:00.000Z` | `2026-03-15T00:00:00` | 03/15/2026 12:00 AM     |     NO ✓     |
| **DataField7** | date-only | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | 03/15/2026              |     NO ✓     |

**Root Cause Analysis**:

- **DataField5 SHIFTS** because `ignoreTimezone=true` adds fake `[Z]` to local time.
  When `SetFieldValue` receives `"2026-03-15T00:00:00.000Z"`, JS parses it as **UTC midnight**.
  In UTC-3 browser, UTC midnight = March 14 21:00 local → stored as `"2026-03-14T21:00:00"`.

- **DataField6 is STABLE** because `ignoreTimezone=false` does a proper UTC conversion.
  `GetFieldValue` returns `"2026-03-15T03:00:00.000Z"` (real UTC for local midnight).
  When `SetFieldValue` receives this, JS correctly parses it back to March 15 00:00 local.

- **DataField7 is STABLE** because date-only format `"2026-03-15"` has no time or timezone to misinterpret.

---

_For coverage status, see [matrix.md](matrix.md). For bug analysis, see [analysis.md](analysis.md)._

### Test 2.4: Cross-Timezone Impact Analysis (Simulated)

**Cannot override browser timezone programmatically**, but the impact is mathematically derivable from the stored value format.

The stored value `"2026-03-15T00:00:00"` (no Z) is **timezone-ambiguous**. Each browser interprets it as local midnight in ITS timezone:

#### Same stored value, different timezones:

| Timezone          | Raw `"2026-03-15T00:00:00"` parsed as | Actual UTC moment      | Display    |
| ----------------- | ------------------------------------- | ---------------------- | ---------- |
| UTC-3 (Sao Paulo) | March 15, 00:00 BRT                   | `2026-03-15T03:00:00Z` | March 15 ✓ |
| UTC+0 (London)    | March 15, 00:00 GMT                   | `2026-03-15T00:00:00Z` | March 15 ✓ |
| UTC+5:30 (Mumbai) | March 15, 00:00 IST                   | `2026-03-14T18:30:00Z` | March 15 ✓ |
| UTC-8 (LA)        | March 15, 00:00 PST                   | `2026-03-15T08:00:00Z` | March 15 ✓ |

**Display is correct** in all timezones — the date shows March 15 everywhere because each browser treats it as local midnight. However, the **actual UTC moments differ**, which means:

- The same "March 15" in the database represents **different instants in time** depending on who entered it
- If User A (BRT) enters a date and User B (IST) reads it, they both see "March 15" but are referring to different UTC moments (8.5 hours apart)
- This is by design for `ignoreTimezone=true` (the field explicitly ignores timezone differences)

#### Bug #5 impact across timezones:

| Timezone       | GetFieldValue (fake Z) | SetFieldValue interprets as | Shift per round-trip    |
| -------------- | ---------------------- | --------------------------- | ----------------------- |
| UTC-3 (BRT)    | `"...T00:00:00.000Z"`  | March 14, 21:00 local       | **-3 hours**            |
| UTC+0 (GMT)    | `"...T00:00:00.000Z"`  | March 15, 00:00 local       | **0 hours** (no shift!) |
| UTC+5:30 (IST) | `"...T00:00:00.000Z"`  | March 15, 05:30 local       | **+5:30 hours**         |
| UTC-8 (PST)    | `"...T00:00:00.000Z"`  | March 14, 16:00 local       | **-8 hours**            |

**Critical insight**: Bug #5 shift direction depends on the timezone:

- **Negative UTC offsets** (Americas): dates drift **backward** (earlier)
- **UTC+0**: **no drift** (fake Z happens to be correct!)
- **Positive UTC offsets** (Asia/Europe east): dates drift **forward** (later)
- Larger offsets = faster drift per round-trip

### Test 2.5: LIVE Cross-Timezone Test — Mumbai (UTC+5:30, Partial Simulation)

> **Methodology note**: This test used Chrome DevTools timezone override, which does NOT change JavaScript's `Date` object timezone (OS-level). Results are a partial simulation. For fully live IST results see Session 3 (Tests 4.x) where macOS TZ was changed and Chrome restarted.

**Method**: Set Chrome DevTools timezone override to Mumbai (Asia/Calcutta). Reloaded saved record DateTest-000004 Rev 1 (originally saved in Sao Paulo).

#### Display on Reload (Mumbai)

All dates display correctly on initial load — no shift from just loading. Server returns the same strings and the browser interprets them as local midnight in Mumbai.

#### Round-Trip Test in Mumbai

| Field          | Config        | Before      | GFV in Mumbai                         | After Round-Trip | Shift              |
| -------------- | ------------- | ----------- | ------------------------------------- | ---------------- | ------------------ |
| **DataField5** | eTime+iTz     | `T00:00:00` | `T00:00:00.000Z` (fake Z)             | **`T05:30:00`**  | **+5:30h FORWARD** |
| **DataField6** | eTime, no iTz | `T00:00:00` | `T18:30:00.000Z` (real UTC: prev day) | `T00:00:00`      | NONE ✓             |

**Visual**: DataField5 display changed from `03/15/2026 12:00 AM` to **`03/15/2026 05:30 AM`** after one round-trip.

**Mechanism in Mumbai (UTC+5:30)**:

1. Raw: `"2026-03-15T00:00:00"` (local midnight IST, no Z)
2. GetFieldValue adds fake Z: `"2026-03-15T00:00:00.000Z"` (looks like UTC midnight)
3. SetFieldValue: JS interprets as UTC midnight → March 15 05:30 AM IST
4. Stored: `"2026-03-15T05:30:00"` → shifted +5:30h

**After ~4 round-trips in Mumbai**: time crosses midnight → date shifts to **March 16**.
This is the **opposite direction** from Sao Paulo where dates drift backward.

#### Comparison: Same bug, different timezones

| Timezone            | Offset | Drift per round-trip | Trips to shift 1 day |
| ------------------- | ------ | -------------------- | -------------------- |
| Sao Paulo (UTC-3)   | -3h    | -3h (backward)       | 8 trips              |
| London (UTC+0)      | 0h     | 0h (no drift!)       | ∞ (never)            |
| Mumbai (UTC+5:30)   | +5.5h  | +5:30h (forward)     | ~4-5 trips           |
| Tokyo (UTC+9)       | +9h    | +9h (forward)        | ~3 trips             |
| Los Angeles (UTC-8) | -8h    | -8h (backward)       | 3 trips              |

### Test 2.6: Scenario 2 — Typed Input Comparison (DateTest-000006)

**Action**: Typed `03/15/2026` (+ `12:00 AM` for DateTime fields) into DataField5, 6, 7, and 10 via keyboard.

| Field       | Config        | Typed Raw               | Popup Raw (Test 2.1)    | Match? |
| ----------- | ------------- | ----------------------- | ----------------------- | :----: |
| DataField5  | eTime=✓ iTz=✓ | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | YES ✓  |
| DataField6  | eTime=✓ iTz=✗ | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | YES ✓  |
| DataField7  | eTime=✗ iTz=✗ | `"2026-03-15"`          | `"2026-03-15"`          | YES ✓  |
| DataField10 | eTime=✗ iTz=✓ | `"2026-03-15"`          | `"2026-03-15"`          | YES ✓  |

**Conclusion**: Bug #2 (inconsistent handlers) is **NOT reproduced** with `useLegacy=false`. Both `calChangeSetValue()` (popup) and `calChange()` (typed input) produce identical stored values across ALL tested configurations. The inconsistency described in the analysis may only exist with `useLegacy=true`.

### Test 2.7: DataField10 — Date-only + ignoreTimezone=true (New Field)

**Config**: `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`

| Test                          | Raw Stored     | GetFieldValue  | Shifted? |
| ----------------------------- | -------------- | -------------- | :------: |
| After SetFieldValue(March 15) | `"2026-03-15"` | `"2026-03-15"` |   NO ✓   |
| After Round-Trip              | `"2026-03-15"` | `"2026-03-15"` |   NO ✓   |

**Finding**: `ignoreTimezone` has **no effect on date-only fields**. The `getCalendarFieldValue()` fake-Z path only triggers when `enableTime=true`.

### Test 2.8: Multiple Sequential Round-Trips on DataField5

**Config**: `enableTime=true`, `ignoreTimezone=true` (the vulnerable config)
**Action**: Reset to March 15 midnight, then called `SetFieldValue(GetFieldValue())` 10 times sequentially.

```
Trip 0:  2026-03-15T00:00:00  ← March 15 midnight (original)
Trip 1:  2026-03-14T21:00:00  ← -3h
Trip 2:  2026-03-14T18:00:00  ← -6h
Trip 3:  2026-03-14T15:00:00  ← -9h
Trip 4:  2026-03-14T12:00:00  ← -12h
Trip 5:  2026-03-14T09:00:00  ← -15h
Trip 6:  2026-03-14T06:00:00  ← -18h
Trip 7:  2026-03-14T03:00:00  ← -21h
Trip 8:  2026-03-14T00:00:00  ← -24h = March 14 midnight (1 full day lost!)
Trip 9:  2026-03-13T21:00:00  ← -27h
Trip 10: 2026-03-13T18:00:00  ← -30h (approaching March 13)
```

**Each round-trip shifts the date by exactly -3 hours** (the UTC-3 offset).
After 8 round-trips, one full calendar day is lost.
In UTC+5:30 (Mumbai), each trip would shift +5:30h forward instead.

**Mechanism per trip**:

1. Raw: `"2026-03-15T00:00:00"` (local midnight, no Z)
2. GetFieldValue adds fake Z: `"2026-03-15T00:00:00.000Z"` (looks like UTC midnight)
3. SetFieldValue passes to component, JS interprets Z as UTC: `new Date("2026-03-15T00:00:00.000Z")` = March 14 21:00 local
4. Component stores via getSaveValue: `"2026-03-14T21:00:00"` (new local time, no Z)
5. Repeat → drift compounds

### Test 2.9: Scenario 3 — Save and Reload (Server Round-Trip)

**Action**: Saved form DateTest-000004. Opened saved record (DataID `2ae985b5-...`) in new tab as Rev 1.

#### Server Return Values vs Original

| Field      | Config                 | Saved Value                 | Server Returned         | Display After Reload  | **Shifted?** |
| ---------- | ---------------------- | --------------------------- | ----------------------- | --------------------- | :----------: |
| DataField1 | date-only, CurrentDate | Date `2026-03-27T20:02:51Z` | `"03/27/2026 20:02:51"` | `03/27/2026`          |     NO ✓     |
| DataField2 | date-only, Preset 3/1  | Date `2026-03-01T03:00:00Z` | `"03/01/2026 03:00:00"` | `03/01/2026`          |     NO ✓     |
| DataField5 | eTime=✓ iTz=✓          | `"2026-03-15T00:00:00"`     | `"2026-03-15T00:00:00"` | `03/15/2026 12:00 AM` |     NO ✓     |
| DataField6 | eTime=✓ iTz=✗          | `"2026-03-15T00:00:00"`     | `"2026-03-15T00:00:00"` | `03/15/2026 12:00 AM` |     NO ✓     |
| DataField7 | date-only              | `"2026-03-15"`              | `"2026-03-15"`          | `03/15/2026`          |     NO ✓     |

**Key Findings**:

1. **No date shift on reload** — the server stores and returns the exact string without timezone processing. The `initCalendarValueV2()` processing on reload doesn't cause visible shifts in UTC-3.

2. **Format change for date-only initial value fields** — DataField1-4 were originally stored as Date objects but the server returned them in `"MM/dd/yyyy HH:mm:ss"` format. This format change is transparent to the user but represents a different internal representation.

3. **DataField2 (Preset 3/1/2026)** — Server stores `"03/01/2026 03:00:00"` (UTC time from local midnight). Despite the time being 03:00 (which was from the UTC-3 conversion), the display is still correct because `initCalendarValueV2()` with `enableTime=false` uses `.startOf("day")`.

4. **Potential issue for positive UTC offsets**: If a user in UTC+5:30 opened this same record, the value `"2026-03-15T00:00:00"` would be parsed as local midnight in their timezone. Since the server returns the same string regardless of timezone, the display would still show March 15. BUT the actual UTC moment would differ — UTC+5:30 would store `2026-03-14T18:30:00Z` vs UTC-3 storing `2026-03-15T03:00:00Z` for the "same" display date.

5. **`initCalendarValueV2()` hardcoded `enableTime=true`** (Bug #3 from analysis): For the server/database path, `enableTime` is hardcoded to `true`. This means date-only fields loaded from the server are processed as DateTime fields. We didn't observe a visible shift, but this could cause subtle issues when combined with other bugs.

### Test 2.10: Database Evidence — Actual Stored Values

**Source**: Direct database query on DateTest-000004

```
DhDocID: DateTest-000004
DataField1: 3/27/2026 8:02:51 PM
DataField2: 3/1/2026 3:00:00 AM
DataField3: 3/27/2026 8:02:51 PM
DataField4: 3/1/2026 3:00:00 AM
DataField5: 3/15/2026 12:00:00 AM
DataField6: 3/15/2026 12:00:00 AM
DataField7: 3/15/2026 12:00:00 AM
```

#### Analysis: Mixed UTC and Local Times in the Database

| Field      | How Value Was Created                 | DB Value                 | Time Zone of DB Value |
| ---------- | ------------------------------------- | ------------------------ | --------------------- |
| DataField1 | `new Date().toISOString()` → Date obj | `8:02:51 PM` (20:02 UTC) | **UTC**               |
| DataField2 | `parseDateString(preset)` → Date obj  | `3:00:00 AM` (03:00 UTC) | **UTC**               |
| DataField5 | popup → `getSaveValue()` strips Z     | `12:00:00 AM`            | **Local (BRT)**       |
| DataField6 | popup → `getSaveValue()` strips Z     | `12:00:00 AM`            | **Local (BRT)**       |
| DataField7 | popup → date-only string              | `12:00:00 AM`            | **Local (BRT)**       |

**CRITICAL FINDING**: The database contains a **mix of UTC and local times** depending on the code path:

1. **Initial value fields (DataField1-4)**: Stored in **UTC** because they go through `new Date()` or `parseDateString()` which produces Date objects, and those get serialized via `toISOString()`.
    - DataField1: User was at 17:02 local, but DB has 20:02 (UTC). **3-hour discrepancy**.
    - DataField2: Preset "March 1" midnight local → DB has 03:00 AM (UTC).

2. **User-input fields (DataField5-7)**: Stored in **local time** because `getSaveValue()` strips the Z suffix and formats without timezone info.
    - DataField5-6: March 15 midnight local → DB has 12:00 AM. Correct local representation.
    - DataField7: Date-only → stored as midnight.

**Impact on Database Queries and Reports**:

- A SQL query filtering by time would get inconsistent results across field types
- Fields 1-4 need UTC-aware queries; fields 5-7 need local-time queries
- The same "March 1" date is stored as 3:00 AM in DataField2 but would be 12:00 AM in a user-input field
- Cross-timezone users would see correct dates in the UI but the DB values represent different UTC moments

---

## Session 2: SetFieldValue Input Format Matrix and Edge Cases (BRT)

**Date**: 2026-03-30 | **TZ**: America/Sao_Paulo (UTC-3) | **Form**: DateTest-000004 — DataField5 (D), DataField6 (C), DataField7 (A)
**Purpose**: Exhaustive SetFieldValue input format matrix + edge cases
**Key outcomes**: Bug #6 discovered (empty field → truthy "Invalid Date"); bug is in GFV output, not SFV input; year/leap boundaries crossed in 1 trip

### Test 3.1: SetFieldValue Input Formats — Config D (BRT)

All formats tested by calling `VV.Form.SetFieldValue('DataField5', value)` then reading raw and GFV.

| Test ID          | Input                              | Raw Stored              | GFV Return                   | Notes                                        |
| ---------------- | ---------------------------------- | ----------------------- | ---------------------------- | -------------------------------------------- |
| 7-D-isoNoZ       | `"2026-03-15T00:00:00"`            | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | Stored as-is, fake Z on read                 |
| 7-D-dateOnly     | `"2026-03-15"`                     | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | Midnight appended, fake Z on read            |
| 7-D-usFormat     | `"03/15/2026"`                     | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | Parsed & normalized, fake Z on read          |
| 7-D-usFormatTime | `"03/15/2026 12:00:00 AM"`         | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | Parsed & normalized, fake Z on read          |
| 7-D-epoch        | `1773543600000` (Mar 15 00:00 BRT) | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | Epoch→Date→local time stored, fake Z on read |

**Key finding:** All non-Z input formats on Config D store correctly as local time. The bug is exclusively in `GetFieldValue()` adding the fake Z on output, not in `SetFieldValue()` processing.

### Test 3.2: SetFieldValue Input Formats — Config C (BRT)

| Test ID    | Input                        | Raw Stored              | GFV Return                   | Notes                                                                                |
| ---------- | ---------------------------- | ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| 7-C-isoZ   | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14T21:00:00"` | `"2026-03-15T00:00:00.000Z"` | UTC→local on store, GFV correctly reconstructs UTC. **Day crosses to Mar 14 in DB.** |
| 7-C-isoNoZ | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | Treated as local, GFV converts to real UTC (+3h BRT). No drift.                      |

**Key finding:** Config C round-trips correctly regardless of input format. GFV returns **real** UTC (not fake). But ISO+Z input shifts the stored date backward by the TZ offset, which affects direct DB queries.

### Test 3.3: SetFieldValue Input Formats — Config A (BRT)

| Test ID       | Input                                            | Raw Stored     | GFV Return     | Notes                                                                                      |
| ------------- | ------------------------------------------------ | -------------- | -------------- | ------------------------------------------------------------------------------------------ |
| 7-A-dateOnly  | `"2026-03-15"` (BRT)                             | `"2026-03-15"` | `"2026-03-15"` | Clean pass in BRT. **In IST → stores `"2026-03-14"` (see Bug #7)**                         |
| 7-A-isoZ      | `"2026-03-15T00:00:00.000Z"` (BRT)               | `"2026-03-15"` | `"2026-03-15"` | Time+Z stripped, date extracted from ISO string in BRT. **In IST → stores `"2026-03-14"`** |
| 7-A-isoZ-edge | `"2026-03-15T02:00:00.000Z"` (=Mar 14 23:00 BRT) | `"2026-03-15"` | `"2026-03-15"` | In BRT: date extracted from ISO literal. In IST same Z input → `"2026-03-14"`              |

**Key finding — BRT vs IST divergence (Bug #7):** Date-only `SetFieldValue` in BRT stores correctly, but in IST (UTC+5:30) every format stores **one day early** (strings) or **two days early** (Date objects).

Root cause confirmed in `normalizeCalValue()` (line ~102799): uses `moment(e).toDate()` which parses date-only strings as **local midnight**. In UTC+ timezones this crosses back to the previous UTC day. `getSaveValue()` then strips to the UTC date portion — the wrong day.

| Input                        | BRT result       | IST result        | Explanation                                                                 |
| ---------------------------- | ---------------- | ----------------- | --------------------------------------------------------------------------- |
| `"2026-03-15"`               | `"2026-03-15"` ✓ | `"2026-03-14"` ✗  | `moment('2026-03-15')` = local midnight; UTC date differs by TZ             |
| `"03/15/2026"`               | `"2026-03-15"` ✓ | `"2026-03-14"` ✗  | Same moment parse path                                                      |
| `"2026-03-15T00:00:00.000Z"` | `"2026-03-15"` ✓ | `"2026-03-14"` ✗  | normalizeCalValue strips T, re-parses date portion as local                 |
| `new Date(2026,2,15)` local  | `"2026-03-15"` ✓ | `"2026-03-13"` ✗✗ | Double local-midnight conversion in normalizeCalValue (Date→toISO→re-parse) |

### Test 3.4: Edge Cases — Config D (BRT)

All on Config D (DataField5), BRT timezone.

| Test ID            | Input / Setup                                | Result                                                        | Finding                                                                                                                                     |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 12-near-midnight-1 | `"2026-03-15T00:30:00.000Z"`                 | raw=`"2026-03-14T21:30:00"`, gfv=`"2026-03-14T21:30:00.000Z"` | **Day crossed on input** (Z respected on write) AND fake Z added. Double jeopardy: date already shifted + will drift further on round-trip. |
| 12-near-midnight-2 | Set `"2026-03-15T23:00:00"` then round-trips | 23:00→20:00→17:00→14:00→11:00 (-3h/trip)                      | Standard drift, day crossing after ~8 trips from midnight                                                                                   |
| 12-dst-transition  | `"2026-03-08T02:00:00"` (US DST day)         | 1 trip → `"2026-03-07T23:00:00"`                              | Standard -3h drift from BRT. No DST anomaly (Brazil has no DST). **Needs retest from US TZ browser.**                                       |
| 12-year-boundary   | `"2026-01-01T00:00:00"`                      | **1 trip → `"2025-12-31T21:00:00"`**                          | **Year boundary crossed in single round-trip!** Jan 1 2026 → Dec 31 2025.                                                                   |
| 12-leap-day        | `"2028-02-29T00:00:00"`                      | **1 trip → `"2028-02-28T21:00:00"`**                          | **Leap day lost in single round-trip!** Feb 29 → Feb 28.                                                                                    |
| 12-empty-value     | `""` and `null`                              | raw=`""`, gfv=`"Invalid Date"`                                | **New bug:** GFV returns the string `"Invalid Date"` instead of `""` or `null`. This is truthy, breaks `if(GetFieldValue())` checks.        |
| 12-invalid-string  | `"not-a-date"`                               | No change, no error                                           | Silently ignored. Field retains previous value.                                                                                             |
| 12-far-future      | `"2099-12-31T00:00:00"`                      | Standard -3h drift                                            | No special issue with far-future dates.                                                                                                     |
| 12-pre-epoch       | `"1969-12-31T00:00:00"`                      | Standard -3h drift                                            | Pre-epoch dates handled fine.                                                                                                               |

#### Bug #6 Discovery — Empty Field Returns Truthy "Invalid Date"

**Bug #6 — GetFieldValue returns `"Invalid Date"` for empty DateTime+ignoreTZ fields**

When a Config D field (`enableTime=true`, `ignoreTimezone=true`) has an empty value (set via `""` or `null`):

- `getValueObjectValue()` correctly returns `""`
- `GetFieldValue()` returns the string `"Invalid Date"`
- This is truthy in JavaScript, so `if (VV.Form.GetFieldValue('field'))` evaluates to `true` even though the field is empty
- Developer code checking for empty fields will fail silently

---

## Session 3: Cross-Timezone Confirmation — IST (UTC+5:30)

**Date**: 2026-03-30 | **TZ**: Asia/Calcutta (UTC+5:30) — macOS TZ changed + Chrome restarted | **Form**: DateTest-000004 (BRT-saved) + DateTest-000009 (new, unsaved)
**Purpose**: Confirm Bug #7 live in UTC+; IST drift rate for Bug #5; cross-TZ load behavior
**Key outcomes**: Bug #7 confirmed (+1 day off for strings, +2 for Date objects); IST drift +5:30h/trip crosses day after ~4.4 trips

System timezone changed to `Asia/Calcutta` (UTC+5:30), Chrome restarted. Tests run on DateTest-000004 (saved from BRT) and new DateTest-000009 (created in IST).

### Test 4.1: Load BRT-Saved Record in IST — All Configs

Record saved by BRT user: `DataField5="2026-03-15T00:00:00"`, `DataField6="2026-03-15T00:00:00"`, `DataField7="2026-03-15"`.

| Field      | Config        | Raw on Load             | GFV (IST)                                        | GFV (BRT, from session 1)                        | DOM Display           |
| ---------- | ------------- | ----------------------- | ------------------------------------------------ | ------------------------------------------------ | --------------------- |
| DataField5 | D (ignoreTZ)  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (fake Z)            | `"2026-03-15T00:00:00.000Z"` (same)              | `03/15/2026 12:00 AM` |
| DataField6 | C (UTC)       | `"2026-03-15T00:00:00"` | `"2026-03-14T18:30:00.000Z"` (real UTC from IST) | `"2026-03-15T03:00:00.000Z"` (real UTC from BRT) | `03/15/2026 12:00 AM` |
| DataField7 | A (date-only) | `"2026-03-15"`          | `"2026-03-15"`                                   | `"2026-03-15"`                                   | `03/15/2026`          |

**Key findings:**

- Display is identical for BRT and IST users on all configs — no visible date shift on reload
- Config D GFV is timezone-invariant (fake Z is always the same string regardless of viewer TZ)
- Config C GFV returns **different UTC moments** for different viewers of the same stored value — same stored `"2026-03-15T00:00:00"` means March 15 03:00 UTC to a BRT developer but March 14 18:30 UTC to an IST developer
- Config A is fully stable

### Test 4.2: 5 Round-Trips — Config D, IST

Starting: `"2026-03-15T00:00:00"`. Each trip: `+5:30h`.

| Trip | Raw                                       |
| ---- | ----------------------------------------- |
| 0    | `"2026-03-15T00:00:00"`                   |
| 1    | `"2026-03-15T05:30:00"`                   |
| 2    | `"2026-03-15T11:00:00"`                   |
| 3    | `"2026-03-15T16:30:00"`                   |
| 4    | `"2026-03-15T22:00:00"`                   |
| 5    | `"2026-03-16T03:30:00"` ← **day crossed** |

Day crossed after **4.4 trips** (vs 8 trips in BRT). IST drift is 8.5× more destructive per trip-hour than BRT.

### Test 4.3: Cross-TZ Round-Trip — BRT Save, IST Load

BRT user's value: `"2026-03-15T00:00:00"` (display: `03/15/2026 12:00 AM`).
After 1 round-trip by IST user: stored becomes `"2026-03-15T05:30:00"`.
If IST user saves and BRT user reloads: **sees `03/15/2026 05:30 AM`** instead of midnight.

### Test 4.4: SetFieldValue on Config A in IST — Bug #7 Confirmation

**Confirmed in source code (`normalizeCalValue`, line ~102799) and live testing (IST).**

In IST (UTC+5:30), `SetFieldValue` on date-only fields:

| Input format                           | BRT stores       | IST stores       | Days off |
| -------------------------------------- | ---------------- | ---------------- | -------- |
| `"2026-03-15"`                         | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1       |
| `"03/15/2026"`                         | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1       |
| `"2026-03-15T00:00:00"`                | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1       |
| `"2026-03-15T00:00:00.000Z"`           | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1       |
| `new Date(2026,2,15)` (local midnight) | `"2026-03-15"` ✓ | `"2026-03-13"` ✗ | -2       |

**Root cause in `normalizeCalValue()` (line ~102799, enableTime=false branch):**

1. `moment(input).toDate()` — moment parses date-only strings as **local midnight** (not UTC midnight)
2. In UTC+ timezones, local midnight = previous UTC day
3. `getSaveValue()` strips to the UTC date portion from `toISOString()` → off by one day
4. For Date objects: double conversion (Date→toISO→re-parse as local) → off by two days

Bug only affects UTC+ users. BRT (UTC-3) is unaffected because local midnight → UTC is still same day.

**Affected configs:** All date-only configs (A, B, E, F — `enableTime=false`).

---

## Session 4: Calendar Popup — Configs A/B/C/D, IST (UTC+5:30)

**Date**: 2026-03-30 | **TZ**: Asia/Calcutta (UTC+5:30) — macOS TZ changed + Chrome restarted | **Form**: DateTest-000024/000026/000029/000030 (fresh template instances)
**Purpose**: Live confirmation of IST behavior for calendar popup across date-only (A/B) and DateTime (C/D) configs; validate or disprove the double-shift and UTC-offset storage predictions
**Key outcomes**: Bug #7 confirmed for Configs A/B (-1 day stored); double-shift prediction wrong; getSaveValue() stores local midnight (NOT UTC offset) — matrix prediction for C/D corrected; Config C GetFieldValue correctly returns UTC (no bugs); Config D GetFieldValue appends fake Z Bug #5 confirmed (+5:30h drift per round-trip in IST)

**Precondition verification:**

| Check                   | Command                                                                                                  | Result                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                  | `"Tue Mar 31 2026 05:27:52 GMT+0530 (India Standard Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                              | `false` → V1 active ✓                                         |
| Field lookup (Config A) | filter `fieldType=13, enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false` | `["DataField7"]` ✓                                            |

### Test 5.1: Calendar Popup — Config A, IST (Category 1-A-IST)

**Action**: Clicked calendar icon on DataField7 (Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) → March 2026 popup opened → clicked day 15 → popup closed immediately (no time tab — date-only field).

**Display after selection**: `03/15/2026` — field shows the user-intended date correctly.

**Captured values (single JS call):**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField7'),
    api: VV.Form.GetFieldValue('DataField7'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-14", api: "2026-03-14", isoRef: "2026-03-14T18:30:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                    |
| -------------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| Display in input                             | `03/15/2026`                 | Shows user-intended date ✓                               |
| Raw stored value                             | `"2026-03-14"`               | **-1 day from intended March 15**                        |
| GetFieldValue()                              | `"2026-03-14"`               | Same as raw — no fake Z (Config A unaffected by Bug #5)  |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-14T18:30:00.000Z"` | Confirms IST active: local midnight = UTC 18:30 prev day |
| Matrix Expected                              | `"2026-03-13"` (-2 days)     | **Prediction was wrong**                                 |

**Bug #7 confirmed**: Popup on date-only Config A in IST stores one day early. Display is correct (`03/15/2026`); stored value is `"2026-03-14"`.

**Double-shift prediction disproved**: The matrix predicted -2 days based on the theory that the calendar popup sends a `Date` object through `normalizeCalValue()`, causing a second midnight re-interpretation. In practice, the popup for a date-only field goes through a path that produces a single UTC offset shift (IST midnight → UTC 18:30 → UTC date = March 14), not a double shift. The stored value is -1 day, not -2 days.

**Bug #2 asymmetry NOT confirmed for Config A IST**: Both popup and typed input produce the same shift (-1 day = `"2026-03-14"`). The predicted divergence (popup → -2 days, typed → -1 day) does not materialize. Run test 2-A-IST to confirm typed input independently.

**Updated matrix prediction for 1-B-IST**: By the same reasoning, Config B (ignoreTZ=true, date-only) should also store -1 day in IST from popup, not -2 days. The `ignoreTimezone` flag has no effect on date-only storage.

**TC file**: [tc-1-A-IST.md](tc-1-A-IST.md)

### Test 5.2: Calendar Popup — Config B, IST (Category 1-B-IST)

**Precondition verification:**

| Check                   | Command                                                                                                 | Result                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                 | `"Tue Mar 31 2026 05:45:39 GMT+0530 (India Standard Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                             | `false` → V1 active ✓                                         |
| Field lookup (Config B) | filter `fieldType=13, enableTime=false, ignoreTimezone=true, useLegacy=false, enableInitialValue=false` | `["DataField10"]` ✓                                           |

**Action**: Clicked calendar icon on DataField10 (Config B: `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`) on form DateTest-000026 (fresh template instance) → March 2026 popup opened → clicked day 15 → popup closed immediately (no time tab — date-only field). Display showed `03/15/2026`.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField10'),
    api: VV.Form.GetFieldValue('DataField10'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-14", api: "2026-03-14", isoRef: "2026-03-14T18:30:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                               |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Display in input                             | `03/15/2026`                 | Shows user-intended date ✓                                          |
| Raw stored value                             | `"2026-03-14"`               | **-1 day from intended March 15**                                   |
| GetFieldValue()                              | `"2026-03-14"`               | Same as raw — no fake Z (`enableTime=false`, Bug #5 not applicable) |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-14T18:30:00.000Z"` | Confirms IST active: local midnight = UTC 18:30 prev day            |
| Matrix Expected                              | `"2026-03-14"`               | **MATCH**                                                           |

**Findings:**

- **Bug #7 confirmed for Config B in IST**: Popup on date-only Config B stores one day early (`"2026-03-14"` for intended March 15). Identical result to Config A (Test 5.1).
- **`ignoreTimezone` has no effect on date-only storage**: Config B (`ignoreTimezone=true`) and Config A (`ignoreTimezone=false`) produce identical raw stored values and GetFieldValue returns. The `ignoreTimezone` flag only affects the `getCalendarFieldValue()` output path when `enableTime=true` (Bug #5 surface, Config D). For date-only fields, both configs go through the same `normalizeCalValue()` → `moment(input).toDate()` path.
- **Bug #5 confirmed absent**: GetFieldValue returns `"2026-03-14"` with no fake Z suffix. As expected — Bug #5 requires `enableTime=true`, which Config B does not have.
- **Matrix prediction correct**: The predicted `"2026-03-14"` was derived from the 1-A-IST live result (Test 5.1) — confirmed accurate.
- **Next test**: Run 2-B-IST (typed input, Config B, IST) to confirm typed input produces the same -1 day shift independently. Expected: `"2026-03-14"` — same as popup, consistent with 2-A-IST prediction.

**TC file**: [tc-1-B-IST.md](tc-1-B-IST.md)

### Test 5.3: Calendar Popup — Config C, IST (Category 1-C-IST)

**Precondition verification:**

| Check                   | Command                                                                                                 | Result                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                 | `"Tue Mar 31 2026 05:54:03 GMT+0530 (India Standard Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                             | `false` → V1 active ✓                                         |
| Field lookup (Config C) | filter `fieldType=13, enableTime=true, ignoreTimezone=false, useLegacy=false, enableInitialValue=false` | `["DataField6"]` ✓                                            |

**Action**: Clicked calendar icon on DataField6 (Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) on form DateTest-000029 (fresh template instance) → March 2026 Date tab opened → scrolled page within date grid to reveal Set button → clicked day 15 → popup advanced to Time tab showing `12:00 AM` → clicked Set → popup closed. Display showed `03/15/2026 12:00 AM`.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField6'),
    api: VV.Form.GetFieldValue('DataField6'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-15T00:00:00", api: "2026-03-14T18:30:00.000Z", isoRef: "2026-03-14T18:30:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                     |
| -------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| Display in input                             | `03/15/2026 12:00 AM`        | Shows user-intended date and time ✓                       |
| Raw stored value                             | `"2026-03-15T00:00:00"`      | **Local midnight IST stored** — same string as BRT        |
| GetFieldValue()                              | `"2026-03-14T18:30:00.000Z"` | Correct UTC conversion: IST midnight = UTC 18:30 prev day |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-14T18:30:00.000Z"` | Confirms IST active ✓                                     |
| Matrix Expected                              | `"2026-03-14T18:30:00"`      | **Prediction was wrong**                                  |

**Findings:**

- **Matrix prediction corrected**: The matrix predicted `"2026-03-14T18:30:00"` (UTC offset of IST midnight) as the raw stored value. The live result is `"2026-03-15T00:00:00"` — local midnight in IST, formatted as a local datetime string. `getSaveValue()` uses `moment(input).format("YYYY-MM-DD[T]HH:mm:ss")` which formats as **local time**, not UTC. Config C stores the same string regardless of timezone — the date/time as the user sees it.
- **GetFieldValue correct**: `getCalendarFieldValue()` for Config C (ignoreTimezone=false) does `new Date(value).toISOString()`. The stored `"2026-03-15T00:00:00"` (no Z) is parsed as IST local time → UTC 18:30 prev day → returns `"2026-03-14T18:30:00.000Z"`. This is the correct UTC equivalent of IST midnight on March 15.
- **Round-trip stable**: SetFieldValue with `"2026-03-14T18:30:00.000Z"` → JS parses as UTC → IST local = March 15 00:00 → getSaveValue → `"2026-03-15T00:00:00"`. No drift.
- **No bugs triggered**: Config C behaves correctly in IST. PASS.
- **1-D-IST prediction corrected**: The matrix also predicted `"2026-03-14T18:30:00"` for Config D raw storage. Based on this result, Config D will store `"2026-03-15T00:00:00"` (same local midnight storage). The difference between C and D is only in GetFieldValue: Config D adds fake Z → `"2026-03-15T00:00:00.000Z"` (Bug #5), which causes +5:30h drift per round-trip.
- **Next test**: Run 1-D-IST (Config D, IST popup) to confirm `"2026-03-15T00:00:00"` storage and observe Bug #5 fake Z in GetFieldValue.

**TC file**: [tc-1-C-IST.md](tc-1-C-IST.md)

---

### Test 5.4: Calendar Popup — Config D, IST (Category 1-D-IST)

**Precondition verification:**

| Check                   | Command                                                                                                | Result                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                | `"Tue Mar 31 2026 06:02:28 GMT+0530 (India Standard Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                            | `false` → V1 active ✓                                         |
| Field lookup (Config D) | filter `fieldType=13, enableTime=true, ignoreTimezone=true, useLegacy=false, enableInitialValue=false` | `["DataField5"]` ✓                                            |

**Action**: Clicked calendar icon on DataField5 (Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) on form DateTest-000030 (fresh template instance) → March 2026 Date tab opened → scrolled page to reveal Set button → clicked day 15 → popup advanced to Time tab showing `12:00 AM` → clicked Set → popup closed. Display showed `03/15/2026 12:00 AM`.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField5'),
    api: VV.Form.GetFieldValue('DataField5'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-15T00:00:00", api: "2026-03-15T00:00:00.000Z", isoRef: "2026-03-14T18:30:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                                                  |
| -------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| Display in input                             | `03/15/2026 12:00 AM`        | Shows user-intended date and time ✓                                                    |
| Raw stored value                             | `"2026-03-15T00:00:00"`      | Local midnight IST stored — same as Config C                                           |
| GetFieldValue()                              | `"2026-03-15T00:00:00.000Z"` | **Bug #5 confirmed**: fake Z appended; real UTC should be `"2026-03-14T18:30:00.000Z"` |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-14T18:30:00.000Z"` | Confirms IST active ✓                                                                  |
| Matrix Expected (corrected)                  | `"2026-03-15T00:00:00"`      | MATCH                                                                                  |

**Findings:**

- **Raw storage matches corrected prediction**: Config D stores `"2026-03-15T00:00:00"` — local midnight IST — identical to Config C. The `ignoreTimezone` flag has no effect on `getSaveValue()`. Both configs go through `moment(input).format("YYYY-MM-DD[T]HH:mm:ss")` which formats as local time, not UTC.
- **Bug #5 confirmed in IST**: `getCalendarFieldValue()` appends fake Z to the local time string. The real UTC equivalent of IST midnight March 15 is `"2026-03-14T18:30:00.000Z"` (confirmed by isoRef), but GetFieldValue returns `"2026-03-15T00:00:00.000Z"` — UTC midnight March 15, which is 5:30h ahead of the correct value.
- **Round-trip drift in IST**: Each `SetFieldValue(GetFieldValue())` cycle advances the stored time by +5:30h (Bug #5). After ~4.4 trips, the date rolls over to the next day. This is the IST-specific variant of the +5:30h drift documented in Bug #5.
- **Config C vs Config D comparison complete**: Only difference is in GetFieldValue — Config C returns real UTC (`"2026-03-14T18:30:00.000Z"`), Config D returns fake Z (`"2026-03-15T00:00:00.000Z"`). Storage is identical. Result: FAIL (Bug #5).

**TC file**: [tc-1-D-IST.md](tc-1-D-IST.md)

---

## Session 5: Calendar Popup — Config A, UTC+0 (GMT+0000)

**Date**: 2026-03-30 | **TZ**: GMT (UTC+0) — macOS TZ changed to `GMT` + Chrome restarted | **Form**: DateTest-000033 (fresh template instance)
**Purpose**: UTC+0 control test — confirm zero-drift behavior for Config A calendar popup; validates that Bug #7 shift is zero at UTC+0 (local midnight = UTC midnight)
**Key outcomes**: `"2026-03-15"` stored and returned — correct date, no shift; isoRef `"2026-03-15T00:00:00.000Z"` confirms UTC+0 active; Bug #7 zero-drift control confirmed

### Test 6.1: Calendar Popup — Config A, UTC+0 (Category 1-A-UTC0)

**Precondition verification:**

| Check                   | Command                                                                                                  | Result                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                  | `"Tue Mar 31 2026 00:46:10 GMT+0000 (Greenwich Mean Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                              | `false` → V1 active ✓                                         |
| Field lookup (Config A) | filter `fieldType=13, enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false` | `["DataField7"]` ✓                                            |

**Action**: Clicked calendar icon on the Config A field (identified via P6 — `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`) on form DateTest-000033 (fresh template instance). March 2026 calendar popup opened (today March 31 highlighted). Clicked day 15. Popup closed immediately — no time tab, as expected for a date-only field. Field displayed `03/15/2026`.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField7'),
    api: VV.Form.GetFieldValue('DataField7'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-15", api: "2026-03-15", isoRef: "2026-03-15T00:00:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                       |
| -------------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| Display in input                             | `03/15/2026`                 | Shows user-intended date ✓                                  |
| Raw stored value                             | `"2026-03-15"`               | Correct — no shift                                          |
| GetFieldValue()                              | `"2026-03-15"`               | Same as raw — no transformation, no fake Z                  |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-15T00:00:00.000Z"` | Confirms UTC+0 (GMT) active — local midnight = UTC midnight |
| Matrix Expected                              | `"2026-03-15"`               | MATCH                                                       |

**Findings:**

- **Bug #7 zero-drift control confirmed**: At UTC+0, `normalizeCalValue()` converts local midnight (2026-03-15 00:00 GMT) to a Date object whose `toISOString()` produces `"2026-03-15T00:00:00.000Z"`. Stripping the Z and extracting the date yields `"2026-03-15"` — the correct value. No day shift.
- **Why UTC-3 (BRT) also passes**: BRT midnight = `"2026-03-15T03:00:00.000Z"` (same UTC calendar date). `getSaveValue()` strips Z and formats as local time → `"2026-03-15"`. Correct for the same reason: the UTC date part matches the local date.
- **Why UTC+5:30 (IST) fails**: IST midnight = `"2026-03-14T18:30:00.000Z"` — UTC date is March 14. Stored as `"2026-03-14"`. The control/fail asymmetry is entirely explained by whether UTC midnight falls on the same calendar day as local midnight.
- **GetFieldValue Config A**: Returns the raw stored value unchanged. No `getCalendarFieldValue()` transformation applies to `enableTime=false` fields. Config A is not in the Bug #5 surface.
- **Note on GMT vs Europe/London**: During first attempt, `Europe/London` was set (GMT in the system), but Chrome was reporting `GMT+0100 (British Summer Time)` — UK clocks moved forward March 29, 2026. Used `GMT` timezone (always UTC+0, no DST) instead.
- **Next tests**: Run `1-D-UTC0` (Config D popup at UTC+0) to confirm fake Z in GetFieldValue is "coincidentally correct" at UTC+0 and round-trips are stable. Run `2-A-IST` to confirm typed input produces same -1 day shift as popup independently.

**TC file**: [tc-1-A-UTC0.md](tc-1-A-UTC0.md)

---

## Session 6: Calendar Popup — Config D, UTC+0 (GMT+0000)

**Date**: 2026-03-31 | **TZ**: GMT (UTC+0) — macOS TZ set to `GMT` + Chrome restarted | **Form**: DateTest-000036 (fresh template instance)
**Purpose**: UTC+0 control test for Config D (enableTime=true, ignoreTimezone=true) — confirm fake Z (Bug #5) is coincidentally correct at UTC+0 and raw storage is correct; validate round-trip stability claim
**Key outcomes**: `"2026-03-15T00:00:00"` stored (local midnight = UTC midnight at UTC+0); GetFieldValue returns `"2026-03-15T00:00:00.000Z"` (Bug #5 present but coincidentally correct); isoRef confirms UTC+0 active; PASS

### Test 7.1: Calendar Popup — Config D, UTC+0 (Category 1-D-UTC0)

**Precondition verification:**

| Check                   | Command                                                                                                | Result                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                | `"Tue Mar 31 2026 10:36:32 GMT+0000 (Greenwich Mean Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                            | `false` → V1 active ✓                                         |
| Field lookup (Config D) | filter `fieldType=13, enableTime=true, ignoreTimezone=true, useLegacy=false, enableInitialValue=false` | `["DataField5"]` ✓                                            |

**Action**: Clicked calendar icon on the Config D field (identified via P6 — `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`) on form DateTest-000036 (fresh template instance). The calendar icon is a `.k-select` span at row 5 of the form (the first DateTime field). March 2026 calendar popup opened (today March 31 highlighted). Clicked day 15. Popup automatically advanced to the Time tab — time header showed `12:00 AM`. Scrolled the page to bring Set button into view (modal was cut off below fold). Clicked Set. Field displayed `03/15/2026 12:00 AM`.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField5'),
    api: VV.Form.GetFieldValue('DataField5'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-15T00:00:00", api: "2026-03-15T00:00:00.000Z", isoRef: "2026-03-15T00:00:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                                                      |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Display in input                             | `03/15/2026 12:00 AM`        | Shows user-intended date and time ✓                                                        |
| Raw stored value                             | `"2026-03-15T00:00:00"`      | Local midnight UTC+0 stored — correct                                                      |
| GetFieldValue()                              | `"2026-03-15T00:00:00.000Z"` | **Bug #5 present**: fake Z appended; at UTC+0 this is coincidentally the real UTC midnight |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-15T00:00:00.000Z"` | Confirms UTC+0 (GMT) active — local midnight = UTC midnight ✓                              |
| Matrix Expected                              | `"2026-03-15T00:00:00"`      | MATCH                                                                                      |

**Findings:**

- **Matrix prediction confirmed**: Config D at UTC+0 stores `"2026-03-15T00:00:00"` — local midnight stored correctly. At UTC+0, `getSaveValue()` converts local midnight via `toISOString()` → `"2026-03-15T00:00:00.000Z"` → strips Z → `"2026-03-15T00:00:00"`. Same UTC calendar date as local date. No shift.
- **Bug #5 present but coincidentally correct**: `getCalendarFieldValue()` appends fake Z → `"2026-03-15T00:00:00.000Z"`. At UTC+0, local midnight IS UTC midnight, so the fake Z produces a valid timestamp. Contrast: at BRT (UTC-3), GetFieldValue would return `"2026-03-15T00:00:00.000Z"` for a field that is actually `"2026-03-14T21:00:00.000Z"` UTC — off by 3 hours. At IST (UTC+5:30), it would be off by 5:30 hours (confirmed in Test 5.4). At UTC+0: no drift.
- **Round-trip stability confirmed (theoretical)**: `SetFieldValue(GetFieldValue())` sets `"2026-03-15T00:00:00.000Z"` → `normalizeCalValue()` parses this as UTC midnight → local midnight at UTC+0 → stores `"2026-03-15T00:00:00"`. No change per trip. The round-trip is stable at UTC+0 because the fake Z happens to be the real UTC midnight.
- **Config C vs Config D comparison at UTC+0**: Config C `GetFieldValue` uses `new Date(value).toISOString()` → also returns `"2026-03-15T00:00:00.000Z"` at UTC+0. Both configs return the same value at UTC+0. The difference only becomes visible at other timezones.
- **Note on GMT vs Europe/London**: `Europe/London` is NOT UTC+0 after March 29, 2026 (UK BST begins). `GMT` timezone was used — confirmed by `GMT+0000` in TZ check.

**TC file**: [tc-1-D-UTC0.md](tc-1-D-UTC0.md)

---

## Session 7: Typed Input — Configs A and B, IST (UTC+5:30)

**Date**: 2026-03-31 | **TZ**: Asia/Calcutta (UTC+5:30) — macOS TZ changed to `Asia/Calcutta`; Chrome picked up new TZ without restart (verified) | **Forms**: DateTest-000037 (Config A), DateTest-000039 (Config B)
**Purpose**: Confirm typed input for date-only Configs A and B in IST stores -1 day (Bug #7); verify Bug #2 asymmetry (popup vs typed) is absent; confirm ignoreTZ no-op for date-only storage
**Key outcomes**: Both configs store `"2026-03-14"` (-1 day, Bug #7); GetFieldValue returns raw unchanged; Bug #2 absent; ignoreTZ no effect on date-only; isoRef confirms IST active

### Test 8.1: Typed Input — Config A, IST (Category 2-A-IST)

**Precondition verification:**

| Check                   | Command                                                                                                  | Result                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                  | `"Tue Mar 31 2026 16:14:57 GMT+0530 (India Standard Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                              | `false` → V1 active ✓                                         |
| Field lookup (Config A) | filter `fieldType=13, enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false` | `["DataField7"]` ✓                                            |

**Action**: Clicked the input area (row 7) of the Config A field (identified via P6 — `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`) on form DateTest-000037 (fresh template instance). Field entered segment-edit mode with "month" highlighted. Typed `03` → field showed `03/day/year`, "day" highlighted. Typed `15` → field showed `03/15/year`, "year" highlighted. Typed `2026` → field showed `03/15/2026`. Pressed Tab — focus moved to row 8, field confirmed `03/15/2026`, Changes counter incremented to 5.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField7'),
    api: VV.Form.GetFieldValue('DataField7'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-14", api: "2026-03-14", isoRef: "2026-03-14T18:30:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                                           |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Display in input                             | `03/15/2026`                 | Shows user-intended date ✓                                                      |
| Raw stored value                             | `"2026-03-14"`               | **Bug #7**: -1 day shift                                                        |
| GetFieldValue()                              | `"2026-03-14"`               | Same as raw — no transformation for date-only Config A                          |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-14T18:30:00.000Z"` | Confirms IST (UTC+5:30) active — local midnight March 15 = March 14 18:30 UTC ✓ |
| Matrix Expected                              | `"2026-03-14"`               | MATCH                                                                           |

**Findings:**

- **Bug #7 confirmed via typed input**: Typed `03/15/2026` → `normalizeCalValue()` receives the string `"03/15/2026"` → `moment("03/15/2026").toDate()` creates a Date at local midnight IST (`2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00Z`) → `getSaveValue()` calls `moment(date).format("YYYY-MM-DD")` on this Date object → extracts the UTC date `"2026-03-14"` → -1 day stored.
- **Bug #2 absent**: Typed input produces `"2026-03-14"` — identical to the popup result (Test 5.1: `"2026-03-14"`). The predicted asymmetry (popup = -2 days via Date path, typed = -1 day via string path) was not observed. Both paths store the same value in V1 with `useLegacy=false`. The single-shift theory (not double-shift) is now confirmed by two independent input methods.
- **GetFieldValue unchanged**: Config A (`enableTime=false`) is outside the `getCalendarFieldValue()` transformation surface. GFV returns the raw stored value directly. No fake Z, no format change.
- **Knock-on note for 2-B-IST**: Config B (`enableTime=false, ignoreTimezone=true`) should behave identically to Config A for typed input — `ignoreTimezone` has no effect on the date-only save path. Predict `"2026-03-14"` for 2-B-IST as well.
- **Knock-on note for 2-C-IST / 2-D-IST**: Matrix predicts `"2026-03-14T18:30:00"` for DateTime configs in IST. This was the same wrong prediction as 1-C-IST / 1-D-IST (corrected 2026-03-30). `getSaveValue()` formats as LOCAL time, not UTC. Expect `"2026-03-15T00:00:00"` — the same string as BRT. These rows should be corrected when tested.

**TC file**: [tc-2-A-IST.md](tc-2-A-IST.md)

---

### Test 8.2: Typed Input — Config B, IST (Category 2-B-IST)

**Precondition verification:**

| Check                   | Command                                                                                                 | Result                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TZ                      | `new Date().toString()`                                                                                 | `"Tue Mar 31 2026 16:31:53 GMT+0530 (India Standard Time)"` ✓ |
| V1/V2                   | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                             | `false` → V1 active ✓                                         |
| Field lookup (Config B) | filter `fieldType=13, enableTime=false, ignoreTimezone=true, useLegacy=false, enableInitialValue=false` | `["DataField10"]` ✓                                           |

**Action**: Opened DateTest-000039 (fresh template instance). Clicked the input area of DataField10 (row 8, Config B — `enableTime=false, ignoreTimezone=true`). Field entered segment-edit mode with "month" highlighted. Typed `03` → day segment; typed `15` → year segment; typed `2026` → pressed Tab. Field display after Tab: `03/15/2026`.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField10'),
    api: VV.Form.GetFieldValue('DataField10'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-14", api: "2026-03-14", isoRef: "2026-03-14T18:30:00.000Z" }
```

| Metric                                       | Value                        | Notes                                                                                                                     |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Display in input                             | `03/15/2026`                 | Shows user-intended date — Kendo picker renders from its internal Date object (IST local midnight), not from stored value |
| Raw stored value                             | `"2026-03-14"`               | **Bug #7**: -1 day shift                                                                                                  |
| GetFieldValue()                              | `"2026-03-14"`               | Same as raw — no transformation for date-only Config B                                                                    |
| isoRef (`new Date(2026,2,15).toISOString()`) | `"2026-03-14T18:30:00.000Z"` | Confirms IST (UTC+5:30) active ✓                                                                                          |
| Matrix Expected                              | `"2026-03-14"`               | MATCH                                                                                                                     |

**Findings:**

- **Bug #7 confirmed for Config B**: Typed `03/15/2026` → stored `"2026-03-14"` (-1 day). Same result as Config A (Test 8.1). `ignoreTimezone=true` has no effect on the date-only storage path — `normalizeCalValue()` and `getSaveValue()` behave identically for both configs when `enableTime=false`.
- **Config A and Config B confirmed equivalent for date-only typed input**: Both store `"2026-03-14"` when `03/15/2026` is typed in IST. The `ignoreTimezone` flag only affects the DateTime (`enableTime=true`) code path. For date-only fields, it is a no-op at the storage layer.
- **GetFieldValue unchanged**: Config B (`enableTime=false`) is outside the Bug #5 surface. No fake Z, no transformation — GFV returns raw value directly.
- **Display shows intended date, not stored value**: The field displays `03/15/2026` while storing `"2026-03-14"`. The Kendo picker renders from its internal Date object (set at the moment of Tab), not from the stored value. The discrepancy is only visible after form reload. This behavior is identical to Config A (Test 8.1).
- **Knock-on note for Category 1/2 IST matrix**: Both popup (1-B-IST) and typed (2-B-IST) for Config B produce `"2026-03-14"`. Bug #2 asymmetry absent for Config B as well — consistent with Config A findings.

**TC file**: [tc-2-B-IST.md](tc-2-B-IST.md)

---

## Test Coverage Matrix

### Field Configuration Combinations

All tests should be run against each of these 8 configurations:

| Config ID | enableTime | ignoreTZ | useLegacy | Status                                                                                       |
| :-------: | :--------: | :------: | :-------: | -------------------------------------------------------------------------------------------- |
|     A     |   false    |  false   |   false   | **TESTED** (DataField7)                                                                      |
|     B     |   false    |   true   |   false   | **TESTED** (DataField10)                                                                     |
|     C     |    true    |  false   |   false   | **TESTED** (DataField6)                                                                      |
|     D     |    true    |   true   |   false   | **TESTED** (DataField5)                                                                      |
|     E     |   false    |  false   |   true    | **TESTED** (DataField12) — popup BRT (Test 9.1), typed BRT (Test 9.2), popup IST (Test 10.1) |
|     F     |   false    |   true   |   true    | **TESTED** (DataField11) — popup tested (Test 9.3)                                           |
|     G     |    true    |  false   |   true    | **TESTED** (DataField14) — popup BRT (Test 9.4)                                              |
|     H     |    true    |   true   |   true    | **TESTED** (DataField13) — popup BRT (Test 9.5)                                              |

### Category 1: User Input — Calendar Popup (Scenario 1)

Select a date via popup calendar. For DateTime fields, select time then click Set.

| Test ID  | Config |  TZ   | Date Selected   | Expected Raw                                                                                                     | Status                                       |
| -------- | :----: | :---: | --------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1-A-BRT  |   A    |  BRT  | Mar 15          | `"2026-03-15"`                                                                                                   | DONE ✓                                       |
| 1-B-BRT  |   B    |  BRT  | Mar 15          | `"2026-03-15"`                                                                                                   | DONE ✓                                       |
| 1-C-BRT  |   C    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                                                          | DONE ✓                                       |
| 1-D-BRT  |   D    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                                                          | DONE ✓                                       |
| 1-A-UTC0 |   A    | UTC+0 | Mar 15          | `"2026-03-15"` (UTC+0 midnight = UTC midnight; zero drift — control)                                             | PASS ✓ (Test 6.1)                            |
| 1-D-UTC0 |   D    | UTC+0 | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (fake Z coincidentally correct at UTC+0; Bug #5 present, no drift)                       | PASS ✓ (Test 7.1)                            |
| 1-A-IST  |   A    |  IST  | Mar 15          | `"2026-03-14"` (-1 day — single shift, popup = typed path)                                                       | FAIL — Bug #7 (Test 5.1)                     |
| 1-B-IST  |   B    |  IST  | Mar 15          | `"2026-03-14"` (-1 day — ignoreTZ no effect on date-only)                                                        | FAIL — Bug #7 (Test 5.2)                     |
| 1-C-IST  |   C    |  IST  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — same as BRT; prediction corrected 2026-03-30)                   | PASS ✓ (Test 5.3)                            |
| 1-D-IST  |   D    |  IST  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — GFV adds fake Z Bug #5; prediction corrected 2026-03-30)        | FAIL — Bug #5 (Test 5.4)                     |
| 1-E-BRT  |   E    |  BRT  | Mar 15          | `"2026-03-15T03:00:00.000Z"` (legacy UTC datetime; corrected 2026-03-31)                                         | FAIL — prediction wrong (Test 9.1)           |
| 1-F-BRT  |   F    |  BRT  | Mar 15          | `"2026-03-15T03:00:00.000Z"` (same as E-BRT — ignoreTZ no effect on legacy popup)                                | FAIL — Bug #2 (Test 9.3)                     |
| 1-G-BRT  |   G    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T03:00:00.000Z"` (legacy DateTime popup closes without Time tab; raw UTC BRT midnight)               | FAIL — Bug #4 inert / no Time tab (Test 9.4) |
| 1-H-BRT  |   H    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T03:00:00.000Z"` (UTC datetime with Z; ignoreTZ no-op; corrected 2026-03-31)                         | FAIL — prediction wrong (Test 9.5)           |
| 1-E-IST  |   E    |  IST  | Mar 15          | `"2026-03-14T18:30:00.000Z"` (legacy UTC datetime; IST midnight = prev-day UTC; prediction corrected 2026-03-31) | FAIL — prediction wrong (Test 10.1)          |

_IST note (updated 2026-03-30): Two key findings from IST testing: (1) Date-only configs A/B — calendar popup stores `"2026-03-14"` (-1 day, Bug #7). The -2 day double-shift prediction was wrong; popup and typed input produce the same single shift. (2) DateTime config C — `getSaveValue()` formats as LOCAL time, not UTC offset. Stores `"2026-03-15T00:00:00"` (same string as BRT). The matrix prediction of `"2026-03-14T18:30:00"` was wrong. Same correction applies to 1-D-IST raw storage prediction. See Tests 5.1 (1-A-IST), 5.2 (1-B-IST), 5.3 (1-C-IST) for full evidence._

### Category 2: User Input — Typed Input (Scenario 2)

Type a date directly in the input field.

| Test ID | Config | TZ  | Date Typed          | Expected Raw                                                                   | Status                   |
| ------- | :----: | :-: | ------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| 2-A-BRT |   A    | BRT | 03/15/2026          | `"2026-03-15"`                                                                 | DONE ✓ (matches popup)   |
| 2-B-BRT |   B    | BRT | 03/15/2026          | `"2026-03-15"`                                                                 | DONE ✓ (matches popup)   |
| 2-C-BRT |   C    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                        | DONE ✓ (matches popup)   |
| 2-D-BRT |   D    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                        | DONE ✓ (matches popup)   |
| 2-A-IST |   A    | IST | 03/15/2026          | `"2026-03-14"` (-1 day — string path, same as popup; Bug #2 absent)            | FAIL — Bug #7 (Test 8.1) |
| 2-B-IST |   B    | IST | 03/15/2026          | `"2026-03-14"` (same as 2-A-IST — ignoreTZ no effect on date-only)             | FAIL — Bug #7 (Test 8.2) |
| 2-E-BRT |   E    | BRT | 03/15/2026          | `"2026-03-15"` (typed path — date-only; differs from popup — Bug #2 confirmed) | PASS ✓ (Test 9.2)        |
| 2-F-BRT |   F    | BRT | 03/15/2026          |                                                                                | NOT TESTED (legacy)      |
| 2-G-BRT |   G    | BRT | 03/15/2026 12:00 AM |                                                                                | NOT TESTED (legacy)      |
| 2-H-BRT |   H    | BRT | 03/15/2026 12:00 AM |                                                                                | NOT TESTED (legacy)      |

_IST note (updated 2026-03-31): Typed input confirmed via Test 8.1 (2-A-IST): stores `"2026-03-14"` (-1 day, Bug #7) — identical to popup result (Test 5.1). Bug #2 asymmetry (popup -2 days, typed -1 day) not observed in V1 with useLegacy=false. Both input methods go through the same single local-midnight conversion. Predicted 2-C-IST / 2-D-IST values of `"2026-03-14T18:30:00"` are likely wrong — expect `"2026-03-15T00:00:00"` (same as BRT) based on getSaveValue() formatting as local time (confirmed for 1-C-IST, 1-D-IST)._

### Category 3: Server Reload (Scenario 3)

Save form, open saved record in new tab. Compare displayed dates with original.

| Test ID     | Config | Save TZ | Load TZ | Status                                       |
| ----------- | :----: | :-----: | :-----: | -------------------------------------------- |
| 3-A-BRT-BRT |   A    |   BRT   |   BRT   | DONE ✓ (no shift)                            |
| 3-C-BRT-BRT |   C    |   BRT   |   BRT   | DONE ✓ (no shift)                            |
| 3-D-BRT-BRT |   D    |   BRT   |   BRT   | DONE ✓ (no shift)                            |
| 3-D-BRT-IST |   D    |   BRT   |   IST   | DONE ✓ (display OK, but GFV differs)         |
| 3-A-BRT-IST |   A    |   BRT   |   IST   | NOT TESTED                                   |
| 3-C-BRT-IST |   C    |   BRT   |   IST   | NOT TESTED                                   |
| 3-D-IST-BRT |   D    |   IST   |   BRT   | NOT TESTED (save from Mumbai, reload in BRT) |
| 3-ALL-E-H   |  E-H   |   any   |   any   | NOT TESTED (legacy)                          |

### Category 4: URL Parameters (Scenario 4)

Open form with date in URL query string (requires enableQListener=true).

| Test ID          | Config | URL Value                                | Expected Behavior                     | Status     |
| ---------------- | :----: | ---------------------------------------- | ------------------------------------- | ---------- |
| 4-D-Z            |   D    | `?field=2026-03-15T00:00:00.000Z`        | parseDateString strips Z → local time | NOT TESTED |
| 4-D-noZ          |   D    | `?field=2026-03-15T00:00:00`             | parseDateString treats as local       | NOT TESTED |
| 4-C-Z            |   C    | `?field=2026-03-15T00:00:00.000Z`        | parseDateString strips Z              | NOT TESTED |
| 4-A-dateonly     |   A    | `?field=2026-03-15`                      | should show March 15                  | NOT TESTED |
| 4-D-midnight-IST |   D    | `?field=2026-03-15T00:00:00.000Z` in IST | May shift to Mar 15 05:30             | NOT TESTED |

_Note: Requires fields with enableQListener=true to test_

### Category 5: Preset Date Default (Scenario 5)

Form template with a specific preset date (e.g., "March 1, 2026").

| Test ID      |     Config     | Preset   | TZ  | Expected                   | Status                                   |
| ------------ | :------------: | -------- | :-: | -------------------------- | ---------------------------------------- |
| 5-A-BRT      | A (eT=f,iTz=f) | 3/1/2026 | BRT | `"2026-03-01"` or Date obj | DONE ✓ (DataField2)                      |
| 5-B-BRT      | B (eT=f,iTz=t) | 3/1/2026 | BRT |                            | NOT TESTED                               |
| 5-C-BRT      | C (eT=t,iTz=f) | 3/1/2026 | BRT |                            | NOT TESTED (need field with preset+time) |
| 5-D-BRT      | D (eT=t,iTz=t) | 3/1/2026 | BRT |                            | NOT TESTED (need field with preset+time) |
| 5-A-IST      |       A        | 3/1/2026 | IST | Should still show March 1  | NOT TESTED                               |
| 5-ALL-legacy |      E-H       | 3/1/2026 | any |                            | NOT TESTED (legacy)                      |

### Category 6: Current Date Default (Scenario 6)

Form template with "Current Date" default.

| Test ID      |     Config     | TZ  | Expected                       | Status                                        |
| ------------ | :------------: | :-: | ------------------------------ | --------------------------------------------- |
| 6-A-BRT      | A (eT=f,iTz=f) | BRT | Date obj with current UTC time | DONE ✓ (DataField1)                           |
| 6-B-BRT      | B (eT=f,iTz=t) | BRT |                                | NOT TESTED                                    |
| 6-C-BRT      | C (eT=t,iTz=f) | BRT |                                | NOT TESTED (need field with currentDate+time) |
| 6-D-BRT      | D (eT=t,iTz=t) | BRT |                                | NOT TESTED (need field with currentDate+time) |
| 6-A-IST      |       A        | IST | Should show today in IST       | NOT TESTED                                    |
| 6-ALL-legacy |      E-H       | any |                                | NOT TESTED (legacy)                           |

### Category 7: Developer API — SetFieldValue (Scenario 7)

Different input formats passed to `VV.Form.SetFieldValue()`.

| Test ID          | Config | Input Value                        | Input Type     | Expected Stored                             | Status                                                                           |
| ---------------- | :----: | ---------------------------------- | -------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| 7-D-dateObj      |   D    | `new Date(2026,2,15)`              | Date object    | `"2026-03-15T00:00:00"`                     | DONE ✓                                                                           |
| 7-D-isoZ         |   D    | `"2026-03-15T00:00:00.000Z"`       | ISO with Z     | `"2026-03-14T21:00:00"` (shifted!)          | DONE ✓                                                                           |
| 7-D-isoNoZ       |   D    | `"2026-03-15T00:00:00"`            | ISO without Z  | `"2026-03-15T00:00:00"`                     | DONE ✓ (stored as-is, GFV adds fake Z)                                           |
| 7-D-dateOnly     |   D    | `"2026-03-15"`                     | Date string    | `"2026-03-15T00:00:00"` (midnight appended) | DONE ✓ (GFV adds fake Z)                                                         |
| 7-D-usFormat     |   D    | `"03/15/2026"`                     | US format      | `"2026-03-15T00:00:00"` (normalized to ISO) | DONE ✓ (GFV adds fake Z)                                                         |
| 7-D-usFormatTime |   D    | `"03/15/2026 12:00:00 AM"`         | US + time      | `"2026-03-15T00:00:00"` (normalized)        | DONE ✓ (GFV adds fake Z)                                                         |
| 7-D-epoch        |   D    | `1773543600000` (Mar 15 00:00 BRT) | Unix timestamp | `"2026-03-15T00:00:00"` (local time)        | DONE ✓ (epoch→Date→local, GFV adds fake Z)                                       |
| 7-C-isoZ         |   C    | `"2026-03-15T00:00:00.000Z"`       | ISO with Z     | `"2026-03-14T21:00:00"` (UTC→local BRT)     | DONE ✓ (GFV correctly returns `"2026-03-15T00:00:00.000Z"` — real UTC)           |
| 7-C-isoNoZ       |   C    | `"2026-03-15T00:00:00"`            | ISO without Z  | `"2026-03-15T00:00:00"` (treated as local)  | DONE ✓ (GFV returns `"2026-03-15T03:00:00.000Z"` — real UTC)                     |
| 7-A-dateOnly     |   A    | `"2026-03-15"`                     | Date string    | `"2026-03-15"`                              | DONE ✓ (no transformation)                                                       |
| 7-A-isoZ         |   A    | `"2026-03-15T00:00:00.000Z"`       | ISO with Z     | `"2026-03-15"` (time+Z stripped)            | DONE ✓ (date extracted from ISO string, NOT local-converted — see 7-A-isoZ-edge) |
| 7-ALL-legacy     |  E-H   | various                            | various        |                                             | NOT TESTED (legacy)                                                              |

### Category 8: Developer API — GetFieldValue (Scenario 8)

Return format for each configuration.

| Test ID         |                    Config                    | Stored Raw              | Expected Return                                  | Status              |
| --------------- | :------------------------------------------: | ----------------------- | ------------------------------------------------ | ------------------- |
| 8-A             |                      A                       | `"2026-03-15"`          | `"2026-03-15"`                                   | DONE ✓              |
| 8-B             |                      B                       | `"2026-03-15"`          | `"2026-03-15"`                                   | DONE ✓              |
| 8-C-BRT         |                      C                       | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` (real UTC)          | DONE ✓              |
| 8-C-IST         |                      C                       | `"2026-03-15T00:00:00"` | `"2026-03-14T18:30:00.000Z"` (real UTC from IST) | DONE ✓              |
| 8-D-BRT         |                      D                       | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (FAKE Z!)           | DONE ✓              |
| 8-D-IST         |                      D                       | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (FAKE Z!)           | DONE ✓              |
| 8-E through 8-H |                     E-H                      | various                 |                                                  | NOT TESTED (legacy) |
| 8-updated       | any with `useUpdatedCalendarValueLogic=true` | any                     | raw value unchanged                              | NOT TESTED          |

### Category 9: Round-Trip — SetFieldValue(GetFieldValue())

| Test ID      | Config | TZ  | Trips | Expected Shift        | Status                                                  |
| ------------ | :----: | :-: | :---: | --------------------- | ------------------------------------------------------- |
| 9-D-BRT-1    |   D    | BRT |   1   | -3h                   | DONE ✓                                                  |
| 9-D-BRT-8    |   D    | BRT |   8   | -24h (1 day)          | DONE ✓                                                  |
| 9-D-BRT-10   |   D    | BRT |  10   | -30h                  | DONE ✓                                                  |
| 9-D-IST-1    |   D    | IST |   1   | +5:30h                | DONE ✓                                                  |
| 9-D-IST-5    |   D    | IST |   5   | +27:30h (crosses day) | DONE ✓ (00:00→05:30→11:00→16:30→22:00→**16-Mar 03:30**) |
| 9-C-BRT-1    |   C    | BRT |   1   | 0 (stable)            | DONE ✓                                                  |
| 9-C-IST-1    |   C    | IST |   1   | 0 (stable)            | DONE ✓                                                  |
| 9-A-any      |   A    | any |   1   | 0 (stable)            | DONE ✓                                                  |
| 9-B-any      |   B    | any |   1   | 0 (stable)            | DONE ✓                                                  |
| 9-ALL-legacy |  E-H   | any |   1   | unknown               | NOT TESTED (legacy)                                     |

### Category 10: Web Service / External Script — SetFieldValue from Code

Simulates a scheduled script, form button event, or web service call setting date values.

| Test ID                | Config | Source Format      | Value                             | Expected Result                          | Status     |
| ---------------------- | :----: | ------------------ | --------------------------------- | ---------------------------------------- | ---------- |
| 10-D-ws-isoZ           |   D    | Web service JSON   | `"2026-03-15T00:00:00.000Z"`      | Stored as local time? Shifted?           | NOT TESTED |
| 10-D-ws-isoNoZ         |   D    | Web service JSON   | `"2026-03-15T00:00:00"`           | Stored as-is?                            | NOT TESTED |
| 10-D-ws-dateOnly       |   D    | Web service JSON   | `"2026-03-15"`                    |                                          | NOT TESTED |
| 10-D-ws-dotnet         |   D    | .NET DateTime      | `"2026-03-15T00:00:00.000+00:00"` |                                          | NOT TESTED |
| 10-D-ws-epoch          |   D    | Epoch ms           | `1773784800000`                   |                                          | NOT TESTED |
| 10-C-ws-isoZ           |   C    | Web service JSON   | `"2026-03-15T00:00:00.000Z"`      |                                          | NOT TESTED |
| 10-A-ws-isoZ           |   A    | Web service JSON   | `"2026-03-15T00:00:00.000Z"`      |                                          | NOT TESTED |
| 10-A-ws-dateOnly       |   A    | Web service JSON   | `"2026-03-15"`                    |                                          | NOT TESTED |
| 10-D-ws-midnight-cross |   D    | Web service        | `"2026-03-15T02:00:00.000Z"`      | In BRT: Mar 14 23:00 (crosses midnight!) | NOT TESTED |
| 10-D-script-scheduled  |   D    | Scheduled script   | `response.data.date` (various)    |                                          | NOT TESTED |
| 10-D-script-button     |   D    | Form button script | `VV.Form.SetFieldValue(...)`      | Same as Cat 7                            | NOT TESTED |

### Category 11: Cross-Timezone — Multi-User Scenarios

| Test ID              | Action                                         |    TZ 1     | TZ 2  | Expected Issue                            | Status                    |
| -------------------- | ---------------------------------------------- | :---------: | :---: | ----------------------------------------- | ------------------------- |
| 11-save-BRT-load-IST | Save form in BRT, load in IST                  |     BRT     |  IST  | Display OK, but DB query mismatch         | PARTIALLY TESTED          |
| 11-save-IST-load-BRT | Save in IST, load in BRT                       |     IST     |  BRT  |                                           | NOT TESTED                |
| 11-roundtrip-cross   | Save BRT, load IST, round-trip, save, load BRT | BRT→IST→BRT |       | Compound drift from different offsets     | NOT TESTED                |
| 11-concurrent-edit   | User A (BRT) and B (IST) edit same record      |     BRT     |  IST  | Overwrite with different UTC moment       | NOT TESTED                |
| 11-report-cross      | Query DB for dates entered from different TZs  |    mixed    |   —   | Inconsistent query results                | IDENTIFIED (see Test 2.4) |
| 11-load-UTC0         | Load saved record in London (UTC+0)            |      —      | UTC+0 | No fake-Z drift (Z happens to be correct) | NOT TESTED                |
| 11-load-PST          | Load saved record in San Francisco (UTC-8)     |      —      |  PST  | Large backward drift on round-trip        | NOT TESTED                |
| 11-load-Tokyo        | Load saved record in Tokyo (UTC+9)             |      —      |  JST  | Large forward drift on round-trip         | NOT TESTED                |

### Category 12: Edge Cases

| Test ID            | Description            | Config | Value                        | Expected Issue                              | Status                                                                                      |
| ------------------ | ---------------------- | :----: | ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 12-near-midnight-1 | Date at 00:30 UTC      |   D    | `"2026-03-15T00:30:00.000Z"` | In BRT: Mar 14 21:30 (day shifts!)          | DONE ✓ (raw=`"2026-03-14T21:30:00"`, day crossed on input+fake Z)                           |
| 12-near-midnight-2 | Date at 23:00 local    |   D    | Set 11 PM local              | 23→20→17→14→11 (-3h/trip)                   | DONE ✓ (day crossing after trip 8 from midnight, or trip 2 from 23:00→17:00 stays same day) |
| 12-dst-transition  | Date on DST change day |   D    | Mar 8 2026 02:00             | Standard -3h drift from BRT                 | DONE ✓ (02:00→previous day 23:00 after 1 trip, no DST anomaly from BRT browser)             |
| 12-dst-brazil      | Date on Brazil DST     |   D    | (Brazil no longer uses DST)  | N/A                                         | SKIP                                                                                        |
| 12-year-boundary   | Dec 31 → Jan 1 shift   |   D    | `"2026-01-01T00:00:00"`      | **CONFIRMED: 1 trip → 2025-12-31T21:00:00** | DONE ✓ (year boundary crossed in single round-trip!)                                        |
| 12-leap-day        | Feb 29 on leap year    |   D    | `"2028-02-29T00:00:00"`      | **CONFIRMED: 1 trip → 2028-02-28T21:00:00** | DONE ✓ (leap day lost in single round-trip!)                                                |
| 12-empty-value     | Empty/null date        |   D    | `""` or `null`               | **GFV returns `"Invalid Date"` string**     | DONE ✓ (raw="" but GFV="Invalid Date" — truthy, breaks `if(GFV())` checks)                  |
| 12-invalid-string  | Invalid date string    |   D    | `"not-a-date"`               | Silently ignored, field unchanged           | DONE ✓ (no error, no change)                                                                |
| 12-far-future      | Year 2099              |   D    | `"2099-12-31T00:00:00"`      | Standard -3h drift                          | DONE ✓ (no special issue)                                                                   |
| 12-pre-epoch       | Year 1969              |   D    | `"1969-12-31T00:00:00"`      | Standard -3h drift                          | DONE ✓ (handles negative epoch fine)                                                        |

### Category 13: Database Verification

| Test ID              | Description                                                                       | Status                                       |
| -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| 13-initial-values    | DB values for initial/preset dates                                                | DONE ✓ (UTC times in DB)                     |
| 13-user-input        | DB values for popup/typed dates                                                   | DONE ✓ (local times in DB)                   |
| 13-after-roundtrip   | DB values after Bug #5 drift                                                      | NOT TESTED (save after round-trip, check DB) |
| 13-cross-tz-save     | DB values when saved from Mumbai                                                  | NOT TESTED                                   |
| 13-ws-input          | DB values when set via web service                                                | NOT TESTED                                   |
| 13-query-consistency | SQL query returns matching dates for same logical date entered from different TZs | NOT TESTED                                   |

---

## Next Testing Priorities

1. **VERIFY FIRST — Active code path**: Run the `__ngContext__` snippet (see Test Environment table) in DevTools console. Expected: `false` = V1 running. Already confirmed `false` on 2026-03-30.
2. **HIGH — Category 1/2 IST (popup vs typed for Config A)**: Open form in IST, pick March 15 from popup on DataField7, then type 03/15/2026 — compare stored values. Expected: popup → `"2026-03-13"`, typed → `"2026-03-14"` (different due to Bug #7 Date object vs string asymmetry).
3. **HIGH — Category 10 (Web Service)**: Zero coverage on how server-side scripts set dates. Need Node.js test script.
4. **HIGH — Category 3-D-IST-BRT**: Save from IST, reload from BRT — need to switch back to BRT to complete.
5. **MEDIUM — Category 5/6 (Preset/Current Date on DateTime fields)**: Requires new test form fields with `enableTime=true` + initial value.
6. **MEDIUM — Category 4 (URL Parameters)**: Requires enableQListener fields.
7. **MEDIUM — Category 11 (Cross-TZ multi-user)**: Multi-user save/edit scenarios.
8. **LOW — Legacy configs (E-H)**: Blocked until `useLegacy=true` access is available.

---

## Session Context (All Sessions)

Sessions 1–5 (2026-03-27 and 2026-03-30). Session 4 (IST) ran Tests 5.1–5.4: 1-A-IST and 1-B-IST confirmed Bug #7 (-1 day) for Configs A and B; 1-C-IST confirmed Config C stores local midnight (getSaveValue() formats as local time, not UTC offset); 1-D-IST confirmed Bug #5 fake Z in IST (+5:30h drift per round-trip). System TZ returned to BRT after Session 4. Session 5 (UTC+0/GMT) ran Test 6.1: 1-A-UTC0 confirmed zero-drift control — Config A popup stores correct date at UTC+0. Note: `Europe/London` is NOT equivalent to UTC+0 in March (BST = UTC+1 since March 29, 2026); use `GMT` timezone for UTC+0 testing on macOS.

### What was tested

Tests were run interactively using Chrome browser automation (Claude-in-Chrome MCP extension). The browser navigated to live VisualVault FormViewer instances, interacted with calendar popups, typed dates, and executed JavaScript to inspect internal state (`VV.Form.VV.FormPartition.getValueObjectValue()`, `VV.Form.GetFieldValue()`, `VV.Form.SetFieldValue()`).

### What was NOT tested

- **`useLegacy=true`** — Emanuel does not currently have access to enable this setting. This is the main gap — the analysis document's Bug #2 (inconsistent popup vs typed handlers) may only manifest with legacy mode.
- **`useUpdatedCalendarValueLogic` confirmed `false` via live `__ngContext__` scan (2026-03-30)** — V1 is the active path on this form/account. Re-verify if testing on a different account or if `?ObjectID=` is ever added to the URL.
- **Popup vs typed input in IST for date-only fields** — 1-A-IST (Test 5.1) and 1-B-IST (Test 5.2) confirmed popup stores `"2026-03-14"` (-1 day) for Configs A and B. The double-shift prediction (-2 days) was wrong. Run 2-A-IST and 2-B-IST to confirm typed input independently — expected also `"2026-03-14"`.
- **URL parameter input (Scenario 4)** — Requires `enableQListener=true` on fields.
- **Web service / scheduled script input** — Requires running a server-side script to set values via the API.
- **Preset/Current Date with DateTime fields** — DataField1-4 are all date-only. Need DateTime fields with initial value configs to test Scenarios 5/6 with `enableTime=true`.

### Key findings to carry forward

1. **Bug #5 is the highest-severity confirmed bug**: The `getCalendarFieldValue()` function adds a fake literal `[Z]` when `enableTime=true && ignoreTimezone=true && !useLegacy`. This causes progressive date drift on every `SetFieldValue(GetFieldValue())` round-trip. Drift = timezone offset per trip.
2. **Bug #2 was NOT reproduced** with `useLegacy=false` — popup and typed input produce identical values.
3. **The database stores a mix of UTC and local times** depending on code path (initial values vs user input).
4. **The analysis document may be inaccurate** about `calChangeSetValue` bypassing `getSaveValue()` — our tests show both paths produce the same format.
5. **`ignoreTimezone=true` on date-only fields has no effect** — the fake-Z bug only triggers when `enableTime=true`.

### Test form field IDs (for JS access)

```javascript
// Access field configs
VV.Form.VV.FormPartition.fieldMaster; // all field definitions
VV.Form.VV.FormPartition.getValueObjectValue('DataField5'); // raw stored value
VV.Form.GetFieldValue('DataField5'); // processed return value
VV.Form.SetFieldValue('DataField5', value); // set value
```

### Note on test numbering

Tests were written in execution order, not numerical order. The sequence in the document is:
2.0 (baseline) → 2.1 (popup) → 2.2 (round-trip) → 2.8 (cross-TZ analysis) → 2.9 (live Mumbai) → 2.7 (typed input) → 2.5 (DataField10) → 2.6 (multiple trips) → 2.3 (reload) → 2.4 (DB evidence). This reflects the actual testing progression.

---

## Session 8: Calendar Popup — Legacy Configs (BRT, UTC-3)

**Date**: 2026-03-31 | **TZ**: America/Sao_Paulo (UTC-3) — Brasilia Standard Time, no DST | **Form**: DateTest-000046 (fresh template instance)
**Purpose**: First live tests of useLegacy=true field configs (E/F/G/H). Confirms whether legacy popup path stores full UTC datetime strings or date-only strings.
**Key outcomes**: All four legacy popup configs (E/F/G/H) confirmed. Legacy popup path stores full UTC datetime ISO string `"2026-03-15T03:00:00.000Z"` regardless of `enableTime` or `ignoreTimezone` flags — all four store identical format. Popup closes immediately after day selection for DateTime configs (G/H) — no Time tab despite `enableTime=true`. `useLegacy=true` correctly skips fake-Z branch in GetFieldValue (H confirmed). Typed input (2-E-BRT) stores `"2026-03-15"` (date-only) — **Bug #2 confirmed** for useLegacy=true. Legacy fields use plain text input widget (not Kendo masked DatePicker). 1-G-BRT (Config G, enableTime=true, ignoreTimezone=false, useLegacy=true) — legacy DateTime popup closes without Time tab on day click; stores raw UTC BRT midnight `"2026-03-15T03:00:00.000Z"`; same raw storage pattern as E/F despite enableTime=true. Bug #4 (Z-stripping) inert on popup path.

### Test 9.1: Calendar popup Config E (useLegacy=true), BRT (1-E-BRT)

**Precondition verification:**

| Check        | Command                                                                                    | Result                                                           |
| ------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                    | `"Tue Mar 31 2026 08:58:20 GMT-0300 (Brasilia Standard Time)"` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                | `false` → V1 active ✓                                            |
| Field lookup | `filter(enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=false)` | `["DataField12"]` ✓                                              |

**Action:** Clicked calendar icon (`.k-icon.k-i-calendar` inside `.fd-cal-container`) adjacent to DataField12. Popup opened showing March 2026. Clicked the cell with title "Sunday, March 15, 2026". Popup closed immediately (no time tab — `enableTime=false`). Field input displayed `03/15/2026`.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField12'),
    api: VV.Form.GetFieldValue('DataField12'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-15T03:00:00.000Z", api: "2026-03-15T03:00:00.000Z", isoRef: "2026-03-15T03:00:00.000Z" }
```

| Metric           | Value                        | Notes                                                                      |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Display in input | `03/15/2026`                 | Correct — date-only display despite datetime stored                        |
| Raw stored value | `"2026-03-15T03:00:00.000Z"` | Full UTC ISO datetime with Z — NOT date-only                               |
| GetFieldValue()  | `"2026-03-15T03:00:00.000Z"` | Same as raw; no fake Z issue (enableTime=false, so fake-Z branch inactive) |
| isoRef           | `"2026-03-15T03:00:00.000Z"` | Confirms BRT (UTC-3) active: local midnight = 03:00:00 UTC                 |
| Matrix Expected  | `"2026-03-15"`               | **MISMATCH — prediction was wrong**                                        |

**Findings:**

- **Prediction failure**: The matrix predicted `"2026-03-15"` (date-only, same as Config A/B-BRT). Actual: `"2026-03-15T03:00:00.000Z"`. The legacy popup path stores a full UTC ISO datetime string even for `enableTime=false` fields. This is functionally different from the modern path which stores just the date string.
- **Date is correct**: `"2026-03-15T03:00:00.000Z"` = March 15, 2026 00:00:00 BRT — the selected date is preserved correctly. No date drift. Bug #7 is absent in BRT as expected.
- **Z suffix present**: Bug #4 (Legacy Save Format — removes Z) appears inert on the calendar popup path for useLegacy=true fields. The stored value retains the Z. Whether getSaveValue() is bypassed or whether it handles the value differently needs further code analysis.
- **Knock-on correction**: 1-F-BRT was predicted `"2026-03-15"` (same as E-BRT). Now corrected to `"2026-03-15T03:00:00.000Z"`. All legacy date-only BRT popup tests (1-F-BRT, 1-E-IST, 1-F-IST) should assume UTC datetime format, not date-only.
- **CLAUDE.md outdated note**: The "What Has NOT Been Tested" section listed `useLegacy=true` as inaccessible. DataField12/11/14/13 ARE accessible on the test form. That note should be removed in a future CLAUDE.md update.
- **Next test**: Run 2-E-BRT (typed input, Config E, BRT) — the paired test for Bug #2. If typed input stores `"2026-03-15"` (date-only string path) while popup stores `"2026-03-15T03:00:00.000Z"`, Bug #2 is confirmed for useLegacy=true.

**TC file**: [tc-1-E-BRT.md](tc-1-E-BRT.md)

---

### Test 9.2: Typed input Config E (useLegacy=true), BRT (2-E-BRT)

**Precondition verification:**

| Check        | Command                                                                                    | Result                                                           |
| ------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                    | `"Tue Mar 31 2026 09:21:13 GMT-0300 (Brasilia Standard Time)"` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                | `false` → V1 active ✓                                            |
| Field lookup | `filter(enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=false)` | `["DataField12"]` ✓                                              |

**Action:** Discovered that Config E fields (`useLegacy=true`) render as a **plain HTML text input**, not the Kendo masked DatePicker used by modern configs (A/B/C/D). There are no separate month/day/year segments. Clicked DataField12 at its center coordinate (scrolled into view via JS to resolve click-landing issues at the bottom of the form). Typed `03/15/2026` as a continuous string. Pressed Tab. Field retained display value `03/15/2026`.

**Captured values:**

```javascript
({
    displayValue: document.getElementById('DataField12').value,
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField12'),
    api: VV.Form.GetFieldValue('DataField12'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { displayValue: "03/15/2026", raw: "2026-03-15", api: "2026-03-15", isoRef: "2026-03-15T03:00:00.000Z" }
```

| Metric           | Value                        | Notes                                |
| ---------------- | ---------------------------- | ------------------------------------ |
| Display in input | `03/15/2026`                 | Correct                              |
| Raw stored value | `"2026-03-15"`               | Date-only string — no time component |
| GetFieldValue()  | `"2026-03-15"`               | Same as raw                          |
| isoRef           | `"2026-03-15T03:00:00.000Z"` | Confirms BRT (UTC-3) active          |
| Matrix Expected  | `"2026-03-15"`               | **MATCH**                            |

**Findings:**

- **PASS — matrix prediction correct**: Typed input for Config E stores `"2026-03-15"` (date-only string), matching the matrix prediction.
- **Bug #2 CONFIRMED for useLegacy=true**: This test paired with Test 9.1 (popup) directly demonstrates the inconsistency: the same field (Config E, BRT) stores `"2026-03-15T03:00:00.000Z"` from the popup but `"2026-03-15"` from typed input. Two different internal handlers produce two different storage formats for the same intended date. Analysis.md Bug #2 was labelled "NOT REPRODUCED with useLegacy=false in BRT — may only exist with useLegacy=true." It now has live evidence with useLegacy=true.
- **Plain text input widget**: Legacy config fields (`useLegacy=true`) use a plain HTML text input, not the Kendo masked DatePicker. This means the typing interaction is different — full `MM/dd/yyyy` string typed in one pass, no segment auto-advance. TC file documents this.
- **No Bug #7**: BRT (UTC-3) is not affected by Bug #7 for date-only fields. The stored `"2026-03-15"` is correct.
- **Knock-on**: 2-F-BRT prediction `"2026-03-15"` remains valid — ignoreTZ has no effect on date-only typed input. 2-F-BRT will also confirm Bug #2 when paired with 1-F-BRT popup result.
- **Next test**: 1-F-BRT (popup, Config F) and 2-F-BRT (typed, Config F) to confirm Bug #2 holds for ignoreTZ=true legacy fields as well.

**TC file**: [tc-2-E-BRT.md](tc-2-E-BRT.md)

---

### Test 9.3: Calendar popup Config F (useLegacy=true, ignoreTZ=true), BRT (1-F-BRT)

**Precondition verification:**

| Check        | Command                                                                                   | Result                                                           |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                   | `"Tue Mar 31 2026 09:45:32 GMT-0300 (Brasilia Standard Time)"` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                            |
| Field lookup | `filter(enableTime=false, ignoreTimezone=true, useLegacy=true, enableInitialValue=false)` | `["DataField11"]` ✓                                              |

**Action:** Triggered click on calendar icon (`.k-icon.k-i-calendar` inside `.fd-cal-container`) adjacent to DataField11 via JS `.click()` (required due to scroll position). Popup opened showing March 2026. Clicked the cell with title "Sunday, March 15, 2026". Popup closed immediately (no time tab — `enableTime=false`). Field input displayed `03/15/2026`. "Unsaved Changes" counter incremented from 18 to 19, confirming the field value was registered.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField11'),
    api: VV.Form.GetFieldValue('DataField11'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
    displayValue: document.getElementById('DataField11').value,
});
// → { raw: "2026-03-15T03:00:00.000Z", api: "2026-03-15T03:00:00.000Z", isoRef: "2026-03-15T03:00:00.000Z", displayValue: "03/15/2026" }
```

| Metric           | Value                        | Notes                                                                       |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------- |
| Display in input | `03/15/2026`                 | Correct — date-only display despite datetime stored                         |
| Raw stored value | `"2026-03-15T03:00:00.000Z"` | Full UTC ISO datetime with Z — NOT date-only                                |
| GetFieldValue()  | `"2026-03-15T03:00:00.000Z"` | Same as raw; no fake Z (enableTime=false, fake-Z branch inactive)           |
| isoRef           | `"2026-03-15T03:00:00.000Z"` | Confirms BRT (UTC-3) active: local midnight = 03:00:00 UTC                  |
| Matrix Expected  | `"2026-03-15T03:00:00.000Z"` | **MATCH** (prediction corrected 2026-03-31 as knock-on from 1-E-BRT result) |

**Findings:**

- **PASS — prediction correct**: Config F (ignoreTZ=true) stores `"2026-03-15T03:00:00.000Z"` — identical to Config E (ignoreTZ=false) from Test 9.1. The corrected matrix prediction holds.
- **ignoreTZ has no effect on legacy popup path for date-only fields**: `ignoreTimezone=true` vs `ignoreTimezone=false` produces identical storage behavior on the legacy popup path when `enableTime=false`. This is consistent with the non-legacy path finding: for date-only configs, ignoreTZ is a no-op at the storage layer.
- **Bug #2 continues to apply**: Config F popup stores `"2026-03-15T03:00:00.000Z"` (UTC datetime). When 2-F-BRT is run (typed input), it is expected to store `"2026-03-15"` (date-only string) — same asymmetry as confirmed for Config E in Tests 9.1/9.2. This test alone does not confirm Bug #2 for Config F; the paired typed test (2-F-BRT) is required.
- **Z suffix present**: Bug #4 (Legacy Save Format — removes Z) is inert on the legacy popup path for date-only fields, same as observed for Config E. The stored value retains the Z.
- **Date is correct**: `"2026-03-15T03:00:00.000Z"` = March 15, 2026 00:00:00 BRT — no date drift. Bug #7 is absent in BRT as expected (UTC-3 midnight remains same UTC day).
- **Next test**: Run 2-F-BRT (typed input, Config F, BRT) to directly confirm Bug #2 for Config F — if typed stores `"2026-03-15"` while popup stores `"2026-03-15T03:00:00.000Z"`, Bug #2 is confirmed on the second legacy config.

**TC file**: [tc-1-F-BRT.md](tc-1-F-BRT.md)

---

### Test 9.4: Calendar popup Config G (useLegacy=true, enableTime=true, ignoreTZ=false), BRT (1-G-BRT)

**Precondition verification:**

| Check        | Command                                                                                   | Result                                                           |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                   | `"Tue Mar 31 2026 09:56:03 GMT-0300 (Brasilia Standard Time)"` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                            |
| Field lookup | `filter(enableTime=true, ignoreTimezone=false, useLegacy=true, enableInitialValue=false)` | `["DataField14"]` ✓                                              |

**Action:** Triggered click on calendar icon (`.k-icon.k-i-calendar` inside `.fd-cal-container`) adjacent to DataField14 via JS `.click()`. Popup opened showing March 2026. Clicked the cell with title "Sunday, March 15, 2026" via `td.click()`. Popup closed immediately — **no Time tab appeared** despite `enableTime=true`. Field input displayed `03/15/2026 12:00 AM`. The time defaulted to midnight local time (BRT 00:00 = 03:00 UTC) without any time selection step.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField14'),
    api: VV.Form.GetFieldValue('DataField14'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-15T03:00:00.000Z", api: "2026-03-15T03:00:00.000Z", isoRef: "2026-03-15T03:00:00.000Z" }
```

| Metric           | Value                        | Notes                                                                     |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------- |
| Display in input | `03/15/2026 12:00 AM`        | Correct date; time forced to midnight (no time selection via popup)       |
| Raw stored value | `"2026-03-15T03:00:00.000Z"` | Full UTC ISO datetime with Z — BRT midnight (00:00 BRT = 03:00 UTC)       |
| GetFieldValue()  | `"2026-03-15T03:00:00.000Z"` | Same as raw; no fake Z (ignoreTimezone=false, Bug #5 branch inactive)     |
| isoRef           | `"2026-03-15T03:00:00.000Z"` | Confirms BRT (UTC-3) active: local midnight = 03:00:00 UTC                |
| Matrix Expected  | `"2026-03-15T00:00:00"`      | **PREDICTION WRONG** — actual differs in both time component and Z suffix |

**Findings:**

- **Prediction miss — matrix corrected**: The matrix predicted `"2026-03-15T00:00:00"` ("same as C-BRT") but actual is `"2026-03-15T03:00:00.000Z"`. The "same as C-BRT" assumption was wrong because Config C (modern path) routes through `getSaveValue()` which formats the value as local time without Z. Config G (legacy path) stores the raw UTC ISO `toISOString()` result in the partition without `getSaveValue()` transformation. Matrix row updated to actual value.
- **Legacy DateTime popup closes without Time tab**: For `useLegacy=true`, `enableTime=true` (Config G), clicking a day in the calendar popup closes it immediately — no Time tab is shown. The user cannot select a time via the popup. Time defaults to midnight local time. This is a behavioral deviation from modern DateTime configs (C/D), which advance to a Time tab after day selection.
- **Raw storage pattern identical to E/F**: Despite `enableTime=true`, the in-memory partition value is `"2026-03-15T03:00:00.000Z"` — the same full UTC ISO datetime string pattern observed for date-only legacy configs (E/F). All three legacy popup paths (E, F, G) store raw UTC ISO, bypassing the `getSaveValue()` format step.
- **Bug #4 (Z-stripping) inert on popup path**: The raw value retains the Z suffix. Bug #4 (`getSaveValue()` strips Z for legacy DateTime) would only apply at form submission to the server, not to the in-memory `getValueObjectValue()` read.
- **No date drift**: `"2026-03-15T03:00:00.000Z"` = March 15, 2026 00:00:00 BRT — correct date. Bug #7 is absent in BRT (UTC-3 midnight remains same UTC day).
- **Bug #5 absent**: `ignoreTimezone=false` for Config G — fake-Z branch in `getCalendarFieldValue()` is not active. GetFieldValue returns the raw value unchanged.
- **Knock-on for 1-H-BRT**: Config H (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`) is the ignoreTZ variant of G. Based on the E/F pattern (ignoreTZ no-op on legacy popup), predict H-BRT stores `"2026-03-15T03:00:00.000Z"` — same as G. Update matrix if confirmed.
- **Next test**: 1-H-BRT (popup Config H, BRT) to confirm ignoreTZ has no effect on legacy DateTime popup, and to check whether GetFieldValue for H differs (fake-Z branch skipped for useLegacy=true).

**TC file**: [tc-1-G-BRT.md](tc-1-G-BRT.md)

---

### Test 9.5: Calendar popup Config H (useLegacy=true, enableTime=true, ignoreTZ=true), BRT (1-H-BRT)

**Precondition verification:**

| Check        | Command                                                                                  | Result                                                           |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                  | `"Tue Mar 31 2026 10:04:49 GMT-0300 (Brasilia Standard Time)"` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                            |
| Field lookup | `filter(enableTime=true, ignoreTimezone=true, useLegacy=true, enableInitialValue=false)` | `["DataField13"]` ✓                                              |

**Action:** Triggered click on calendar icon (`.k-icon.k-i-calendar` inside `.fd-cal-container`) adjacent to DataField13 via JS `.click()` (field scrolled into view first). Popup opened showing March 2026. Clicked the cell with title "Sunday, March 15, 2026" via `td.click()`. Popup closed immediately — **no Time tab appeared** despite `enableTime=true`, consistent with Config G (Test 9.4). Field input displayed `03/15/2026 12:00 AM`. Time defaulted to midnight without any time selection step.

**Captured values:**

```javascript
({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField13'),
    api: VV.Form.GetFieldValue('DataField13'),
    displayValue: document.getElementById('DataField13').value,
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { raw: "2026-03-15T03:00:00.000Z", api: "2026-03-15T03:00:00.000Z", displayValue: "03/15/2026 12:00 AM", isoRef: "2026-03-15T03:00:00.000Z" }
```

| Metric           | Value                        | Notes                                                                                          |
| ---------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Display in input | `03/15/2026 12:00 AM`        | Correct date; time forced to midnight (no time selection via popup)                            |
| Raw stored value | `"2026-03-15T03:00:00.000Z"` | Full UTC ISO datetime with Z — BRT midnight (00:00 BRT = 03:00 UTC)                            |
| GetFieldValue()  | `"2026-03-15T03:00:00.000Z"` | Same as raw — no fake Z; `useLegacy=true` skips fake-Z branch in `getCalendarFieldValue()`     |
| isoRef           | `"2026-03-15T03:00:00.000Z"` | Confirms BRT (UTC-3) active: local midnight = 03:00:00 UTC                                     |
| Matrix Expected  | `"2026-03-15T00:00:00"`      | **PREDICTION WRONG** — corrected to `"2026-03-15T03:00:00.000Z"` (same as G-BRT, E-BRT, F-BRT) |

**Findings:**

- **Prediction miss — matrix corrected**: Matrix predicted `"2026-03-15T00:00:00"` (legacy DateTime + ignoreTZ; assumed same as C-BRT non-legacy path). Actual: `"2026-03-15T03:00:00.000Z"`. The legacy popup path stores raw UTC ISO regardless of `enableTime` or `ignoreTimezone` flag — same pattern as G-BRT (Test 9.4), E-BRT (Test 9.1), and F-BRT (Test 9.3). Matrix row corrected.
- **ignoreTZ is a no-op on the legacy popup path**: Config H (`ignoreTimezone=true`) produces identical storage to Config G (`ignoreTimezone=false`). Both store `"2026-03-15T03:00:00.000Z"`. This extends the finding from E/F (date-only) to G/H (DateTime): `ignoreTimezone` has no effect on the legacy calendar popup storage format.
- **useLegacy=true correctly skips fake-Z**: GetFieldValue returns the same value as raw (`"2026-03-15T03:00:00.000Z"`). Unlike Config D (`useLegacy=false`, `ignoreTimezone=true`) which adds a fake Z on GetFieldValue, Config H bypasses that branch entirely. The prediction on this point was correct.
- **No date drift**: `"2026-03-15T03:00:00.000Z"` = March 15, 2026 00:00:00 BRT — correct date. Bug #7 absent in BRT as expected.
- **Legacy popup closes without Time tab**: Consistent with Config G finding (Test 9.4). For all `useLegacy=true` fields tested so far, the popup closes immediately after day selection regardless of `enableTime`. The Time tab is a modern (non-legacy) popup feature.
- **All four legacy popup BRT configs now tested (E/F/G/H)**: All store UTC ISO datetime with Z. All have `ignoreTZ` as a no-op. Date-only configs (E/F) and DateTime configs (G/H) produce the same raw storage format.

**TC file**: [tc-1-H-BRT.md](tc-1-H-BRT.md)

---

## Session 10: Calendar Popup — Legacy Config E, IST (UTC+5:30)

**Date**: 2026-03-31 | **TZ**: Asia/Calcutta (UTC+5:30) — macOS TZ changed + Chrome restarted | **Form**: DateTest-000051
**Purpose**: Verify legacy popup storage format for Config E (date-only, useLegacy=true) in IST timezone; confirm whether the UTC datetime format observed in BRT holds for IST and whether the UTC date shifts to previous day.
**Key outcomes**: Legacy popup stores `"2026-03-14T18:30:00.000Z"` — full UTC datetime with IST midnight = previous day in UTC; matrix prediction `"2026-03-14"` (date-only) was wrong; same format as BRT but UTC date is prior day; knock-on corrections applied to 1-F/G/H-IST predictions.

---

### Test 10.1: Calendar popup Config E (useLegacy=true, date-only), IST (1-E-IST)

**Precondition verification:**

| Check        | Command                                                                                    | Result                                                        |
| ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                    | `"Tue Mar 31 2026 18:43:06 GMT+0530 (India Standard Time)"` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                | `false` → V1 active ✓                                         |
| Field lookup | `filter(enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=false)` | `["DataField12"]` ✓                                           |

**Action:** Triggered click on calendar icon (`.k-icon.k-i-calendar` inside `.fd-cal-container`) adjacent to DataField12 via JS `.click()`. Popup opened showing March 2026. Clicked the cell with title "Sunday, March 15, 2026" via `td.click()`. Popup closed immediately — **no Time tab** (legacy date-only, `enableTime=false`). Field input displayed `03/15/2026`.

**Captured values:**

```javascript
({
    popupStillOpen: !!document.querySelector('.k-calendar-container, .k-popup'),
    displayValue: document.getElementById('DataField12').value,
    raw: VV.Form.VV.FormPartition.getValueObjectValue('DataField12'),
    api: VV.Form.GetFieldValue('DataField12'),
    isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
});
// → { popupStillOpen: false, displayValue: "03/15/2026", raw: "2026-03-14T18:30:00.000Z", api: "2026-03-14T18:30:00.000Z", isoRef: "2026-03-14T18:30:00.000Z" }
```

| Metric           | Value                        | Notes                                                                                            |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Display in input | `03/15/2026`                 | Correct local date — display layer re-converts UTC to IST                                        |
| Raw stored value | `"2026-03-14T18:30:00.000Z"` | Full UTC datetime with Z — IST midnight (00:00+05:30) = 18:30 UTC previous day                   |
| GetFieldValue()  | `"2026-03-14T18:30:00.000Z"` | Same as raw; no fake Z (enableTime=false, fake-Z branch inactive)                                |
| isoRef           | `"2026-03-14T18:30:00.000Z"` | Confirms IST (UTC+5:30) active: local midnight = 18:30:00 UTC                                    |
| Matrix Expected  | `"2026-03-14"`               | **Prediction wrong** — expected date-only string; actual is full UTC datetime. Matrix corrected. |

**Findings:**

- **Prediction miss — matrix corrected**: Matrix predicted `"2026-03-14"` (date-only, Bug #7 single-shift). Actual is `"2026-03-14T18:30:00.000Z"` — full UTC datetime. The legacy popup for Config E bypasses `getSaveValue()` and stores raw `Date.toISOString()` directly, same as confirmed for BRT in Test 9.1. The format is correct for the legacy path; the date-only prediction assumed the modern path would run.
- **IST midnight = previous day in UTC**: `2026-03-15 00:00:00 IST` = `2026-03-14T18:30:00Z`. The UTC date component is March 14, not March 15. On reload, `initCalendarValueV1` will parse this as a DateTime value and display 18:30 IST — which is not midnight. This is a Category 3 (server reload) concern, not Category 1.
- **No fake Z**: GetFieldValue returns the raw value unchanged. `enableTime=false` means the fake-Z branch in `getCalendarFieldValue()` is not active. Bug #5 is absent here (as expected for this config).
- **Bug #2 applies when paired with 2-E-IST**: The popup stores `"2026-03-14T18:30:00.000Z"` (UTC datetime). Typed input (Test 2-E-IST, not yet run) is expected to store `"2026-03-14"` (date-only, same as 2-E-BRT). This asymmetry — same field, same date, different storage format — is Bug #2 applied to IST.
- **Knock-on corrections**: 1-F-IST prediction updated from `"2026-03-14"` to `"2026-03-14T18:30:00.000Z"` (same legacy popup format, ignoreTZ no-op). 1-G-IST and 1-H-IST predictions updated from `"2026-03-14T18:30:00"` to `"2026-03-14T18:30:00.000Z"` (missing `.000Z` — legacy popup stores full toISOString() with milliseconds).
- **Next test**: 2-E-IST (typed input, Config E, IST) to confirm Bug #2 manifests — typed input should store `"2026-03-14"` (date-only) vs popup's `"2026-03-14T18:30:00.000Z"`. Then 1-F-IST to verify ignoreTZ is a no-op on the legacy IST popup.

**TC file**: [tc-1-E-IST.md](tc-1-E-IST.md)

---

## Session Index (from 2026-04-01)

New test runs are recorded in `runs/` and `summaries/`. Each entry below is a one-line pointer.
Full evidence is in the linked run file. Narrative context is in the summary file.

<!-- Append entries below as: - YYYY-MM-DD [TC-{id} Run {N}](runs/tc-{id}-run-N.md) — {TZ} — {PASS/FAIL-N} — {one phrase} -->

## Session 2026-03-31 (IST)

**Purpose**: Verify Config F (useLegacy=true, ignoreTimezone=true) legacy popup behavior in IST — confirm ignoreTZ is no-op.
**Key outcomes**: PASS — Config F stores identical UTC datetime to Config E; ignoreTZ has no effect on legacy popup path.

- 2026-03-31 [TC-1-F-IST Run 1](runs/tc-1-F-IST-run-1.md) — IST — PASS — legacy popup Config F = Config E, ignoreTZ no-op confirmed
- 2026-03-31 [TC-1-G-IST Run 1](runs/tc-1-G-IST-run-1.md) — IST — FAIL-1 — legacy DateTime popup stores UTC datetime; IST midnight = prev-day UTC date
- 2026-03-31 [TC-1-H-IST Run 1](runs/tc-1-H-IST-run-1.md) — IST — FAIL-1 — Config H = Config G; ignoreTZ no-op confirmed; all legacy IST popup slots complete
- 2026-03-31 [TC-2-E-IST Run 1](runs/tc-2-E-IST-run-1.md) — IST — FAIL-1 — Bug #7 in legacy typed input; stores "2026-03-14" (-1 day); Bug #2 format diff confirmed
- 2026-03-31 [TC-2-C-IST Run 1](runs/tc-2-C-IST-run-1.md) — IST — PASS — Config C typed input stores local midnight; same as popup; matrix prediction corrected
- 2026-03-31 [TC-2-D-IST Run 1](runs/tc-2-D-IST-run-1.md) — IST — FAIL-1 — Config D typed input: same storage as C-IST; Bug #5 fake Z in GFV confirmed
- 2026-03-31 [TC-2-F-IST Run 1](runs/tc-2-F-IST-run-1.md) — IST — FAIL-1 — legacy typed Config F stores date-only `"2026-03-14"` (Bug #7); differs from popup format (Bug #2)

## Session 2026-03-31 (UTC+0)

**Purpose**: Verify legacy Config E popup at UTC+0 — control test for legacy format bug at zero offset.
**Key outcomes**: FAIL-1 — legacy format confirmed at UTC+0; stores `"2026-03-15T00:00:00.000Z"` not date-only; prediction corrected.

- 2026-03-31 [TC-1-E-UTC0 Run 1](runs/tc-1-E-UTC0-run-1.md) — UTC+0 — FAIL-1 — legacy stores UTC datetime; date correct (no shift at UTC+0); prediction corrected
- 2026-03-31 [TC-1-F-UTC0 Run 1](runs/tc-1-F-UTC0-run-1.md) — UTC+0 — FAIL-1 — Config F = Config E; ignoreTZ no-op; Category 1 complete (20/20)

## Session 2026-03-31 (IST — Typed Input)

**Purpose**: Verify legacy DateTime typed input behavior in IST — confirm getSaveValue formats local time; compare against popup path.
**Key outcomes**: PASS — typed input stores local midnight correctly; Bug #2 confirmed (popup vs typed inconsistency).

- 2026-03-31 [TC-2-G-IST Run 1](runs/tc-2-G-IST-run-1.md) — IST — PASS — legacy DateTime typed stores local midnight; Bug #2 confirmed vs popup
- 2026-04-01 [TC-2-H-IST Run 1](runs/tc-2-H-IST-run-1.md) — IST — PASS — legacy DateTime typed stores local midnight "2026-03-15T00:00:00"; confirms G-IST finding

## Session 2026-03-31 (BRT — Typed Input Legacy)

**Purpose**: Verify legacy typed input in BRT — Config F (date-only) and Config G (DateTime); confirm getSaveValue formats local time; compare against popup path.
**Key outcomes**: PASS — both configs store correctly via getSaveValue; Bug #2 confirmed (popup vs typed format inconsistency).

- 2026-03-31 [TC-2-F-BRT Run 1](runs/tc-2-F-BRT-run-1.md) — BRT — PASS — legacy typed Config F stores date-only; ignoreTZ no-op; Bug #2 confirmed vs popup
- 2026-03-31 [TC-2-G-BRT Run 1](runs/tc-2-G-BRT-run-1.md) — BRT — PASS — legacy DateTime typed stores local midnight "2026-03-15T00:00:00"; Bug #2 confirmed vs popup
- 2026-03-31 [TC-2-H-BRT Run 1](runs/tc-2-H-BRT-run-1.md) — BRT — PASS — legacy DateTime+ignoreTZ typed stores local midnight; identical to G-BRT; Category 2 complete (16/16)

## Session 2026-03-31 (BRT — TC Spec Creation)

**Purpose**: Create formal TC spec files for existing PASS scenarios; re-verify with fresh run.
**Key outcomes**: PASS — re-confirmed BRT baseline stability.

- 2026-03-31 [TC-1-A-BRT Run 2](runs/tc-1-A-BRT-run-2.md) — BRT — PASS — Config A calendar popup stores "2026-03-15" correctly; re-confirms run-1
- 2026-03-31 [TC-3-A-BRT-BRT Run 2](runs/tc-3-A-BRT-BRT-run-2.md) — BRT — PASS — Config A server reload: date-only string survives save/reload; GFV unchanged
- 2026-03-31 [TC-3-C-BRT-BRT Run 2](runs/tc-3-C-BRT-BRT-run-2.md) — BRT — PASS — Config C server reload: local midnight DateTime survives reload; GFV returns correct UTC
- 2026-03-31 [TC-3-D-BRT-BRT Run 2](runs/tc-3-D-BRT-BRT-run-2.md) — BRT — PASS (FAIL-3) — Config D server reload: raw value unchanged; Bug #5 fake Z confirmed in GFV on reload
- 2026-03-31 [TC-3-A-BRT-BRT Run 3](runs/tc-3-A-BRT-BRT-run-3.md) — BRT — PASS — full save-then-reload on fresh form (DateTest-000079); Config A stable
- 2026-03-31 [TC-3-C-BRT-BRT Run 3](runs/tc-3-C-BRT-BRT-run-3.md) — BRT — PASS — full save-then-reload on fresh form; Config C DateTime stable
- 2026-03-31 [TC-3-D-BRT-BRT Run 3](runs/tc-3-D-BRT-BRT-run-3.md) — BRT — PASS (FAIL-3) — full save-then-reload on fresh form; Bug #5 active pre-save and post-reload

## Session 2026-04-01 (IST)

**Purpose**: Cross-TZ reload verification — BRT-saved records opened in IST.
**Key outcomes**: Config D raw TZ-invariant (Bug #5 on GFV); Config A date-only survives cross-TZ reload (Bug #7 prediction disproved).

- 2026-04-01 [TC-3-D-BRT-IST Run 2](runs/tc-3-D-BRT-IST-run-2.md) — IST — FAIL-3 — Config D cross-TZ reload: raw value stable, display correct; Bug #5 fake Z on GFV (corrects Run 1 PASS)
- 2026-04-01 [TC-3-A-BRT-IST Run 1](runs/tc-3-A-BRT-IST-run-1.md) — IST — PASS — Config A cross-TZ reload: date-only "2026-03-15" survives IST reload; Bug #7 prediction disproved
- 2026-04-01 [TC-3-A-BRT-IST Run 2](runs/tc-3-A-BRT-IST-run-2.md) — IST — PASS — Config A on fresh record (DateTest-000080); confirms Run 1
- 2026-04-01 [TC-3-D-BRT-IST Run 3](runs/tc-3-D-BRT-IST-run-3.md) — IST — FAIL-3 — Config D on fresh record (DateTest-000080); Bug #5 confirmed; raw format changed to US on reload
- 2026-04-01 [TC-3-C-BRT-IST Run 1](runs/tc-3-C-BRT-IST-run-1.md) — IST — FAIL-3,FAIL-4 — Config C cross-TZ: DateTime reinterpreted as IST local; GFV 8.5h shift (Bug #1+#4)

## Session 2026-04-01 (BRT — IST→BRT reload)

**Purpose**: Reverse cross-TZ reload — IST-saved record (DateTest-000084) opened in BRT.
**Key outcomes**: Config D raw TZ-invariant (Bug #5 on GFV); bidirectional cross-TZ verification complete.

- 2026-04-01 [TC-3-D-IST-BRT Run 1](runs/tc-3-D-IST-BRT-run-1.md) — BRT — PASS (FAIL-3) — Config D IST→BRT reload: raw value unchanged, display correct; Bug #5 fake Z on GFV; confirms bidirectional TZ-invariance

## Session 2026-04-01 (BRT — Playwright CLI)

**Purpose**: First Playwright CLI test run — validate TZ simulation equivalence with system TZ change.
**Key outcomes**: Playwright `timezoneId: America/Sao_Paulo` produces identical results to system BRT for 1-A-BRT.

- 2026-04-01 [TC-1-A-BRT Run 3](runs/tc-1-A-BRT-run-3.md) — BRT — PASS — Config A calendar popup via Playwright CLI; confirms TZ simulation equivalence

## Session 2026-04-01 (BRT — WebKit)

**Purpose**: Cross-browser verification — WebKit (Safari engine) via Playwright headless.
**Key outcomes**: WebKit produces identical results to Chrome for Config A BRT.

- 2026-04-01 [TC-1-A-BRT Run 4](runs/tc-1-A-BRT-run-4.md) — BRT — PASS — Config A calendar popup in WebKit; cross-browser consistency confirmed

## Session 2026-04-01 (BRT — Playwright CLI, Config B)

**Purpose**: First formal TC spec + Playwright CLI verification for Config B (ignoreTZ=true, date-only) in BRT.
**Key outcomes**: Config B stores identical values to Config A; ignoreTZ inert for date-only fields.

- 2026-04-01 [TC-1-B-BRT Run 2](runs/tc-1-B-BRT-run-2.md) — BRT — PASS — Config B calendar popup via Playwright CLI; ignoreTZ=true has no effect on date-only storage
- 2026-04-01 [TC-2-A-BRT Run 2](runs/tc-2-A-BRT-run-2.md) — BRT — PASS — Config A typed input via Playwright CLI; matches popup, Bug #2 absent
- 2026-04-01 [TC-3-A-BRT-BRT Run 4](runs/tc-3-A-BRT-BRT-run-4.md) — BRT — PASS — Config A server reload via Playwright CLI; value survives save/reload
- 2026-04-01 [TC-3-B-BRT-BRT Run 1](runs/tc-3-B-BRT-BRT-run-1.md) — BRT — PASS — Config B server reload; ignoreTZ inert; same as 3-A-BRT-BRT
- 2026-04-01 [TC-3-B-BRT-IST Run 1](runs/tc-3-B-BRT-IST-run-1.md) — IST — PASS — Config B cross-TZ reload (BRT→IST); date-only survives; same as 3-A-BRT-IST
