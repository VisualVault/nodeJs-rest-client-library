# Date Handling Bug — Live Test Results

## Purpose

Live browser testing of date handling defects in the VisualVault Forms calendar field component. Tests were performed against the draft analysis in `draft-analysis.md` (same folder) which identifies 5 potential bugs across 8 user scenarios. This is part of a broader date handling investigation across all VV components — see `../CLAUDE.md` for full scope.

## Test Environment

| Parameter | Value |
|-----------|-------|
| **Browser Timezone** | America/Sao_Paulo (UTC-3), with Mumbai (UTC+5:30) override for cross-TZ tests |
| **Test Date** | 2026-03-27 |
| **Platform** | VisualVault FormViewer, Build 20260304.1 |
| **`useUpdatedCalendarValueLogic`** | `false` (default) — all tests run against legacy value logic |
| **`useLegacy`** | `false` on all tested fields — legacy control config not available |

## Related Files

- **Draft analysis**: `draft-analysis.md` (same folder) — initial code review, treat as hypothesis
- **This file**: `test-results.md` — live test evidence (source of truth for confirmed findings)
- **Overall context**: `../CLAUDE.md` — full investigation scope across all VV components

## Form URLs

| Form | URL | Notes |
|------|-----|-------|
| Test Form 1 (Subscription Packs) | Template creates new instance each load — use DataID URL to reopen | Original test, 2 date fields |
| Test Form 2 (DateTest) template | `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939` | Creates new form each load (000004, 000005, 000006...) |
| DateTest-000004 Rev 1 (saved) | `https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939` | Saved record used for reload and cross-TZ tests |

---

## Test Form 1: Subscription Packs (000-000190)

**Fields**: Start Date & End Date
**Config**: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`

### Test 1.1: Scenario 1 — Calendar Popup (Start Date)

**Action**: Opened calendar popup → selected March 15, 2026 → Time defaulted to 12:00 AM → clicked Set

| Metric | Value |
|--------|-------|
| Display in input | `03/15/2026` ✓ |
| Raw stored value (partition) | `"2026-03-15T00:00:00"` |
| GetFieldValue() return | `"2026-03-15T00:00:00.000Z"` |
| Expected from `e.toISOString()` | `"2026-03-15T03:00:00.000Z"` |
| Has Z suffix in raw | **NO** |

**Key Finding**: Value IS transformed between `toISOString()` and storage. The analysis claims `calChangeSetValue()` bypasses `getSaveValue()`, but the stored format `"2026-03-15T00:00:00"` matches the legacy `getSaveValue()` output exactly: `moment(input).format("YYYY-MM-DD[T]HH:mm:ss")`. This means the value goes through additional processing somewhere in the pipeline.

### Test 1.2: Scenario 2 — Typed Input (End Date)

**Action**: Clicked End Date input → typed 03/15/2026 segment by segment → Tab to confirm

| Metric | Value |
|--------|-------|
| Display in input | `03/15/2026` ✓ |
| Raw stored value (partition) | `"2026-03-15T00:00:00"` |
| GetFieldValue() return | `"2026-03-15T00:00:00.000Z"` |
| Has Z suffix in raw | **NO** |

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

| Metric | Before | After Round-Trip |
|--------|--------|-----------------|
| Raw stored | `"2026-03-15T00:00:00"` | `"2026-03-14T21:00:00"` |
| GetFieldValue | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14T21:00:00.000Z"` |
| Display | `03/15/2026` | **`03/14/2026`** |
| Shift | — | **-3 hours (= UTC-3 offset)** |

**CONFIRMED**: Bug #5 causes a **date shift on every round-trip**. The fake `[Z]` from `getCalendarFieldValue()` makes the value LOOK like UTC but it's actually local time. When `SetFieldValue` receives it back, JS interprets the Z as real UTC, shifting the date by the timezone offset.

**Severity**: Each call to `SetFieldValue(GetFieldValue("field"))` drifts the date by -3 hours. After 8 round-trips, the date would shift by a full day.

---

## Test Form 2: DateTest (DateTest-000004, 000005, 000006)

**8 fields with different configurations** (DataField10 added during session):

| Field | enableInitialValue | Mode | enableTime | ignoreTZ | useLegacy | Config ID |
|-------|:--:|------|:--:|:--:|:--:|:---------:|
| DataField1 | ✓ | Current Date | OFF | OFF | OFF | A |
| DataField2 | ✓ | Preset 3/1/2026 | OFF | OFF | OFF | A |
| DataField3 | ✓ | Current Date | OFF | OFF | OFF | A |
| DataField4 | ✓ | Preset 3/1/2026 | OFF | OFF | OFF | A |
| DataField5 | OFF | — | **ON** | **ON** | OFF | D |
| DataField6 | OFF | — | **ON** | OFF | OFF | C |
| DataField7 | OFF | — | OFF | OFF | OFF | A |
| DataField10 | OFF | — | OFF | **ON** | OFF | B |

*DataField1-4 have initial values (used for Scenario 5/6 testing). DataField5-7,10 are empty (used for popup/typed/API testing).*
*DataField8/9 do not exist — naming jumped from 7 to 10.*

### Test 2.0: Baseline — Initial Values on Form Load (Scenarios 5 & 6)

