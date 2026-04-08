# FORM-BUG-5: Developer API Returns Corrupted Date Values, Causing Progressive Drift

## What Happens

When a developer script reads a date/time value from a calendar field using `VV.Form.GetFieldValue()` and writes it back using `VV.Form.SetFieldValue()`, **the stored date silently shifts by the user's timezone offset** — every single time. The shift compounds: after enough read-write cycles, dates cross day boundaries, month boundaries, and even year boundaries. A script running in São Paulo (UTC-3) that reads and writes back January 1st midnight will store December 31st 21:00 — the date has moved to the previous year in a single operation.

This bug is silent — no error, no warning. The returned value looks like a perfectly valid date string.

---

## When This Applies

Three conditions must all be true:

### 1. The field must be date+time, ignore-timezone, non-legacy

Only one specific combination of field configuration flags triggers this bug: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`. In the test form, this is **Field5** (Config D). No other configuration triggers this bug.

Why only this combination: the internal function that transforms `GetFieldValue()` output has branching logic based on these flags. Date-only fields and legacy fields return the raw value unchanged (safe). DateTime + `ignoreTimezone=false` applies a real UTC conversion (different behavior, see [FORM-BUG-4](bug-4-legacy-save-format.md)). Only DateTime + `ignoreTimezone=true` + non-legacy hits the defective code path that appends a non-functional timezone marker.

### 2. The value must pass through a GetFieldValue → SetFieldValue round-trip

The corruption happens specifically when a developer script reads a value with `GetFieldValue()` and writes it back with `SetFieldValue()`. This is a common pattern in validation, copying, and reformatting logic. A single read without write-back does not corrupt the stored value — the literal Z only causes damage when it's fed back into `SetFieldValue()`, which trusts the Z and reinterprets the value.

### 3. The user's timezone must not be UTC+0

At UTC+0, the non-functional timezone marker happens to be numerically correct (local time equals UTC), so the drift is zero. The bug is structurally present but invisible. At any other offset, the drift is proportional to the distance from UTC:

| Timezone              | UTC Offset | Drift per Round-Trip | Trips to Lose a Full Day | Single Trip Crosses Year? (Jan 1) |
| --------------------- | ---------- | -------------------- | ------------------------ | --------------------------------- |
| BRT (São Paulo)       | UTC-3      | -3 hours             | 8                        | **Yes** (00:00 → prev day 21:00)  |
| EST (New York)        | UTC-5      | -5 hours             | ~5                       | **Yes**                           |
| PST/PDT (Los Angeles) | UTC-7/-8   | -7 or -8 hours       | ~3                       | **Yes**                           |
| IST (Mumbai)          | UTC+5:30   | +5:30 hours          | ~4                       | No (drifts forward)               |
| JST (Tokyo)           | UTC+9      | +9 hours             | ~3                       | No (drifts forward)               |
| UTC+0 (London winter) | UTC+0      | **0 hours**          | Never                    | No                                |

---

## Severity: HIGH

Progressive data corruption with no user-visible warning. Drift is proportional to timezone offset and compounds on every read-write cycle. A single cycle can cross a year boundary. Developers testing from UTC+0 environments will never see the drift — the bug is invisible at UTC+0.

**Related support ticket**: Freshdesk #124697 (WADNR-10407) reports time mutation when opening forms created via the `postForms` REST API. FORM-BUG-5 is part of the chain: the API stores dates with real UTC markers, the form strips them on load, and `GetFieldValue()` adds the literal Z back — making the problem worse if scripts then write the value back.

---

## How to Reproduce

### 1. Observe the Literal Z

```javascript
// Set a value on Field5 (Config D: DateTime, ignoreTZ=true, non-legacy)
VV.Form.SetFieldValue('Field5', '2026-03-15T00:00:00');

// Read it back via the public API
VV.Form.GetFieldValue('Field5');
// Returns: "2026-03-15T00:00:00.000Z"  ← literal Z appended

// Compare with the actual stored value (internal API)
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// Returns: "2026-03-15T00:00:00"  ← no Z (this is what's really stored)
```

### 2. Demonstrate Progressive Drift (São Paulo, UTC-3)

```javascript
// Round-trip 1
VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// "2026-03-14T21:00:00" (shifted -3h)

