# TC-1-B-IST — Config B, Calendar Popup, IST: date stored -1 day (Bug #7); GetFieldValue unaffected (no fake Z)

## Environment Specs

| Parameter               | Required Value                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`    |
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
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["DataField10"]
// Record the returned name — use it as <FIELD_NAME> in Steps 6–8
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

> **Note on Step 4:** Config B has `enableTime=false`. The popup closes immediately after clicking a day — it does **not** advance to a time tab. No Set button interaction is needed.
>
> **Note on Step 5:** The display value shows the date the user intended to select (March 15). The discrepancy between display (`03/15/2026`) and storage (`"2026-03-14"`) is the observable symptom of Bug #7 — the form shows the correct date but stores the previous day.
>
> **Note on Config B vs Config A:** The `ignoreTimezone=true` flag is active on this field, but it has **no effect** on date-only storage. Config B and Config A store identical values for the same popup action in IST. The flag only affects `getCalendarFieldValue()` output when `enableTime=true` (Bug #5 path), which does not apply here.

---

## Fail Conditions

**FAIL-1 (Bug #7 active — -1 day shift):**
Step 6 returns `"2026-03-14"` — stored one day earlier than selected.

- Interpretation: `normalizeCalValue()` parsed the date string as local IST midnight; `getSaveValue()` then extracted the UTC date, which in IST (UTC+5:30) falls on March 14. The display still shows `03/15/2026` while storage holds `"2026-03-14"`. This is Bug #7.

**FAIL-2 (Config B diverges from Config A — unexpected):**
Raw stored value differs from what Config A (tc-1-A-IST.md) produced for the same popup action in IST.

- Interpretation: The `ignoreTimezone` flag is unexpectedly affecting the date-only storage path. This would indicate a change in `normalizeCalValue()` or `getSaveValue()` that conditions on `ignoreTimezone` for date-only fields. Inspect the VV build and re-run tc-1-A-IST.md for comparison.

**FAIL-3 (Timezone environment invalid):**
Step 8 returns `"2026-03-15T00:00:00.000Z"` (UTC midnight, no offset shift).

- Interpretation: Test ran under UTC, not IST. Steps 6/7 may appear correct by coincidence. Abort, fix Preconditions P1–P2, and re-run.

**FAIL-4 (Fake Z appended — Bug #5 symptom on wrong config):**
`GetFieldValue()` returns a value ending in `.000Z` (e.g., `"2026-03-14T00:00:00.000Z"`).

- Interpretation: Bug #5 normally only fires on `enableTime=true && ignoreTimezone=true` (Config D). If it appears here, the field lookup in P6 resolved to the wrong field — likely DataField5 (Config D) instead of DataField10 (Config B). Re-run P6 and verify the returned name is the date-only field.

---

## Related

| Reference              | Location                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `1-B-IST`                                                              |
| Live test evidence     | `results.md` § Test 5.2                                                                  |
| Bug #7 analysis        | `tasks/date-handling/forms-calendar/analysis.md` — Bug #7 section                        |
| Sibling Config A (IST) | `tc-1-A-IST.md` — Config A, same scenario, same TZ (identical result — ignoreTZ no diff) |
| Sibling BRT test       | `tc-1-1-calendar-popup-brt.md` — Config B/D, Calendar Popup, BRT (PASS — no shift)       |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Config B (`enableTime=false`, `ignoreTimezone=true`)   |
