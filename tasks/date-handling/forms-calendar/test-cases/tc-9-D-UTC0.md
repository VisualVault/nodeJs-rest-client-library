# TC-9-D-UTC0 — Config D, Round-Trip 1 trip, UTC0: 0h drift — Bug #5 invisible at UTC boundary

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Etc/GMT` — UTC+0. No DST.                                                              |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, UTC+0 midnight — `2026-03-15T00:00:00Z` = `2026-03-15T00:00:00Z` UTC      |

---

## Preconditions

**P1 — Set system timezone to `Etc/GMT` (UTC+0):**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "UTC"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "UTC"
```

Linux:

```bash
sudo timedatectl set-timezone Etc/GMT
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT+0000"
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
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField5"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                        | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                  | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`                   | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                                | ☐   |
| 4   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                               | ☐   |
| 5   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — no drift (PASS)              | ☐   |
| 6   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — same as raw                  | ☐   |
| 7   | Compare raw before vs after                 | Step 3 raw vs Step 5 raw                                                       | Identical — `"2026-03-15T00:00:00"` (0 drift at UTC+0) | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0 active   | ☐   |

> **Why 0 drift at UTC+0**: Bug #5 is structurally present — GFV still adds fake Z (`"2026-03-15T00:00:00.000Z"`). But at UTC+0, parsing that Z-suffixed string as UTC and converting to local produces the same value (local = UTC). The fake Z is coincidentally correct. This test confirms the 0-drift boundary case.

---

## Fail Conditions

**FAIL-1 (Wrong timezone):** Step 8 does not return `"2026-03-15T00:00:00.000Z"`.

- Interpretation: System timezone is not UTC+0. Re-do P1 and P2.

**FAIL-2 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1.

**FAIL-3 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct.

---

## Related

| Reference                | Location                                                       |
| ------------------------ | -------------------------------------------------------------- |
| Matrix row               | `../matrix.md` — row `9-D-UTC0`                                |
| Run file                 | [`../runs/tc-9-D-UTC0-run-1.md`](../runs/tc-9-D-UTC0-run-1.md) |
| Summary                  | [`../summaries/tc-9-D-UTC0.md`](../summaries/tc-9-D-UTC0.md)   |
| Bug #5 analysis          | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)    |
| BRT drift: 9-D-BRT-1     | [`tc-9-D-BRT-1.md`](tc-9-D-BRT-1.md) — -3h per trip (UTC-)     |
| IST drift: 9-D-IST-1     | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — +5:30h per trip (UTC+)  |
| UTC0 date-only: 1-D-UTC0 | Related Cat 1 test at UTC+0                                    |
| Field config reference   | `tasks/date-handling/CLAUDE.md` — Config D                     |
