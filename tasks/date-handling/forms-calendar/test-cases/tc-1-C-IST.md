# TC-1-C-IST — Config C, Calendar Popup, IST: local midnight stored (same as BRT); GetFieldValue returns correct UTC

## Environment Specs

| Parameter               | Required Value                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`    |
| **Scenario**            | March 15, 2026, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00.000Z` UTC |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

**P1 — Set system timezone to `Asia/Calcutta`:**

macOS:

```bash
sudo systemsetup -settimezone Asia/Calcutta
```

Windows (run as Administrator):

```bat
tzutil /s "India Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "India Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone Asia/Calcutta
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone in DevTools console:**

```javascript
new Date().toString();
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify V1 is the active code path** (run in DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 behavior before continuing
```

**P6 — Locate the target field by configuration** (run in DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["DataField6"]
// Record the returned name — use it as <FIELD_NAME> in Steps 6–10
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                                                                                         | Test Data                                                            | Expected Result                                                                | ✓   |
| --- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --- |
| 1   | Complete setup                                                                                                 | See Preconditions P1–P6                                              | All P1–P6 checks pass                                                          | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6)                                            | —                                                                    | Date picker popup opens on March 2026, Date tab active                         | ☐   |
| 3   | Navigate to March 2026 if not already shown                                                                    | —                                                                    | March 2026 calendar grid displayed                                             | ☐   |
| 4   | Scroll the page (using scrollbar or scroll within the date grid) to reveal the full popup including Set button | —                                                                    | Full calendar grid (days 1–31) and Set/Cancel buttons visible                  | ☐   |
| 5   | Click day **15**                                                                                               | —                                                                    | Popup advances to Time tab; time header shows `12:00 AM`                       | ☐   |
| 6   | Verify time header before clicking Set                                                                         | —                                                                    | Time header reads `12:00 AM` — do not click Set if any other time is shown     | ☐   |
| 7   | Click **Set**                                                                                                  | —                                                                    | Popup closes; field input shows `03/15/2026 12:00 AM`                          | ☐   |
| 8   | Record display value shown in field                                                                            | —                                                                    | `03/15/2026 12:00 AM`                                                          | ☐   |
| 9   | Capture raw stored value                                                                                       | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15T00:00:00"` — local midnight IST stored (same format as BRT)       | ☐   |
| 10  | Capture GetFieldValue return                                                                                   | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-14T18:30:00.000Z"` — correct UTC (IST midnight = UTC 18:30 prev day) | ☐   |
| 11  | Capture timezone reference                                                                                     | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active                             | ☐   |

> **Note on Step 4 — popup scroll behavior:** The Set button is below the time picker columns and may not be visible without scrolling. Scroll the PAGE (not inside the time picker) by scrolling within the date grid area of the popup or using the browser scrollbar. Do NOT scroll inside the Hour/Minute/AM-PM columns — that changes the selected time.
>
> **Note on Step 5:** After clicking a day, the popup automatically switches to the Time tab. The default time is 12:00 AM. Do not interact with the time columns unless the header shows something other than `12:00 AM`.
>
> **Note on Step 9 — prediction correction:** The original matrix predicted `"2026-03-14T18:30:00"` (UTC offset). The actual stored value is `"2026-03-15T00:00:00"` (local midnight). `getSaveValue()` formats as local time, not UTC.

---

## Fail Conditions

**FAIL-1 (Wrong storage format — UTC offset stored instead of local midnight):**
Raw stored value is `"2026-03-14T18:30:00"` (the UTC equivalent of IST midnight).

- Interpretation: `getSaveValue()` behavior changed — it is now stripping Z from `toISOString()` output instead of formatting local time. This would indicate a regression. Verify the VV build number matches 20260304.1 and compare with BRT behavior (1-C-BRT also stores `"2026-03-15T00:00:00"` in BRT — if that changed too, it's a systematic change).

**FAIL-2 (Fake Z in GetFieldValue — Bug #5 on wrong config):**
`GetFieldValue()` returns `"2026-03-15T00:00:00.000Z"` (fake Z — local midnight with Z suffix).

- Interpretation: Bug #5 normally only fires on `enableTime=true && ignoreTimezone=true` (Config D). If it appears here, P6 resolved to the wrong field — likely DataField5 (Config D) instead of DataField6 (Config C). Re-run P6 and verify the returned field name.

**FAIL-3 (Wrong time selected — time other than midnight stored):**
Raw stored value is `"2026-03-15T<HH:mm:ss>"` where `HH:mm:ss` ≠ `00:00:00`.

- Interpretation: The time picker was scrolled during Step 4 (page scroll inside the time columns), changing the selected time. Re-open the popup, navigate to March 15, verify the time header shows `12:00 AM` before clicking Set. Do not scroll inside the Hour/Minute/AM-PM columns.

**FAIL-4 (Timezone environment invalid):**
Step 11 returns `"2026-03-15T00:00:00.000Z"` (UTC midnight, no IST offset).

- Interpretation: Test ran under UTC, not IST. Steps 9/10 may appear correct but represent the wrong timezone context. Abort, fix Preconditions P1–P2, and re-run.

---

## Related

| Reference              | Location                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Matrix row             | `../matrix.md` — row `1-C-IST`                                                             |
| Live test evidence     | `results.md` § Test 5.3                                                                    |
| Sibling Config D (IST) | `tc-1-D-IST.md` — same storage, different GFV (fake Z, Bug #5) — run next                  |
| Sibling Config C (BRT) | `tc-1-1-calendar-popup-brt.md` — Config C, BRT (PASS, same `"2026-03-15T00:00:00"` stored) |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Config C (`enableTime=true`, `ignoreTimezone=false`)     |