**Observation**: DataField1-4 store actual **Date objects** (not strings) in the partition.

| Field | Stored Type | ISO Value | Display |
|-------|------------|-----------|---------|
| DataField1 (Current Date) | Date object | `2026-03-27T20:02:51.472Z` | `03/27/2026` ✓ |
| DataField2 (Preset 3/1) | Date object | `2026-03-01T03:00:00.000Z` | `03/01/2026` ✓ |
| DataField3 (Current Date) | Date object | `2026-03-27T20:02:51.475Z` | `03/27/2026` ✓ |
| DataField4 (Preset 3/1) | Date object | `2026-03-01T03:00:00.000Z` | `03/01/2026` ✓ |
| DataField5 (empty) | string | `""` | `MM/dd/yyyy hh:mm a` |
| DataField6 (empty) | string | `""` | `MM/dd/yyyy hh:mm a` |
| DataField7 (empty) | string | `""` | `MM/dd/yyyy` |

**Key Findings for Initial Values**:
- **Scenario 6 (Current Date)**: Works correctly ✓ — `new Date()` stored as Date object with correct UTC time
- **Scenario 5 (Preset Date 3/1/2026)**: Stored as `2026-03-01T03:00:00.000Z` — midnight local BRT (UTC-3) in UTC. Display is correct.
  - **Risk**: On server save/reload, `parseDateString()` may strip Z and reinterpret, potentially shifting the date
- **GetFieldValue for date-only fields (DataField1-4)**: Returns the Date object's `.toString()` — e.g., `"Fri Mar 27 2026 17:02:51 GMT-0300 (Brasilia Standard Time)"`. This is neither ISO format nor the raw stored value. Developers using this value would get an unpredictable format.
- **After server save/reload**: Date-only initial value fields change from Date objects to strings in `"MM/dd/yyyy HH:mm:ss"` format (e.g., `"03/27/2026 20:02:51"`) — format changes but display remains correct

### Test 2.1: Scenario 1 — Calendar Popup (DataField5, 6, 7)

**Action**: Opened calendar popup on each field → selected March 15, 2026 → For DateTime fields: selected 12:00 AM on Time tab → clicked Set. For date-only field: clicked 15 directly (no Set button needed).

**All three fields displayed `03/15/2026` (with 12:00 AM for DateTime fields) after popup selection ✓**

#### Stored Values After Popup Selection

| Field | Config | Raw Stored | GetFieldValue() | Has Z |
|-------|--------|-----------|-----------------|:-----:|
| **DataField5** | eTime=✓ iTz=**✓** | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | NO |
| **DataField6** | eTime=✓ iTz=**✗** | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | NO |
| **DataField7** | eTime=✗ iTz=✗ | `"2026-03-15"` | `"2026-03-15"` | NO |

**Critical Finding — GetFieldValue differs by `ignoreTimezone` setting**:

- **DataField5 (ignoreTZ=true)**: `getCalendarFieldValue()` adds a **fake literal `[Z]`** via `moment(value).format("....[Z]")`.
  Returns `"2026-03-15T00:00:00.000Z"` — LOOKS like UTC midnight but is actually **local midnight**.

- **DataField6 (ignoreTZ=false)**: `getCalendarFieldValue()` does `new Date(value).toISOString()`.
  Returns `"2026-03-15T03:00:00.000Z"` — **correct UTC conversion** of local midnight in UTC-3.

- **DataField7 (date-only)**: Returns raw value `"2026-03-15"` — clean, no issues.

### Test 2.2: Bug #5 — Round-Trip Comparison Across Configs

**Action**: For each field, called `VV.Form.SetFieldValue(field, VV.Form.GetFieldValue(field))`

| Field | Config | Before Raw | GFV Used | After Raw | Display After | **Shifted?** |
|-------|--------|-----------|----------|-----------|---------------|:---:|
| **DataField5** | iTz=**✓** | `2026-03-15T00:00:00` | `2026-03-15T00:00:00.000Z` | `2026-03-14T21:00:00` | **03/14/2026 09:00 PM** | **YES -3h** |
| **DataField6** | iTz=**✗** | `2026-03-15T00:00:00` | `2026-03-15T03:00:00.000Z` | `2026-03-15T00:00:00` | 03/15/2026 12:00 AM | NO ✓ |
| **DataField7** | date-only | `2026-03-15` | `2026-03-15` | `2026-03-15` | 03/15/2026 | NO ✓ |

**Root Cause Analysis**:

- **DataField5 SHIFTS** because `ignoreTimezone=true` adds fake `[Z]` to local time.
  When `SetFieldValue` receives `"2026-03-15T00:00:00.000Z"`, JS parses it as **UTC midnight**.
  In UTC-3 browser, UTC midnight = March 14 21:00 local → stored as `"2026-03-14T21:00:00"`.

- **DataField6 is STABLE** because `ignoreTimezone=false` does a proper UTC conversion.
  `GetFieldValue` returns `"2026-03-15T03:00:00.000Z"` (real UTC for local midnight).
  When `SetFieldValue` receives this, JS correctly parses it back to March 15 00:00 local.

- **DataField7 is STABLE** because date-only format `"2026-03-15"` has no time or timezone to misinterpret.

