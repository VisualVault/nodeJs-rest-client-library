# TC-9-E-any — Config E, Round-Trip 1 trip, BRT: 0 drift — legacy date-only immune

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT — legacy date-only, round-trip stable (no bugs)                        |

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
// PASS: output contains "GMT-0300"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template:**

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField12"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`                          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"`                                     | ☐   |
| 4   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 5   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"` — unchanged, no drift (PASS)        | ☐   |
| 6   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15"` — same as raw                       | ☐   |
| 7   | Compare raw before vs after                 | Step 3 raw vs Step 5 raw                                                       | Identical — `"2026-03-15"` (0 drift)               | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Why Config E is immune**: Legacy date-only (`useLegacy=true`, `enableTime=false`) uses the same storage path as Config A/B in BRT. Bug #5 requires `enableTime=true` + `ignoreTimezone=true` (not met). Bug #7 only manifests in UTC+ timezones (BRT is UTC-3, safe). The round-trip is stable.

---

## Fail Conditions

**FAIL-1 (Post-trip raw shifted — drift detected):** Step 5 returns a value other than `"2026-03-15"`.

- Interpretation: Unexpected drift on a legacy date-only field. Verify P6 returned DataField12 and that `useLegacy=true` is confirmed.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1.

**FAIL-4 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct.

---

## Related

| Reference                      | Location                                                              |
| ------------------------------ | --------------------------------------------------------------------- |
| Matrix row                     | `../matrix.md` — row `9-E-any`                                        |
| Run file                       | [`../runs/tc-9-E-any-run-1.md`](../runs/tc-9-E-any-run-1.md)          |
| Summary                        | [`../summaries/tc-9-E-any.md`](../summaries/tc-9-E-any.md)            |
| Config A control: 9-A-any      | [`tc-9-A-any.md`](tc-9-A-any.md) — non-legacy date-only, also immune  |
| Config B control: 9-B-any      | [`tc-9-B-any.md`](tc-9-B-any.md) — non-legacy + ignoreTZ, also immune |
| Config B IST (Bug #7): 9-B-IST | [`tc-9-B-IST.md`](tc-9-B-IST.md) — same date-only, but Bug #7 in UTC+ |
| Field config reference         | `tasks/date-handling/CLAUDE.md` — Config E                            |
