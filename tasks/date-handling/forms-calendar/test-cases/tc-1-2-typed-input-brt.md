# TC-1.2 — Config D, Typed Input, BRT: same storage as popup; GetFieldValue appends fake Z (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active in March 2026.                              |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`     |
| **Scenario**            | March 15, 2026, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00.000Z` UTC |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

**P1 — Set system timezone to BRT:**

macOS:

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

Windows (run as Administrator):

```bat
tzutil /s "E. South America Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "E. South America Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone America/Sao_Paulo
```

**P2 — Restart Chrome** after the timezone change. DevTools retains the old timezone if Chrome is not restarted.

**P3 — Verify browser timezone in DevTools console:**

```javascript
new Date().toString();
// PASS: output contains GMT-0300
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
// ABORT: true  → V2 is active; this test is not valid for V2 behavior
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
// Record the returned name — use it as <FIELD_NAME> in Steps 11–13
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                                               | Test Data                                                      | Expected Result                                                 | ✓   |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | --- |
| 1   | Complete setup                                                       | See Preconditions P1–P6                                        | All P1–P6 checks pass                                           | ☐   |
| 2   | Click the target field input (identified in P6) at its leftmost edge | —                                                              | `month` segment highlighted in blue                             | ☐   |
| 3   | Type month segment                                                   | `03`                                                           | Field: `03/dd/yyyy hh:mm a`                                     | ☐   |
| 4   | Type day segment                                                     | `15`                                                           | Field: `03/15/yyyy hh:mm a`                                     | ☐   |
| 5   | Type year segment                                                    | `2026`                                                         | Field: `03/15/2026 hh:mm a`                                     | ☐   |
| 6   | Type hour segment                                                    | `12`                                                           | Field: `03/15/2026 12:mm a` (12 AM = midnight)                  | ☐   |
| 7   | Type minute segment                                                  | `00`                                                           | Field: `03/15/2026 12:00 AM`; cursor advances to AM segment     | ☐   |
| 8   | Leave AM segment unchanged                                           | —                                                              | AM remains selected (do not type anything)                      | ☐   |
| 9   | Press Tab                                                            | —                                                              | Field displays `03/15/2026 12:00 AM`; focus moves to next field | ☐   |
| 10  | Record display value shown in field                                  | —                                                              | `03/15/2026 12:00 AM`                                           | ☐   |
| 11  | Capture raw stored value                                             | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                         | ☐   |
| 12  | Capture GetFieldValue return                                         | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — same as raw, no transformation        | ☐   |
| 13  | Capture timezone reference                                           | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active              | ☐   |

> **Note on Step 2:** Click the leftmost area of the field input to ensure the cursor lands on the `month` segment, not a middle segment. If a segment other than `month` is highlighted after clicking, press `Home` or click further left.

---

## Fail Conditions

**FAIL-1 (Bug #5 active):**
`GetFieldValue()` returns `"2026-03-15T00:00:00.000Z"` — fake Z appended.

- Interpretation: `getCalendarFieldValue()` is appending a literal `[Z]` to the local time string. Correct return is `"2026-03-15T00:00:00"` matching the raw stored value. This is Bug #5. Round-trip drift will occur if this value is fed back via `SetFieldValue()` — each trip shifts the stored time by -3h (BRT offset).

**FAIL-2 (wrong time stored):**
Raw stored value contains a non-zero time component (e.g., `"2026-03-15T00:03:00"`).

- Interpretation: The AM/PM segment was changed, or a minute segment received unexpected input. Reload the form from the template URL in P4 and repeat from Step 2, confirming the AM segment is unchanged after Step 7.

**FAIL-3 (timezone environment invalid):**
Step 13 returns `"2026-03-15T00:00:00.000Z"` (no offset shift).

- Interpretation: Test ran with UTC timezone, not BRT. Steps 11/12 may still match by coincidence. Abort, fix Preconditions P1–P2, and re-run.

**FAIL-4 (pre-existing round-trip drift):**
Raw stored value is `"2026-03-14T21:00:00"` or any value dated 2026-03-14.

- Interpretation: A prior `SetFieldValue(GetFieldValue())` call drifted the field before this test ran (Bug #5 drift). Reload the form from the template URL in P4 to get a clean state.

---

## Related

| Reference              | Location                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Live test evidence     | `tasks/date-handling/forms-calendar/test/results.md` — Test 1.2                         |
| Bug #5 analysis        | `tasks/date-handling/forms-calendar/analysis.md` — `getCalendarFieldValue()` section    |
| Bug #6 analysis        | `tasks/date-handling/forms-calendar/analysis.md` — empty field `"Invalid Date"` section |
| Sibling popup test     | `tc-1-1-calendar-popup-brt.md` — same field config, calendar popup input                |
| Round-trip drift test  | TC-1.3 (same folder) — exercises Bug #5 to full date-shift                              |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Config D (`enableTime=true`, `ignoreTimezone=true`)   |
