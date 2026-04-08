# TC-12-config-C-near-midnight — Config C, Round-Trip near midnight, BRT: stable 0 drift; FORM-BUG-5 absent

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T23:00:00-03:00` = `2026-03-16T02:00:00Z` UTC    |

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
// ABORT: true  → V2 is active
```

**P6 — Locate the target field by configuration** (DevTools console, after form loads):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field6"]
```

---

## Test Steps

| #   | Action                                             | Test Data                                                                      | Expected Result                                                             | ✓   |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                     | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                                       | ☐   |
| 2   | Set near-midnight value (DevTools console)         | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T23:00:00')`                 | Field displays `03/15/2026 11:00 PM`                                        | ☐   |
| 3   | Capture raw stored value (DevTools console)        | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T23:00:00"`                                                     | ☐   |
| 4   | Capture GetFieldValue (DevTools console)           | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-16T02:00:00.000Z"` — real UTC (23:00 BRT + 3h = 02:00 UTC Mar 16) | ☐   |
| 5   | Round-trip: set GFV result back (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | Field still displays `03/15/2026 11:00 PM`                                  | ☐   |
| 6   | Capture raw after round-trip (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T23:00:00"` — unchanged, 0 drift                                | ☐   |
| 7   | Capture GFV after round-trip (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-16T02:00:00.000Z"` — same real UTC, stable                        | ☐   |
| 8   | Confirm browser timezone (DevTools console)        | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                          | ☐   |

> This is a control test for FORM-BUG-5. Config C (`ignoreTimezone=false`) uses `new Date(value).toISOString()` for real UTC conversion, not fake Z. The round-trip is mathematically stable: GFV produces real UTC, SFV parses real UTC back to the same local time. No drift regardless of TZ offset or proximity to midnight. Contrast with Config D (`12-near-midnight-2`) where the same input drifts -3h per trip.

---

## Fail Conditions

**FAIL-1 (Unexpected drift):** Step 6 raw value differs from Step 3. Any drift means Config C has a round-trip instability — would contradict the real-UTC-conversion model.

- Interpretation: If drift occurs, the `new Date(value).toISOString()` → `new Date(isoZ)` round-trip has a flaw. Check whether `normalizeCalValue()` is stripping Z before re-parsing.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config C flags.

---

## Related

| Reference              | Location                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-config-C-near-midnight`                                          |
| Bug #5 analysis        | `analysis/overview.md` — FORM-BUG-5: Fake [Z] in GetFieldValue                         |
| Config D near-midnight | [tc-12-near-midnight-2.md](tc-12-near-midnight-2.md) — same input, Config D drifts -3h |
| Config C populated GFV | [tc-8-C-BRT.md](tc-8-C-BRT.md) — Config C GFV returns real UTC                         |
| Field config reference | `matrix.md` — Field Configurations table, Config C                                     |
