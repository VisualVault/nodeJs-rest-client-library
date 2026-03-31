# TC-2.3 — Config D, Round-Trip, BRT: date shifts -3h per trip; Bug #5 fake Z causes drift

---

## Environment Specs

| Parameter               | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, Brasilia Standard Time. No DST (Brazil abolished DST in 2019). |
| **Platform**            | VisualVault FormViewer, Build `20260304.1`                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`     |
| **Scenario**            | 2026-03-15, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00` UTC          |

---

## Preconditions

**P1 — Set system timezone to `America/Sao_Paulo`:**

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

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before continuing.

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console):

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
// Expected: ["DataField5"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

---

## Test Steps

| #   | Action                                                   | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                                           | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set initial value on the target field (identified in P6) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | No error returned                                  | ☐   |
| 3   | Verify initial display                                   | Read the target field input                                                    | `03/15/2026 12:00 AM`                              | ☐   |
| 4   | Capture initial raw stored value                         | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Capture initial GetFieldValue                            | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00.000Z"` — fake Z (Bug #5)     | ☐   |
| 6   | Execute round-trip                                       | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error returned                                  | ☐   |
| 7   | Verify display after round-trip                          | Read the target field input                                                    | `03/14/2026 09:00 PM`                              | ☐   |
| 8   | Capture raw stored value after round-trip                | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-14T21:00:00"`                            | ☐   |
| 9   | Capture GetFieldValue after round-trip                   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-14T21:00:00.000Z"` — fake Z (Bug #5)     | ☐   |
| 10  | Verify environment (isoRef)                              | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Drift mechanism**: `GetFieldValue` appends a literal `Z` to the local midnight string (`"2026-03-15T00:00:00"` → `"2026-03-15T00:00:00.000Z"`). When this fake-UTC value is passed back into `SetFieldValue`, JavaScript interprets the `Z` as real UTC midnight and converts it to local time: UTC midnight in BRT (UTC-3) = March 14 21:00 local. The -3h shift compounds on each subsequent round-trip — see TC-2.8 for the 10-trip cumulative drift test.

---

## Fail Conditions

**FAIL-1 (No drift — Bug #5 absent or fixed):**
Step 8 returns `"2026-03-15T00:00:00"` (same as before). Step 7 display still reads `03/15/2026 12:00 AM`.

- Interpretation: The `getCalendarFieldValue()` fake-Z path was fixed or the VV build changed. Verify the build number matches `20260304.1`. If the build changed, re-run P5 and update expected results accordingly.

**FAIL-2 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: `useUpdatedCalendarValueLogic` is `true`; the form is running V2. This TC documents V1 behavior. Verify the form is opened via the template URL in P4 (not an Object View URL with `?ObjectID=`). If V2 is confirmed active, this TC does not apply — create a separate V2 TC.

**FAIL-3 (Wrong timezone — isoRef shows UTC midnight):**
Step 10 returns `"2026-03-15T00:00:00.000Z"` (midnight UTC, no offset shift).

- Interpretation: The browser is running in UTC, not BRT. The -3h drift in step 8 would not appear (no drift in UTC). Abort, re-do P1–P3, and restart the test.

**FAIL-4 (Wrong shift direction or magnitude):**
Step 8 returns a value other than `"2026-03-14T21:00:00"` — e.g., `"2026-03-15T05:30:00"` (IST shift) or `"2026-03-14T16:00:00"` (PST shift).

- Interpretation: The system timezone differs from BRT. The shift magnitude equals the timezone offset: UTC-3 → -3h, UTC+5:30 → +5:30h. Verify P3 shows `GMT-0300`. This TC documents BRT-specific values; for other timezones the expected values will differ.

---

## Related

| Reference                                                    | Location                                                                                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                                            | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.3 (Bug #5 — Round-Trip Comparison)                                       |
| Bug #5 analysis                                              | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Field config reference                                       | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| Sibling TC (calendar popup that produces the pre-test state) | `tasks/date-handling/forms-calendar/test/tc-2-2-calendar-popup-brt.md`                                                                 |
| Sibling TC (10-trip cumulative drift)                        | `tasks/date-handling/forms-calendar/test/tc-2-8-roundtrip-cumulative-brt.md` (pending)                                                 |
