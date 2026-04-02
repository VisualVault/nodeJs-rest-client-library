# TC-9-B-any — Config B, GFV Round-Trip ×1, BRT: 0 drift; ignoreTimezone has no effect on date-only

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT — TZ-independent (date-only, "any" in matrix)                          |

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

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

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
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`                          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"`                                     | ☐   |
| 4   | Capture baseline GFV (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15"` — correct                           | ☐   |
| 5   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 6   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"` — unchanged, no drift               | ☐   |
| 7   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15"` — same as raw, no drift             | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Why ignoreTimezone has no effect here**: Config B adds `ignoreTimezone=true` to the date-only baseline (Config A). Since `enableTime=false`, the fake Z branch in `getCalendarFieldValue()` is not reached — `ignoreTimezone` has no observable effect. This confirms Bug #5 requires BOTH `enableTime=true` AND `ignoreTimezone=true`.

---

## Fail Conditions

**FAIL-1 (Post-trip raw shifted — drift detected):** Step 6 returns a value other than `"2026-03-15"`.

- Interpretation: Drift occurred on a date-only field — this would be unexpected since Bug #5 requires `enableTime=true`. Verify P6 returned DataField10.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1. Verify form URL has no `?ObjectID=` parameter and no server-side flag override.

**FAIL-4 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct and field definitions haven't changed.

---

## Related

| Reference                      | Location                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Matrix row                     | `../matrix.md` — row `9-B-any`                                                   |
| Config A sibling: 9-A-any      | [`tc-9-A-any.md`](tc-9-A-any.md) — date-only baseline, also immune               |
| Config D comparison: 9-D-BRT-1 | [`tc-9-D-BRT-1.md`](tc-9-D-BRT-1.md) — has both enableTime+ignoreTZ → drifts -3h |
| Bug #5 analysis                | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)                      |
| Field config reference         | `tasks/date-handling/CLAUDE.md` — Config B                                       |
