# TC-1-D-IST — Config D, Calendar Popup, IST: local midnight stored (same as C); GetFieldValue appends fake Z (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`     |
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
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["DataField5"]
// Record the returned name — use it as <FIELD_NAME> in Steps 6–10
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                                                                                         | Test Data                                                            | Expected Result                                                              | ✓   |
| --- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                                                                 | See Preconditions P1–P6                                              | All P1–P6 checks pass                                                        | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6)                                            | —                                                                    | Date picker popup opens on March 2026, Date tab active                       | ☐   |
| 3   | Navigate to March 2026 if not already shown                                                                    | —                                                                    | March 2026 calendar grid displayed                                           | ☐   |
| 4   | Scroll the page (using scrollbar or scroll within the date grid) to reveal the full popup including Set button | —                                                                    | Full calendar grid (days 1–31) and Set/Cancel buttons visible                | ☐   |
| 5   | Click day **15**                                                                                               | —                                                                    | Popup advances to Time tab; time header shows `12:00 AM`                     | ☐   |
| 6   | Verify time header before clicking Set                                                                         | —                                                                    | Time header reads `12:00 AM` — do not click Set if any other time is shown   | ☐   |
| 7   | Click **Set**                                                                                                  | —                                                                    | Popup closes; field input shows `03/15/2026 12:00 AM`                        | ☐   |
| 8   | Record display value shown in field                                                                            | —                                                                    | `03/15/2026 12:00 AM`                                                        | ☐   |
| 9   | Capture raw stored value                                                                                       | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15T00:00:00"` — local midnight IST stored (same as Config C)       | ☐   |
| 10  | Capture GetFieldValue return                                                                                   | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15T00:00:00"` — same as raw, no transformation                     | ☐   |
| 11  | Capture timezone reference                                                                                     | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active; real UTC of IST midnight | ☐   |

> **Note on Step 4 — popup scroll behavior:** The Set button is below the time picker columns and may not be visible without scrolling. Scroll the PAGE (not inside the time picker) by scrolling within the date grid area of the popup or using the browser scrollbar. Do NOT scroll inside the Hour/Minute/AM-PM columns — that changes the selected time.
>
> **Note on Step 5:** After clicking a day, the popup automatically switches to the Time tab. The default time is 12:00 AM. Do not interact with the time columns unless the header shows something other than `12:00 AM`.
>
> **Note on Step 10 — Bug #5 fake Z:** If Bug #5 is active, GetFieldValue returns `"2026-03-15T00:00:00.000Z"` which appears to be UTC midnight March 15, but is actually local midnight with a falsely appended Z. The real UTC equivalent of IST midnight March 15 is `"2026-03-14T18:30:00.000Z"` (confirmed by Step 11). See FAIL-1 for the full interpretation.
>
> **Note on Step 9 — storage confirmed same as Config C:** `getSaveValue()` formats dates as local time using `moment(input).format("YYYY-MM-DD[T]HH:mm:ss")`. The `ignoreTimezone` flag does not affect `getSaveValue()`. Both Configs C and D store `"2026-03-15T00:00:00"` in IST. The only observable difference between C and D is in GetFieldValue output.

---

## Fail Conditions

**FAIL-1 (Bug #5 active — fake Z in GetFieldValue):**
Step 10 returns `"2026-03-15T00:00:00.000Z"` — fake Z appended to local midnight.

- Interpretation: `getCalendarFieldValue()` is appending a literal `Z` to the local time string. Correct return is `"2026-03-15T00:00:00"` matching the raw stored value. This is Bug #5. The fake Z makes the value appear as UTC midnight March 15, but the real UTC equivalent of IST midnight is `"2026-03-14T18:30:00.000Z"` (confirmed by Step 11). Round-trip drift will occur if this value is fed back via `SetFieldValue()` — each trip shifts the stored time by +5:30h in IST (see TC-2.5).

**FAIL-2 (Wrong storage format — UTC offset stored instead of local midnight):**
Raw stored value is `"2026-03-14T18:30:00"` (the UTC equivalent of IST midnight).

- Interpretation: `getSaveValue()` behavior changed — it is now stripping Z from `toISOString()` output instead of formatting local time. This would indicate a regression. Verify the VV build number matches 20260304.1 and compare with Config C (1-C-IST — same test in Config C should store `"2026-03-15T00:00:00"` — if that also changed, it's a systematic change).

**FAIL-3 (Wrong time selected — time other than midnight stored):**
Raw stored value is `"2026-03-15T<HH:mm:ss>"` where `HH:mm:ss` ≠ `00:00:00`.

- Interpretation: The time picker was scrolled during Step 4 (page scroll inside the time columns), changing the selected time. Re-open the popup, navigate to March 15, verify the time header shows `12:00 AM` before clicking Set. Do not scroll inside the Hour/Minute/AM-PM columns.

**FAIL-4 (Timezone environment invalid):**
Step 11 returns `"2026-03-15T00:00:00.000Z"` (UTC midnight, no IST offset).

- Interpretation: Test ran under UTC, not IST. Steps 9/10 may appear correct but represent the wrong timezone context. Abort, fix Preconditions P1–P2, and re-run.

---

## Related

| Reference              | Location                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `1-D-IST`                                                                             |
| Live test evidence     | `results.md` § Test 5.4                                                                                    |
| Bug #5 analysis        | `research/date-handling/forms-calendar/analysis.md` — Bug #5 section                                       |
| Sibling Config C (IST) | `tc-1-C-IST.md` — same storage `"2026-03-15T00:00:00"`, no fake Z (PASS)                                   |
| Sibling Config D (BRT) | `tc-1-1-calendar-popup-brt.md` — Config D, BRT (same raw storage; fake Z = midnight UTC → no drift in BRT) |
| Field config reference | `research/date-handling/CLAUDE.md` — Config D (`enableTime=true`, `ignoreTimezone=true`)                   |