---

## Summary of Confirmed Bugs

### Bug #5: CONFIRMED — Fake [Z] in GetFieldValue causes date shift

- **Severity**: HIGH
- **Affected config**: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`
- **NOT affected**: `ignoreTimezone=false` (correct UTC conversion) or `enableTime=false` (date-only, no time)
- **Reproduction**: `VV.Form.SetFieldValue("field", VV.Form.GetFieldValue("field"))`
- **Effect**: Date shifts by negative timezone offset per round-trip (-3h in UTC-3)
- **Root cause**: `getCalendarFieldValue()` uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` — adds literal `Z` to local time, making it appear as UTC
- **Visual proof**: March 15 12:00 AM → March 14 09:00 PM after one round-trip

### Bug #2: NOT REPRODUCED (with tested configs)

- Both popup and typed input produce identical stored values on all tested configs
- The popup path appears to go through the same transformation pipeline as typed input, contradicting the analysis

### Bug #1 & #4: PARTIALLY OBSERVED

- Raw values stored without Z suffix (`"2026-03-15T00:00:00"`) — legacy format
- Value goes through `getSaveValue()` from both popup and typed paths

---

## Pending Tests

- [x] Scenario 1 popup on DataField5 (enableTime=true, ignoreTZ=true)
- [x] Scenario 1 popup on DataField6 (enableTime=true, ignoreTZ=false)
- [x] Scenario 1 popup on DataField7 (enableTime=false, ignoreTZ=false)
- [x] Bug #5 round-trip on different field configs
- [x] Save form, open saved record in new tab, check for date shifts (Scenario 3)
- [x] Compare popup vs typed input on all configs
- [ ] Test with `useLegacy=true` to reproduce Bug #2 (no access to legacy config currently)
- [x] Cross-timezone simulation (live Mumbai test via DevTools override)

### Test 2.8: Cross-Timezone Impact Analysis (Simulated)

**Cannot override browser timezone programmatically**, but the impact is mathematically derivable from the stored value format.

The stored value `"2026-03-15T00:00:00"` (no Z) is **timezone-ambiguous**. Each browser interprets it as local midnight in ITS timezone:

#### Same stored value, different timezones:

| Timezone | Raw `"2026-03-15T00:00:00"` parsed as | Actual UTC moment | Display |
|----------|---------------------------------------|-------------------|---------|
| UTC-3 (Sao Paulo) | March 15, 00:00 BRT | `2026-03-15T03:00:00Z` | March 15 ✓ |
| UTC+0 (London) | March 15, 00:00 GMT | `2026-03-15T00:00:00Z` | March 15 ✓ |
| UTC+5:30 (Mumbai) | March 15, 00:00 IST | `2026-03-14T18:30:00Z` | March 15 ✓ |
| UTC-8 (LA) | March 15, 00:00 PST | `2026-03-15T08:00:00Z` | March 15 ✓ |

**Display is correct** in all timezones — the date shows March 15 everywhere because each browser treats it as local midnight. However, the **actual UTC moments differ**, which means:

- The same "March 15" in the database represents **different instants in time** depending on who entered it
- If User A (BRT) enters a date and User B (IST) reads it, they both see "March 15" but are referring to different UTC moments (8.5 hours apart)
- This is by design for `ignoreTimezone=true` (the field explicitly ignores timezone differences)

#### Bug #5 impact across timezones:

| Timezone | GetFieldValue (fake Z) | SetFieldValue interprets as | Shift per round-trip |
|----------|----------------------|---------------------------|---------------------|
| UTC-3 (BRT) | `"...T00:00:00.000Z"` | March 14, 21:00 local | **-3 hours** |
| UTC+0 (GMT) | `"...T00:00:00.000Z"` | March 15, 00:00 local | **0 hours** (no shift!) |
| UTC+5:30 (IST) | `"...T00:00:00.000Z"` | March 15, 05:30 local | **+5:30 hours** |
| UTC-8 (PST) | `"...T00:00:00.000Z"` | March 14, 16:00 local | **-8 hours** |

**Critical insight**: Bug #5 shift direction depends on the timezone:
- **Negative UTC offsets** (Americas): dates drift **backward** (earlier)
- **UTC+0**: **no drift** (fake Z happens to be correct!)
- **Positive UTC offsets** (Asia/Europe east): dates drift **forward** (later)
- Larger offsets = faster drift per round-trip

### Test 2.9: LIVE Cross-Timezone Test — Mumbai (UTC+5:30)

**Method**: Set Chrome DevTools timezone override to Mumbai (Asia/Calcutta). Reloaded saved record DateTest-000004 Rev 1 (originally saved in Sao Paulo).

#### Display on Reload (Mumbai)

All dates display correctly on initial load — no shift from just loading. Server returns the same strings and the browser interprets them as local midnight in Mumbai.

#### Round-Trip Test in Mumbai

| Field | Config | Before | GFV in Mumbai | After Round-Trip | Shift |
|-------|--------|--------|--------------|-----------------|-------|
| **DataField5** | eTime+iTz | `T00:00:00` | `T00:00:00.000Z` (fake Z) | **`T05:30:00`** | **+5:30h FORWARD** |
| **DataField6** | eTime, no iTz | `T00:00:00` | `T18:30:00.000Z` (real UTC: prev day) | `T00:00:00` | NONE ✓ |