// Round-trip 2
VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// "2026-03-14T18:00:00" (shifted -6h total)
```

### 3. Demonstrate Year Boundary Crossing

```javascript
VV.Form.SetFieldValue('Field5', '2026-01-01T00:00:00');
VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// São Paulo: "2025-12-31T21:00:00" ← crossed into previous year
```

**Expected**: The stored value should not change after a read-write round-trip.
**Actual**: The value shifts by the user's UTC offset on every cycle.

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## The Problem in Detail

### What the Code Does

The function responsible for transforming `GetFieldValue()` output uses the moment.js date library to format the value:

```javascript
const format = 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]';
return moment(value).format(format);
```

In moment.js, square brackets `[...]` create **literal characters** — they output the enclosed text exactly as-is, regardless of the actual timezone. So `[Z]` always outputs the character `Z`, even when the value is in São Paulo time. This is different from `Z` without brackets, which would output the actual timezone offset (e.g., `-03:00`).

The result: a local-time value with an incorrect UTC marker. `"2026-03-15T00:00:00.000Z"` appears to be midnight UTC but is actually midnight São Paulo (which is 03:00 UTC).

### How the Drift Loop Works

```text
STARTING STATE: Field stores "2026-03-15T00:00:00" (midnight local, no Z — correct)

STEP 1 — Script calls GetFieldValue():
  Internal function appends literal [Z]:
  → Returns "2026-03-15T00:00:00.000Z"
  (This CLAIMS to be UTC midnight, but it's actually São Paulo midnight)

STEP 2 — Script calls SetFieldValue("2026-03-15T00:00:00.000Z"):
  Platform sees the Z and interprets the value as UTC
  → Converts UTC midnight to São Paulo local: March 14, 21:00
  → Stores "2026-03-14T21:00:00"

RESULT: The date shifted -3 hours (São Paulo's offset from UTC)
```

Each cycle repeats the same process, compounding the shift:

| Cycle | Stored Value          | Cumulative Shift  |
| ----- | --------------------- | ----------------- |
| 0     | `2026-03-15T00:00:00` | —                 |
| 1     | `2026-03-14T21:00:00` | -3 hours          |
| 2     | `2026-03-14T18:00:00` | -6 hours          |
| 3     | `2026-03-14T15:00:00` | -9 hours          |
| ...   | ...                   | ...               |
| 8     | `2026-03-14T00:00:00` | -24 hours (1 day) |

In Mumbai (UTC+5:30), the drift goes the opposite direction: +5:30 hours per cycle.

### Proof That the Z Is a Literal Character (TZ-Invariance Test)

If the `Z` were a real UTC marker, reading the same stored value from São Paulo and Mumbai would produce different results (because they're at different UTC offsets). Both produced **identical output** — proving the Z is a literal character, not a real timezone conversion:

| Stored Value            | São Paulo GetFieldValue      | Mumbai GetFieldValue         | Identical? |
| ----------------------- | ---------------------------- | ---------------------------- | ---------- |
| `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | **Yes**    |

As a control, Config C (`ignoreTimezone=false`) uses real UTC conversion and produced **different** results from the two timezones:

| Stored Value            | São Paulo GetFieldValue      | Mumbai GetFieldValue         | Identical? |
| ----------------------- | ---------------------------- | ---------------------------- | ---------- |
| `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | **No**     |

### Relationship to Other Bugs

| Bug        | Relationship                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FORM-BUG-1 | **Compounds in FillinAndRelate chains** (2026-04-08). When `GetFieldValue()` output with fake `.000Z` is passed to another form via URL params, FORM-BUG-1's Z-stripping fires on the receiving form. The `.000` millisecond residue (left after stripping `Z`) causes `new Date()` to parse the value as UTC instead of local in V8, producing a shift equal to the user's TZ offset. D→D same-config transfer: BRT shifts midnight to 21:00 Mar 14 (-3h); IST shifts to 05:30 (+5:30h). D→C cross-config: fake Z treated as real UTC, wrong moment stored. Save/reload confirms corruption is permanent. See [FORM-BUG-1 § FillinAndRelate](bug-1-timezone-stripping.md#interaction-with-form-bug-5-in-fillinandrelate-chains-2026-04-08). |
| FORM-BUG-4 | FORM-BUG-4 strips the real Z when saving. FORM-BUG-5 adds a literal Z when reading. Together they create an asymmetric round-trip that shifts the value each cycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| FORM-BUG-6 | Same function, same code path. FORM-BUG-6 is what happens when this function receives an empty value — it returns `"Invalid Date"` instead of `""`. Both bugs are fixed by the same code change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| FORM-BUG-7 | Independent mechanism. FORM-BUG-7 affects date-only fields; FORM-BUG-5 affects date+time fields. They never overlap on the same field.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## Verification

Verified on the demo environment at `vvdemo.visualvault.com` across São Paulo/BRT (UTC-3), Mumbai/IST (UTC+5:30), and London/UTC+0 using both manual browser testing and automated Playwright scripts.

GetFieldValue output tested across all 8 field configs × 3 timezones: 18 of 19 tests complete — 12 PASS, 6 FAIL. All 6 failures are FORM-BUG-5 on Config D, confirmed across all three timezones. The UTC+0 test is structurally wrong (literal Z is present) but numerically invisible — still counted as a failure because the mechanism is incorrect.

Round-trip drift tested across 5 timezones: 20 of 20 complete — 9 PASS, 11 FAIL. Drift confirmed exactly proportional to timezone offset: BRT -3h, IST +5:30h, UTC+0 0h, PDT -7h, JST +9h. Year boundary crossing confirmed in São Paulo (Jan 1 → Dec 31 in single cycle).

TZ-invariance proof (detailed in Problem in Detail above) independently confirmed via automated Playwright testing, with Config C as a control producing the expected different results across timezones.

This bug report is backed by a supporting test repository containing Playwright automation scripts, per-test results, and raw test data. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The defective code is shown in [What the Code Does](#what-the-code-does) above. This section adds file locations and call chain.

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.getCalendarFieldValue()` — line ~104114

The function branches based on field configuration:

- `useUpdatedCalendarValueLogic = true` (V2): returns raw value — no bug
- `useLegacy = true`: returns raw value — no bug
- `enableTime = true` + `ignoreTimezone = false`: applies real UTC conversion (`new Date(value).toISOString()`) — different behavior, see FORM-BUG-4
- `enableTime = true` + `ignoreTimezone = true` + `useLegacy = false`: **the defective branch** — appends literal `[Z]` via moment.js format string at line ~104119

**Call chain:**

```text
VV.Form.GetFieldValue('Field5')
  → getValueObjectValue()            Reads raw stored value: "2026-03-15T00:00:00"
  → getCalendarFieldValue()          Transforms for output (FORM-BUG-5 adds literal Z here)
  → Returns "2026-03-15T00:00:00.000Z" to the caller
```

The moment.js `[Z]` literal escape is a well-known pitfall — `[Z]` outputs the character "Z" regardless of timezone, unlike `Z` (without brackets) which would output the actual offset like `-03:00`.

---

## Appendix: Field Configuration Reference

The test form has 8 field configurations referred to by letter throughout this document:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Description                          |
| ------ | ------- | ---------- | -------------- | --------- | ------------------------------------ |
| A      | Field7  | —          | —              | —         | Date-only baseline                   |
| B      | Field10 | —          | ✅             | —         | Date-only + ignoreTZ                 |
| C      | Field6  | ✅         | —              | —         | DateTime UTC (control)               |
| D      | Field5  | ✅         | ✅             | —         | DateTime + ignoreTZ **(FORM-BUG-5)** |
| E      | Field12 | —          | —              | ✅        | Legacy date-only                     |
| F      | Field11 | —          | ✅             | ✅        | Legacy date-only + ignoreTZ          |
| G      | Field14 | ✅         | —              | ✅        | Legacy DateTime                      |
| H      | Field13 | ✅         | ✅             | ✅        | Legacy DateTime + ignoreTZ           |

---

## Workarounds and Fix Recommendations

See [bug-5-fix-recommendations.md](bug-5-fix-recommendations.md) for workarounds (including the recommended `GetDateObjectFromCalendar()` alternative), proposed code fix, and fix impact assessment.
