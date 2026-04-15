# TC-5-D-BRT — Config D, Preset Date, BRT: raw Date preserves initialDate; GFV applies -3h fake Z shift (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                       |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. DST not observed (Brazil suspended DST in 2019).           |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                       |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                       |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=true`         |
| **Scenario**            | Preset DateTime, BRT — `initialDate` = `"2026-03-01T11:28:54.627Z"`, local BRT = `08:28:54` AM |

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

**P4 — Open the DateTest form template** (creates a fresh instance — preset auto-populates):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> Opening the template (not a saved record) triggers preset initialization. The target field has `enableTime=true` and `ignoreTimezone=true` with a preset DateTime. Bug #5 fires on the first `GetFieldValue()` call.

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
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected result includes: { name: "Field16", initialDate: "2026-03-01T11:28:54.627Z" }
// Multiple fields may match (Current Date fields also have enableInitialValue=true)
// Use the field whose initialDate contains "2026-03-01" — that is the preset field
// Record this name as <FIELD_NAME> in all console steps
```

## Test Steps

| #   | Action                         | Test Data                                                      | Expected Result                                                                                                  | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                        | All P1–P6 checks pass; target field identified as preset field with `initialDate` = `"2026-03-01T11:28:54.627Z"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)           | `03/01/2026 08:28 AM` (BRT local display of the preset DateTime)                                                 | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | Date object — `.toISOString()` = `"2026-03-01T11:28:54.627Z"` (preserves initialDate)                            | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-01T08:28:54.627"` (BRT local time without fake Z suffix)                                               | ☐   |
| 5   | Verify BRT timezone active     | `new Date(2026, 2, 1, 0, 0, 0).toISOString()`                  | `"2026-03-01T03:00:00.000Z"` — confirms BRT active                                                               | ☐   |

> **Note on Config D GFV behavior**: Config D (`enableTime=true`, `ignoreTimezone=true`, `!useLegacy`) GFV path uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")`. The `[Z]` in the format string is a literal bracket — it outputs the character "Z" regardless of the actual timezone. This appends a fake UTC marker to what is actually a local time representation. The correct GFV return would be the local time without any Z suffix.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior.

**FAIL-3 (Bug #5 — GFV adds fake Z to BRT local time):**
Step 4: GFV returns `"2026-03-01T08:28:54.627Z"` instead of `"2026-03-01T08:28:54.627"`. The trailing `Z` is a fake UTC marker — the value `08:28:54.627` is BRT local time (UTC-3), not UTC. A consumer parsing this as UTC would interpret it as 3 hours earlier than intended.

- Interpretation: Bug #5 confirmed at form load for Config D preset in BRT. `getCalendarFieldValue()` uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` where `[Z]` outputs a literal Z. The raw Date (at UTC 11:28:54) is converted to BRT local (08:28:54) by moment, then the fake Z is appended. Any system that reads this value and treats `Z` as UTC will misplace the event by -3 hours. On round-trips (`SetFieldValue(GetFieldValue())`), each cycle shifts the time by -3 hours.

**FAIL-4 (Raw does not match initialDate):**
Step 3: Raw Date `.toISOString()` ≠ `"2026-03-01T11:28:54.627Z"`.

- Interpretation: The init path applied an unexpected transformation. DateTime preset fields should store the raw Date from `new Date(initialDate)` without truncation.

## Related

| Reference               | Location                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| Matrix row              | `../matrix.md` — row `5-D-BRT`                                     |
| Summary                 | [summary](../summaries/tc-5-D-BRT.md)                              |
| Bug #5 analysis         | `../analysis.md` — Bug #5 (fake Z in GetFieldValue)                |
| Sibling: 5-D-IST (FAIL) | [tc-5-D-IST.md](tc-5-D-IST.md) — same Bug #5 in IST (+5:30h shift) |
| Sibling: 5-C-BRT (PASS) | [tc-5-C-BRT.md](tc-5-C-BRT.md) — Config C in BRT (no fake Z)       |
| Field config reference  | `../../CLAUDE.md` — Test Form Fields table (Preset Date section)   |