**Visual**: DataField5 display changed from `03/15/2026 12:00 AM` to **`03/15/2026 05:30 AM`** after one round-trip.

**Mechanism in Mumbai (UTC+5:30)**:
1. Raw: `"2026-03-15T00:00:00"` (local midnight IST, no Z)
2. GetFieldValue adds fake Z: `"2026-03-15T00:00:00.000Z"` (looks like UTC midnight)
3. SetFieldValue: JS interprets as UTC midnight → March 15 05:30 AM IST
4. Stored: `"2026-03-15T05:30:00"` → shifted +5:30h

**After ~4 round-trips in Mumbai**: time crosses midnight → date shifts to **March 16**.
This is the **opposite direction** from Sao Paulo where dates drift backward.

#### Comparison: Same bug, different timezones

| Timezone | Offset | Drift per round-trip | Trips to shift 1 day |
|----------|--------|---------------------|---------------------|
| Sao Paulo (UTC-3) | -3h | -3h (backward) | 8 trips |
| London (UTC+0) | 0h | 0h (no drift!) | ∞ (never) |
| Mumbai (UTC+5:30) | +5.5h | +5:30h (forward) | ~4-5 trips |
| Tokyo (UTC+9) | +9h | +9h (forward) | ~3 trips |
| Los Angeles (UTC-8) | -8h | -8h (backward) | 3 trips |

### Test 2.7: Scenario 2 — Typed Input Comparison (DateTest-000006)

**Action**: Typed `03/15/2026` (+ `12:00 AM` for DateTime fields) into DataField5, 6, 7, and 10 via keyboard.

| Field | Config | Typed Raw | Popup Raw (Test 2.1) | Match? |
|-------|--------|----------|---------------------|:---:|
| DataField5 | eTime=✓ iTz=✓ | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | YES ✓ |
| DataField6 | eTime=✓ iTz=✗ | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | YES ✓ |
| DataField7 | eTime=✗ iTz=✗ | `"2026-03-15"` | `"2026-03-15"` | YES ✓ |
| DataField10 | eTime=✗ iTz=✓ | `"2026-03-15"` | `"2026-03-15"` | YES ✓ |

**Conclusion**: Bug #2 (inconsistent handlers) is **NOT reproduced** with `useLegacy=false`. Both `calChangeSetValue()` (popup) and `calChange()` (typed input) produce identical stored values across ALL tested configurations. The inconsistency described in the analysis may only exist with `useLegacy=true`.

### Test 2.5: DataField10 — Date-only + ignoreTimezone=true (New Field)

**Config**: `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`

| Test | Raw Stored | GetFieldValue | Shifted? |
|------|-----------|---------------|:---:|
| After SetFieldValue(March 15) | `"2026-03-15"` | `"2026-03-15"` | NO ✓ |
| After Round-Trip | `"2026-03-15"` | `"2026-03-15"` | NO ✓ |

**Finding**: `ignoreTimezone` has **no effect on date-only fields**. The `getCalendarFieldValue()` fake-Z path only triggers when `enableTime=true`.

### Test 2.6: Multiple Sequential Round-Trips on DataField5

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

### Test 2.3: Scenario 3 — Save and Reload (Server Round-Trip)

**Action**: Saved form DateTest-000004. Opened saved record (DataID `2ae985b5-...`) in new tab as Rev 1.

#### Server Return Values vs Original

| Field | Config | Saved Value | Server Returned | Display After Reload | **Shifted?** |
|-------|--------|------------|-----------------|---------------------|:---:|
| DataField1 | date-only, CurrentDate | Date `2026-03-27T20:02:51Z` | `"03/27/2026 20:02:51"` | `03/27/2026` | NO ✓ |
| DataField2 | date-only, Preset 3/1 | Date `2026-03-01T03:00:00Z` | `"03/01/2026 03:00:00"` | `03/01/2026` | NO ✓ |
| DataField5 | eTime=✓ iTz=✓ | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | `03/15/2026 12:00 AM` | NO ✓ |
| DataField6 | eTime=✓ iTz=✗ | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | `03/15/2026 12:00 AM` | NO ✓ |
| DataField7 | date-only | `"2026-03-15"` | `"2026-03-15"` | `03/15/2026` | NO ✓ |

**Key Findings**:

1. **No date shift on reload** — the server stores and returns the exact string without timezone processing. The `initCalendarValueV2()` processing on reload doesn't cause visible shifts in UTC-3.

2. **Format change for date-only initial value fields** — DataField1-4 were originally stored as Date objects but the server returned them in `"MM/dd/yyyy HH:mm:ss"` format. This format change is transparent to the user but represents a different internal representation.

3. **DataField2 (Preset 3/1/2026)** — Server stores `"03/01/2026 03:00:00"` (UTC time from local midnight). Despite the time being 03:00 (which was from the UTC-3 conversion), the display is still correct because `initCalendarValueV2()` with `enableTime=false` uses `.startOf("day")`.

