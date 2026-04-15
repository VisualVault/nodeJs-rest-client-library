# TC-1-A-IST — Config A, Calendar Popup, IST: date stored -1 day (Bug #7); GetFieldValue returns same shifted value

## Environment Specs

| Parameter               | Required Value                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`   |
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

**P2 — Restart Chrome** after the timezone change. DevTools retains the old timezone if Chrome is not restarted.

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["DataField7"]
// Record the returned name — use it as <FIELD_NAME> in Steps 8–10
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                                              | Test Data                                                            | Expected Result                                    | ✓   |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                              | All P1–P6 checks pass                              | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | —                                                                    | Date picker popup opens on March 2026              | ☐   |
| 3   | Navigate to March 2026 in the popup calendar if not already shown   | —                                                                    | March 2026 calendar grid displayed                 | ☐   |
| 4   | Click day **15**                                                    | —                                                                    | Popup closes; field input shows `03/15/2026`       | ☐   |
| 5   | Record display value shown in field                                 | —                                                                    | `03/15/2026`                                       | ☐   |
| 6   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15"` — correct date, no shift            | ☐   |
| 7   | Capture GetFieldValue return                                        | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15"` — same as raw, no transformation    | ☐   |
| 8   | Capture timezone reference                                          | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Note on Step 4:** Config A has `enableTime=false`. The popup closes immediately after clicking a day — it does **not** advance to a time tab. No Set button interaction is needed.
>
> **Note on Step 5:** The display value shows the date the user intended to select (March 15). The discrepancy between display (`03/15/2026`) and storage (`"2026-03-14"`) is the observable symptom of Bug #7 — the form shows the correct date but stores the previous day.

---

## Fail Conditions

**FAIL-1 (Bug #7 active — -1 day shift):**
Step 6 returns `"2026-03-14"` — stored one day earlier than selected.

- Interpretation: `normalizeCalValue()` parsed the date string as local IST midnight; `getSaveValue()` then extracted the UTC date, which in IST (UTC+5:30) falls on March 14. The display still shows `03/15/2026` (the correct selected date) while storage holds `"2026-03-14"`. This is Bug #7. Each subsequent `SetFieldValue` call with the date-only string will repeat the −1 day shift.

**FAIL-2 (Double-shift observed — stored -2 days):**
Raw stored value is `"2026-03-13"`.

- Interpretation: The popup produced a Date object that went through a second midnight conversion in `normalizeCalValue()`. This was the original matrix prediction but was not confirmed in live testing (2026-03-30). If this appears, document the exact popup handler code path that produced it and verify whether a regression occurred.

**FAIL-3 (Timezone environment invalid):**
Step 8 returns `"2026-03-15T00:00:00.000Z"` (midnight UTC, no offset shift).

- Interpretation: Test ran under UTC, not IST. Steps 6/7 may appear correct by coincidence. Abort, fix Preconditions P1–P2, and re-run.

**FAIL-4 (Fake Z appended — Bug #5 symptom on wrong config):**
`GetFieldValue()` returns `"2026-03-14T00:00:00.000Z"` or any value with `.000Z`.

- Interpretation: Bug #5 normally only fires on `enableTime=true && ignoreTimezone=true` (Config D). If it appears here, the field lookup in P6 resolved to the wrong field. Re-run P6 and verify the returned name is the date-only field, not a DateTime field.

---

## Related

| Reference              | Location                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Matrix row             | `../matrix.md` — row `1-A-IST`                                                             |
| Bug #7 analysis        | `research/date-handling/forms-calendar/analysis.md` — Bug #7 section                       |
| Bug #2 analysis        | `research/date-handling/forms-calendar/analysis.md` — Bug #2 section                       |
| Sibling BRT test       | `tc-1-1-calendar-popup-brt.md` — Config D, Calendar Popup, BRT (PASS — no shift)           |
| Field config reference | `research/date-handling/CLAUDE.md` — Config A (`enableTime=false`, `ignoreTimezone=false`) |
