# TC-1.3 — Config D, Round-Trip, BRT: -3h drift per trip; GetFieldValue appends fake Z (Bug #5)

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
// Record the returned name — use it as <FIELD_NAME> in all Steps below
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                           | Test Data                                                                                                                      | Expected Result                                           | ✓   |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | --- |
| 1   | Complete setup                                   | See Preconditions P1–P6                                                                                                        | All P1–P6 checks pass                                     | ☐   |
| 2   | Establish initial field value via console        | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                                                 | No error returned; field updates                          | ☐   |
| 3   | Record display value (before round-trip)         | —                                                                                                                              | `03/15/2026 12:00 AM`                                     | ☐   |
| 4   | Capture raw stored value (before round-trip)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                                                 | `"2026-03-15T00:00:00"`                                   | ☐   |
| 5   | Capture GetFieldValue return (before round-trip) | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                                        | `"2026-03-15T00:00:00"` — same as raw, no transformation  | ☐   |
| 6   | Execute round-trip via console                   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))`                                                 | No error returned; field display unchanged                | ☐   |
| 7   | Record display value (after round-trip)          | —                                                                                                                              | `03/15/2026 12:00 AM` — unchanged, no drift               | ☐   |
| 8   | Capture raw stored value (after round-trip)      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                                                 | `"2026-03-15T00:00:00"` — unchanged, no drift             | ☐   |
| 9   | Capture GetFieldValue return (after round-trip)  | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                                        | `"2026-03-15T00:00:00"` — same as raw, no transformation  | ☐   |
| 10  | Confirm round-trip is idempotent                 | `new Date(VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')).getTime() - new Date('2026-03-15T00:00:00').getTime()` | `0` — no drift, round-trip did not alter the stored value | ☐   |
| 11  | Capture timezone reference                       | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active        | ☐   |

> **Note on Step 2:** Run in DevTools console (F12 → Console tab). The raw string `'2026-03-15T00:00:00'` has no timezone suffix — the browser treats it as local time, which stores correctly as BRT midnight.
>
> **Note on Step 6:** The round-trip feeds `GetFieldValue` output back into `SetFieldValue`. Correct behavior: `GetFieldValue` returns the raw value (no Z suffix), `SetFieldValue` re-stores it unchanged. If Bug #5 is active, `GetFieldValue` returns a fake Z suffix, JS parses it as UTC midnight, and in BRT that re-stores as 9:00 PM March 14 — a -3h shift. That is the FAIL condition, not the expected outcome.

---

## Fail Conditions

**FAIL-1 (Bug #5 active — fake Z in GetFieldValue):**
Step 5 returns `"2026-03-15T00:00:00.000Z"` — fake Z appended.

- Interpretation: `getCalendarFieldValue()` is appending a literal `[Z]` to the local time string (Bug #5). Correct return is `"2026-03-15T00:00:00"`. This fake Z will cause the round-trip in Step 6 to shift the stored value by -3h.

**FAIL-2 (Bug #5 drift in round-trip):**
Step 8 returns `"2026-03-14T21:00:00"` — stored value shifted -3h from original.

- Interpretation: Bug #5 fake Z caused `SetFieldValue` to interpret the value as UTC midnight, storing it as 21:00 BRT on March 14. Each additional round-trip shifts another -3h. Correct stored value after round-trip is `"2026-03-15T00:00:00"` (unchanged).

**FAIL-3 (unexpected shift magnitude):**
Step 8 returns a value other than `"2026-03-15T00:00:00"` (correct) or `"2026-03-14T21:00:00"` (Bug #5 in BRT), or Step 10 returns a value other than `0` or `-10800000`.

- Interpretation: The active timezone is not BRT (UTC-3), or a different code path was triggered. Abort, re-check P1 and P2, verify Step 11 returns `"2026-03-15T03:00:00.000Z"` before rerunning.

**FAIL-4 (timezone environment invalid):**
Step 11 returns `"2026-03-15T00:00:00.000Z"` (no 3h offset shift).

- Interpretation: Browser is running with UTC timezone, not BRT. Steps 4–9 may still show the shift by coincidence but the test environment is invalid. Abort, fix Preconditions P1–P2, and re-run.

**FAIL-5 (initial setup did not land):**
Step 4 returns anything other than `"2026-03-15T00:00:00"`.

- Interpretation: The SetFieldValue call in Step 2 did not produce the expected stored value. Reload the form from the template URL in P4 (fresh instance) and repeat from Step 2.

---

## Related

| Reference                | Location                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Live test evidence       | `tasks/date-handling/forms-calendar/test/results.md` — Test 1.3                                           |
| Bug #5 analysis          | `tasks/date-handling/forms-calendar/analysis.md` — `getCalendarFieldValue()` section                      |
| Sibling popup test       | `tc-1-1-calendar-popup-brt.md` — same field config, calendar popup input (establishes same initial state) |
| Sibling typed-input test | `tc-1-2-typed-input-brt.md` — same field config, keyboard input (establishes same initial state)          |
| Field config reference   | `tasks/date-handling/CLAUDE.md` — Config D (`enableTime=true`, `ignoreTimezone=true`)                     |
