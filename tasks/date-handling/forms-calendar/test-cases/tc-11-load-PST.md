# TC-11-load-PST — Config D, Cross-TZ Reload, BRT→PDT: -7h drift per trip; Bug #5 proportional to PDT offset

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Los_Angeles` — UTC-7, PDT (DST active). UTC-8 PST when DST inactive.            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`  |
| **Scenario**            | BRT-saved record reloaded in PDT — stored `"2026-03-15T00:00:00"`, Mar 15 is PDT (UTC-7) |

---

## Preconditions

**P1 — Set system timezone to `America/Los_Angeles`:**

macOS:

```bash
sudo systemsetup -settimezone America/Los_Angeles
```

Windows (run as Administrator):

```bat
tzutil /s "Pacific Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "Pacific Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone America/Los_Angeles
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT-0700 (PDT active for Apr 8)
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the BRT-saved record** (DateTest-000080):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record (DateTest-000080) was saved from BRT (UTC-3) with Config D field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`. Mar 15 is PDT (UTC-7), not PST.

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console, after form loads):

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
// Expected: ["Field5"]
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                         | Test Data                                                                      | Expected Result                                            | ✓   |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- | --- |
| 1   | Complete setup                                 | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                      | ☐   |
| 2   | Verify record loaded                           | Tab title or form header                                                       | Title contains `DateTest-000080`                           | ☐   |
| 3   | Capture raw stored value (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — preserved from BRT save          | ☐   |
| 4   | Capture GFV (DevTools console)                 | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct (no transformation)      | ☐   |
| 5   | Execute GFV round-trip (DevTools console)      | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error thrown                                            | ☐   |
| 6   | Capture post-trip raw value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — correct (no drift)               | ☐   |
| 7   | Capture post-trip GFV (DevTools console)       | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct                          | ☐   |
| 8   | toISOString reference (DevTools console)       | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T07:00:00.000Z"` — confirms PDT (UTC-7) active | ☐   |
| 9   | Capture Config A raw (DevTools console)        | `VV.Form.VV.FormPartition.getValueObjectValue('Field7')`                       | `"2026-03-15"` — date-only preserved                       | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 -7h drift):** Step 4 returns `"2026-03-15T00:00:00.000Z"` (fake Z). Step 6 returns `"2026-03-14T17:00:00"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: PDT -7h drift. Matrix predicted -8h (PST) but actual is -7h (PDT — DST active for Mar 15).

**FAIL-2 (Wrong TZ):** P3 `new Date().toString()` does not contain `GMT-0700`.

- Interpretation: System timezone is not PDT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference               | Location                                                             |
| ----------------------- | -------------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `11-load-PST`                                      |
| UTC+0 control (0 drift) | [tc-11-load-UTC0.md](tc-11-load-UTC0.md) — Bug #5 invisible at UTC+0 |
| BRT drift (-3h)         | `matrix.md` — row `9-D-BRT-1`                                        |
| IST drift (+5:30h)      | `matrix.md` — row `9-D-IST-1`                                        |
| Bug #5 analysis         | `analysis/bug-5.md` — FORM-BUG-5: fake Z in GetFieldValue            |