4. **Potential issue for positive UTC offsets**: If a user in UTC+5:30 opened this same record, the value `"2026-03-15T00:00:00"` would be parsed as local midnight in their timezone. Since the server returns the same string regardless of timezone, the display would still show March 15. BUT the actual UTC moment would differ — UTC+5:30 would store `2026-03-14T18:30:00Z` vs UTC-3 storing `2026-03-15T03:00:00Z` for the "same" display date.

5. **`initCalendarValueV2()` hardcoded `enableTime=true`** (Bug #3 from analysis): For the server/database path, `enableTime` is hardcoded to `true`. This means date-only fields loaded from the server are processed as DateTime fields. We didn't observe a visible shift, but this could cause subtle issues when combined with other bugs.

### Test 2.4: Database Evidence — Actual Stored Values

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

| Field | How Value Was Created | DB Value | Time Zone of DB Value |
|-------|----------------------|----------|----------------------|
| DataField1 | `new Date().toISOString()` → Date obj | `8:02:51 PM` (20:02 UTC) | **UTC** |
| DataField2 | `parseDateString(preset)` → Date obj | `3:00:00 AM` (03:00 UTC) | **UTC** |
| DataField5 | popup → `getSaveValue()` strips Z | `12:00:00 AM` | **Local (BRT)** |
| DataField6 | popup → `getSaveValue()` strips Z | `12:00:00 AM` | **Local (BRT)** |
| DataField7 | popup → date-only string | `12:00:00 AM` | **Local (BRT)** |

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

## Complete Test Matrix

### Field Configuration Combinations

All tests should be run against each of these 8 configurations:

| Config ID | enableTime | ignoreTZ | useLegacy | Status |
|:---------:|:----------:|:--------:|:---------:|--------|
| A | false | false | false | **TESTED** (DataField7) |
| B | false | true | false | **TESTED** (DataField10) |
| C | true | false | false | **TESTED** (DataField6) |
| D | true | true | false | **TESTED** (DataField5) |
| E | false | false | true | NOT TESTED — no access to legacy config |
| F | false | true | true | NOT TESTED — no access to legacy config |
| G | true | false | true | NOT TESTED — no access to legacy config |
| H | true | true | true | NOT TESTED — no access to legacy config |

### Category 1: User Input — Calendar Popup (Scenario 1)

Select a date via popup calendar. For DateTime fields, select time then click Set.

| Test ID | Config | TZ | Date Selected | Expected Raw | Status |
|---------|:------:|:--:|---------------|-------------|--------|
| 1-A-BRT | A | BRT | Mar 15 | `"2026-03-15"` | DONE ✓ |
| 1-B-BRT | B | BRT | Mar 15 | `"2026-03-15"` | DONE ✓ |
| 1-C-BRT | C | BRT | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` | DONE ✓ |
| 1-D-BRT | D | BRT | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` | DONE ✓ |
| 1-E-BRT | E | BRT | Mar 15 | | NOT TESTED (legacy) |
| 1-F-BRT | F | BRT | Mar 15 | | NOT TESTED (legacy) |
| 1-G-BRT | G | BRT | Mar 15 12:00 AM | | NOT TESTED (legacy) |
| 1-H-BRT | H | BRT | Mar 15 12:00 AM | | NOT TESTED (legacy) |

### Category 2: User Input — Typed Input (Scenario 2)

Type a date directly in the input field.

| Test ID | Config | TZ | Date Typed | Expected Raw | Status |
|---------|:------:|:--:|-----------|-------------|--------|
| 2-A-BRT | A | BRT | 03/15/2026 | `"2026-03-15"` | DONE ✓ (matches popup) |
| 2-B-BRT | B | BRT | 03/15/2026 | `"2026-03-15"` | DONE ✓ (matches popup) |
| 2-C-BRT | C | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` | DONE ✓ (matches popup) |
| 2-D-BRT | D | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` | DONE ✓ (matches popup) |
| 2-E-BRT | E | BRT | 03/15/2026 | | NOT TESTED (legacy) |
| 2-F-BRT | F | BRT | 03/15/2026 | | NOT TESTED (legacy) |
| 2-G-BRT | G | BRT | 03/15/2026 12:00 AM | | NOT TESTED (legacy) |
| 2-H-BRT | H | BRT | 03/15/2026 12:00 AM | | NOT TESTED (legacy) |

### Category 3: Server Reload (Scenario 3)

Save form, open saved record in new tab. Compare displayed dates with original.

| Test ID | Config | Save TZ | Load TZ | Status |
|---------|:------:|:-------:|:-------:|--------|
| 3-A-BRT-BRT | A | BRT | BRT | DONE ✓ (no shift) |
| 3-C-BRT-BRT | C | BRT | BRT | DONE ✓ (no shift) |
| 3-D-BRT-BRT | D | BRT | BRT | DONE ✓ (no shift) |
| 3-D-BRT-IST | D | BRT | IST | DONE ✓ (display OK, but GFV differs) |
| 3-A-BRT-IST | A | BRT | IST | NOT TESTED |
| 3-C-BRT-IST | C | BRT | IST | NOT TESTED |
| 3-D-IST-BRT | D | IST | BRT | NOT TESTED (save from Mumbai, reload in BRT) |
| 3-ALL-E-H | E-H | any | any | NOT TESTED (legacy) |

### Category 4: URL Parameters (Scenario 4)

Open form with date in URL query string (requires enableQListener=true).

| Test ID | Config | URL Value | Expected Behavior | Status |
|---------|:------:|----------|-------------------|--------|
| 4-D-Z | D | `?field=2026-03-15T00:00:00.000Z` | parseDateString strips Z → local time | NOT TESTED |
| 4-D-noZ | D | `?field=2026-03-15T00:00:00` | parseDateString treats as local | NOT TESTED |
| 4-C-Z | C | `?field=2026-03-15T00:00:00.000Z` | parseDateString strips Z | NOT TESTED |
| 4-A-dateonly | A | `?field=2026-03-15` | should show March 15 | NOT TESTED |
| 4-D-midnight-IST | D | `?field=2026-03-15T00:00:00.000Z` in IST | May shift to Mar 15 05:30 | NOT TESTED |

*Note: Requires fields with enableQListener=true to test*

### Category 5: Preset Date Default (Scenario 5)

Form template with a specific preset date (e.g., "March 1, 2026").

| Test ID | Config | Preset | TZ | Expected | Status |
|---------|:------:|--------|:--:|----------|--------|
| 5-A-BRT | A (eT=f,iTz=f) | 3/1/2026 | BRT | `"2026-03-01"` or Date obj | DONE ✓ (DataField2) |
| 5-B-BRT | B (eT=f,iTz=t) | 3/1/2026 | BRT | | NOT TESTED |
| 5-C-BRT | C (eT=t,iTz=f) | 3/1/2026 | BRT | | NOT TESTED (need field with preset+time) |
| 5-D-BRT | D (eT=t,iTz=t) | 3/1/2026 | BRT | | NOT TESTED (need field with preset+time) |
| 5-A-IST | A | 3/1/2026 | IST | Should still show March 1 | NOT TESTED |
| 5-ALL-legacy | E-H | 3/1/2026 | any | | NOT TESTED (legacy) |

### Category 6: Current Date Default (Scenario 6)

Form template with "Current Date" default.

| Test ID | Config | TZ | Expected | Status |
|---------|:------:|:--:|----------|--------|
| 6-A-BRT | A (eT=f,iTz=f) | BRT | Date obj with current UTC time | DONE ✓ (DataField1) |
| 6-B-BRT | B (eT=f,iTz=t) | BRT | | NOT TESTED |
| 6-C-BRT | C (eT=t,iTz=f) | BRT | | NOT TESTED (need field with currentDate+time) |
| 6-D-BRT | D (eT=t,iTz=t) | BRT | | NOT TESTED (need field with currentDate+time) |
| 6-A-IST | A | IST | Should show today in IST | NOT TESTED |
| 6-ALL-legacy | E-H | any | | NOT TESTED (legacy) |

### Category 7: Developer API — SetFieldValue (Scenario 7)

Different input formats passed to `VV.Form.SetFieldValue()`.

| Test ID | Config | Input Value | Input Type | Expected Stored | Status |
|---------|:------:|------------|-----------|-----------------|--------|
| 7-D-dateObj | D | `new Date(2026,2,15)` | Date object | `"2026-03-15T00:00:00"` | DONE ✓ |
| 7-D-isoZ | D | `"2026-03-15T00:00:00.000Z"` | ISO with Z | `"2026-03-14T21:00:00"` (shifted!) | DONE ✓ |
| 7-D-isoNoZ | D | `"2026-03-15T00:00:00"` | ISO without Z | | NOT TESTED |
| 7-D-dateOnly | D | `"2026-03-15"` | Date string | | NOT TESTED |
| 7-D-usFormat | D | `"03/15/2026"` | US format | | NOT TESTED |
| 7-D-usFormatTime | D | `"03/15/2026 12:00:00 AM"` | US + time | | NOT TESTED |
| 7-D-epoch | D | `1773784800000` | Unix timestamp | | NOT TESTED |
| 7-C-isoZ | C | `"2026-03-15T00:00:00.000Z"` | ISO with Z | | NOT TESTED |
| 7-C-isoNoZ | C | `"2026-03-15T00:00:00"` | ISO without Z | | NOT TESTED |
| 7-A-dateOnly | A | `"2026-03-15"` | Date string | | NOT TESTED |
| 7-A-isoZ | A | `"2026-03-15T00:00:00.000Z"` | ISO with Z | | NOT TESTED |
| 7-ALL-legacy | E-H | various | various | | NOT TESTED (legacy) |

### Category 8: Developer API — GetFieldValue (Scenario 8)

Return format for each configuration.

| Test ID | Config | Stored Raw | Expected Return | Status |
|---------|:------:|-----------|----------------|--------|
| 8-A | A | `"2026-03-15"` | `"2026-03-15"` | DONE ✓ |
| 8-B | B | `"2026-03-15"` | `"2026-03-15"` | DONE ✓ |
| 8-C-BRT | C | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` (real UTC) | DONE ✓ |
| 8-C-IST | C | `"2026-03-15T00:00:00"` | `"2026-03-14T18:30:00.000Z"` (real UTC from IST) | DONE ✓ |
| 8-D-BRT | D | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (FAKE Z!) | DONE ✓ |
| 8-D-IST | D | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (FAKE Z!) | DONE ✓ |
| 8-E through 8-H | E-H | various | | NOT TESTED (legacy) |
| 8-updated | any with `useUpdatedCalendarValueLogic=true` | any | raw value unchanged | NOT TESTED |

### Category 9: Round-Trip — SetFieldValue(GetFieldValue())

| Test ID | Config | TZ | Trips | Expected Shift | Status |
|---------|:------:|:--:|:-----:|---------------|--------|
| 9-D-BRT-1 | D | BRT | 1 | -3h | DONE ✓ |
| 9-D-BRT-8 | D | BRT | 8 | -24h (1 day) | DONE ✓ |
| 9-D-BRT-10 | D | BRT | 10 | -30h | DONE ✓ |
| 9-D-IST-1 | D | IST | 1 | +5:30h | DONE ✓ |
| 9-D-IST-5 | D | IST | 5 | +27:30h (crosses day) | NOT TESTED |
| 9-C-BRT-1 | C | BRT | 1 | 0 (stable) | DONE ✓ |
| 9-C-IST-1 | C | IST | 1 | 0 (stable) | DONE ✓ |
| 9-A-any | A | any | 1 | 0 (stable) | DONE ✓ |
| 9-B-any | B | any | 1 | 0 (stable) | DONE ✓ |
| 9-ALL-legacy | E-H | any | 1 | unknown | NOT TESTED (legacy) |

### Category 10: Web Service / External Script — SetFieldValue from Code

Simulates a scheduled script, form button event, or web service call setting date values.

| Test ID | Config | Source Format | Value | Expected Result | Status |
|---------|:------:|-------------|-------|----------------|--------|
| 10-D-ws-isoZ | D | Web service JSON | `"2026-03-15T00:00:00.000Z"` | Stored as local time? Shifted? | NOT TESTED |
| 10-D-ws-isoNoZ | D | Web service JSON | `"2026-03-15T00:00:00"` | Stored as-is? | NOT TESTED |
| 10-D-ws-dateOnly | D | Web service JSON | `"2026-03-15"` | | NOT TESTED |
| 10-D-ws-dotnet | D | .NET DateTime | `"2026-03-15T00:00:00.000+00:00"` | | NOT TESTED |
| 10-D-ws-epoch | D | Epoch ms | `1773784800000` | | NOT TESTED |
| 10-C-ws-isoZ | C | Web service JSON | `"2026-03-15T00:00:00.000Z"` | | NOT TESTED |
| 10-A-ws-isoZ | A | Web service JSON | `"2026-03-15T00:00:00.000Z"` | | NOT TESTED |
| 10-A-ws-dateOnly | A | Web service JSON | `"2026-03-15"` | | NOT TESTED |
| 10-D-ws-midnight-cross | D | Web service | `"2026-03-15T02:00:00.000Z"` | In BRT: Mar 14 23:00 (crosses midnight!) | NOT TESTED |
| 10-D-script-scheduled | D | Scheduled script | `response.data.date` (various) | | NOT TESTED |
| 10-D-script-button | D | Form button script | `VV.Form.SetFieldValue(...)` | Same as Cat 7 | NOT TESTED |

### Category 11: Cross-Timezone — Multi-User Scenarios

| Test ID | Action | TZ 1 | TZ 2 | Expected Issue | Status |
|---------|--------|:----:|:----:|---------------|--------|
| 11-save-BRT-load-IST | Save form in BRT, load in IST | BRT | IST | Display OK, but DB query mismatch | PARTIALLY TESTED |
| 11-save-IST-load-BRT | Save in IST, load in BRT | IST | BRT | | NOT TESTED |
| 11-roundtrip-cross | Save BRT, load IST, round-trip, save, load BRT | BRT→IST→BRT | | Compound drift from different offsets | NOT TESTED |
| 11-concurrent-edit | User A (BRT) and B (IST) edit same record | BRT | IST | Overwrite with different UTC moment | NOT TESTED |
| 11-report-cross | Query DB for dates entered from different TZs | mixed | — | Inconsistent query results | IDENTIFIED (see Test 2.4) |
| 11-load-UTC0 | Load saved record in London (UTC+0) | — | UTC+0 | No fake-Z drift (Z happens to be correct) | NOT TESTED |
| 11-load-PST | Load saved record in San Francisco (UTC-8) | — | PST | Large backward drift on round-trip | NOT TESTED |
| 11-load-Tokyo | Load saved record in Tokyo (UTC+9) | — | JST | Large forward drift on round-trip | NOT TESTED |

### Category 12: Edge Cases

| Test ID | Description | Config | Value | Expected Issue | Status |
|---------|------------|:------:|-------|---------------|--------|
| 12-near-midnight-1 | Date at 00:30 UTC | D | `"2026-03-15T00:30:00.000Z"` | In BRT: Mar 14 21:30 (day shifts!) | NOT TESTED |
| 12-near-midnight-2 | Date at 23:00 local | D | Set 11 PM local | | NOT TESTED |
| 12-dst-transition | Date on DST change day | D | Mar 8 2026 (US DST) | Potential double-shift | NOT TESTED |
| 12-dst-brazil | Date on Brazil DST | D | (Brazil no longer uses DST) | N/A | SKIP |
| 12-year-boundary | Dec 31 → Jan 1 shift | D | `"2026-01-01T00:00:00"` | In UTC-3: round-trip → Dec 31 21:00 | NOT TESTED |
| 12-leap-day | Feb 29 on leap year | D | `"2028-02-29T00:00:00"` | In UTC-3: → Feb 28 21:00 | NOT TESTED |
| 12-empty-value | Empty/null date | all | `""` or `null` | GetFieldValue behavior | PARTIALLY TESTED |
| 12-invalid-string | Invalid date string | D | `"not-a-date"` | Error handling | NOT TESTED |
| 12-far-future | Year 2099 | D | `"2099-12-31T00:00:00"` | | NOT TESTED |
| 12-pre-epoch | Year 1969 | D | `"1969-12-31T00:00:00"` | Negative epoch | NOT TESTED |

### Category 13: Database Verification

| Test ID | Description | Status |
|---------|------------|--------|
| 13-initial-values | DB values for initial/preset dates | DONE ✓ (UTC times in DB) |
| 13-user-input | DB values for popup/typed dates | DONE ✓ (local times in DB) |
| 13-after-roundtrip | DB values after Bug #5 drift | NOT TESTED (save after round-trip, check DB) |
| 13-cross-tz-save | DB values when saved from Mumbai | NOT TESTED |
| 13-ws-input | DB values when set via web service | NOT TESTED |
| 13-query-consistency | SQL query returns matching dates for same logical date entered from different TZs | NOT TESTED |

---

## Test Coverage Summary

| Category | Total Tests | Done | Not Tested | Blocked (Legacy) |
|----------|:----------:|:----:|:----------:|:----------------:|
| 1. Calendar Popup | 8 | 4 | 0 | 4 |
| 2. Typed Input | 8 | 4 | 0 | 4 |
| 3. Server Reload | 8+ | 4 | 4+ | 4 |
| 4. URL Parameters | 5+ | 0 | 5+ | 0 |
| 5. Preset Date | 6+ | 1 | 5+ | 4 |
| 6. Current Date | 6+ | 1 | 5+ | 4 |
| 7. SetFieldValue formats | 12+ | 2 | 10+ | 4 |
| 8. GetFieldValue return | 8+ | 6 | 2+ | 4 |
| 9. Round-Trip | 10+ | 7 | 3+ | 4 |
| 10. Web Service | 10+ | 0 | 10+ | 0 |
| 11. Cross-Timezone | 7+ | 2 | 5+ | 0 |
| 12. Edge Cases | 10+ | 1 | 9+ | 0 |
| 13. Database | 6 | 2 | 4 | 0 |
| **TOTAL** | **~104+** | **~34** | **~62+** | **~32** |

### Priority for Next Testing Session

1. **HIGH — Category 10 (Web Service)**: This is how most production data enters the system. Testing `SetFieldValue` with ISO+Z strings from web services is critical since that's the most common developer pattern.
2. **HIGH — Category 7 (SetFieldValue formats)**: Testing different input string formats to understand which are safe and which trigger the bug.
3. **MEDIUM — Category 4 (URL Parameters)**: Requires enableQListener fields. Tests the `parseDateString` Z-stripping path.
4. **MEDIUM — Category 12 (Edge Cases)**: Year/day boundaries, DST transitions.
5. **MEDIUM — Category 11 (Cross-TZ multi-user)**: Save from one TZ, edit from another.
6. **LOW — Legacy configs (E-H)**: Blocked until `useLegacy=true` access is available. These may reveal Bug #2.

---

## Session Context (for future pickup)

### What was tested

Tests were run interactively using Chrome browser automation (Claude-in-Chrome MCP extension). The browser navigated to live VisualVault FormViewer instances, interacted with calendar popups, typed dates, and executed JavaScript to inspect internal state (`VV.Form.VV.FormPartition.getValueObjectValue()`, `VV.Form.GetFieldValue()`, `VV.Form.SetFieldValue()`).

### What was NOT tested

- **`useLegacy=true`** — Emanuel does not currently have access to enable this setting. This is the main gap — the analysis document's Bug #2 (inconsistent popup vs typed handlers) may only manifest with legacy mode.
- **`useUpdatedCalendarValueLogic=true`** — This flag was `false`/undefined on all fields. The updated logic path in `getSaveValue` and `getCalendarFieldValue` was never exercised.
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
VV.Form.VV.FormPartition.fieldMaster  // all field definitions
VV.Form.VV.FormPartition.getValueObjectValue('DataField5')  // raw stored value
VV.Form.GetFieldValue('DataField5')  // processed return value
VV.Form.SetFieldValue('DataField5', value)  // set value
```

### Note on test numbering

Tests were written in execution order, not numerical order. The sequence in the document is:
2.0 (baseline) → 2.1 (popup) → 2.2 (round-trip) → 2.8 (cross-TZ analysis) → 2.9 (live Mumbai) → 2.7 (typed input) → 2.5 (DataField10) → 2.6 (multiple trips) → 2.3 (reload) → 2.4 (DB evidence). This reflects the actual testing progression.
