# TC-2.7 — Config B, Round-Trip, BRT: stable storage across round-trip; Bug #5 absent for date-only

---

## Environment Specs

| Parameter               | Value                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                        |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, Brasilia Standard Time. No DST (Brazil abolished DST in 2019).     |
| **Platform**            | VisualVault FormViewer, Build `20260304.1`                                                      |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                        |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`        |
| **Scenario**            | 2026-03-15, BRT — date-only field; `2026-03-15` stored and returned without timezone conversion |

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
            f.enableTime === false &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField10"]
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
| 2   | Set initial value on the target field (identified in P6) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`                          | No error returned                                  | ☐   |
| 3   | Verify initial display                                   | Read the target field input                                                    | `03/15/2026`                                       | ☐   |
| 4   | Capture initial raw stored value                         | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"`                                     | ☐   |
| 5   | Capture initial GetFieldValue                            | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15"`                                     | ☐   |
| 6   | Execute round-trip                                       | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error returned                                  | ☐   |
| 7   | Verify display after round-trip                          | Read the target field input                                                    | `03/15/2026`                                       | ☐   |
| 8   | Capture raw stored value after round-trip                | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"`                                     | ☐   |
| 9   | Capture GetFieldValue after round-trip                   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15"`                                     | ☐   |
| 10  | Verify environment (isoRef)                              | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Why ignoreTimezone has no effect here**: The `getCalendarFieldValue()` fake-Z path that causes drift in Config D (TC-2.3) is gated on `enableTime=true`. For date-only fields (`enableTime=false`), `GetFieldValue` returns the raw stored string directly without appending any `Z`. As a result, the round-trip in step 6 passes `"2026-03-15"` back into `SetFieldValue` unchanged — no drift, no date shift, regardless of timezone.
>
> **UTC+ caveat**: This test documents BRT (UTC-3) behavior, where Bug #7 does not manifest. In UTC+ timezones (e.g., IST UTC+5:30), `SetFieldValue('2026-03-15')` stores `"2026-03-14"` instead of `"2026-03-15"` — the date-only string is parsed as local midnight, which falls on the previous UTC day. Once the wrong day is stored, the round-trip is stable around the wrong value. This UTC+ behavior is not observed in BRT.

---

## Fail Conditions

**FAIL-1 (Wrong day stored — Bug #7 manifesting in UTC+ timezone):**
Step 4 returns `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: Bug #7 is active. `normalizeCalValue()` parses `"2026-03-15"` via `moment(input).toDate()`, which in UTC+ treats the date string as local midnight; `getSaveValue()` then extracts the UTC date, landing on the previous day. This TC documents BRT behavior where Bug #7 does not manifest. Verify P3 shows `GMT-0300`. If running in a UTC+ timezone, the stored value will be one day earlier than intended — this is expected Bug #7 behavior, not a test failure specific to this TC.

**FAIL-2 (Bug #5 present for date-only — fake Z appended to GetFieldValue):**
Step 5 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15"`.

- Interpretation: The `getCalendarFieldValue()` fake-Z path has been extended to apply to date-only fields. In build `20260304.1`, this path only triggers when `enableTime=true`. Verify the build number matches `20260304.1`. If the fake-Z path is now active for date-only fields, the round-trip in step 6 will also produce drift — the date will shift by the timezone offset on each trip (same mechanism as TC-2.2 for Config D).

**FAIL-3 (Round-trip drift — stored value changed):**
Step 8 returns a value other than `"2026-03-15"` — e.g., `"2026-03-14T21:00:00"` or `"2026-03-15T03:00:00"`.

- Interpretation: The round-trip produced drift. Most likely FAIL-2 also occurred (GetFieldValue appended a fake Z in step 5). Confirm by checking whether step 5 returned a plain date string or an ISO timestamp. If FAIL-2 is confirmed, the Bug #5 condition has changed to include date-only fields.

**FAIL-4 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: V2 (`useUpdatedCalendarValueLogic=true`) is active. This TC documents V1 behavior. Verify the form is opened via the template URL in P4, not an Object View URL with `?ObjectID=`. If V2 is confirmed active, this TC does not apply — create a separate V2 TC.

**FAIL-5 (Wrong timezone — isoRef shows UTC midnight):**
Step 10 returns `"2026-03-15T00:00:00.000Z"` (midnight UTC, no offset shift).

- Interpretation: The browser is running in UTC, not BRT. Abort, re-do P1–P3, and restart the test.

---

## Related

| Reference                                        | Location                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                                | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.7 (DataField10 — Date-only + ignoreTimezone=true)                        |
| Bug #5 analysis                                  | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Bug #7 analysis                                  | `tasks/date-handling/forms-calendar/analysis.md` — Bug #7: SetFieldValue on date-only fields stores wrong day for UTC+ timezones       |
| Field config reference                           | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| Sibling TC (Config D round-trip — Bug #5 active) | `tasks/date-handling/forms-calendar/test/tc-2-3-roundtrip-brt.md`                                                                      |
| Sibling TC (cross-timezone drift analysis)       | `tasks/date-handling/forms-calendar/test/tc-2-4-cross-tz-brt.md`                                                                       |
