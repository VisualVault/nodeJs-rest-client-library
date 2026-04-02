# TC-3-B-IST-BRT — Config B, Server Reload, IST→BRT: Bug #7 wrong day permanently stored; ignoreTZ inert for date-only

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. No DST active (BRT abolished DST in 2019).           |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | IST-saved record reloaded in BRT — intended `"2026-03-15"`, Bug #7 stored `"2026-03-14"` |

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

**P4 — Open the IST-saved record** (DateTest-000485 Rev 1):

> This record was saved from IST (UTC+5:30, 2026-04-02) with Config B field set to `03/15/2026`. Due to Bug #7, the stored value is `"2026-03-14"` (-1 day). This test verifies the corrupted value persists on BRT reload — the damage was done during the IST save, not during cross-TZ reload.

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

## Test Steps

| #   | Action                             | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                              | `DateTest-000485 Rev 1` (or current revision)      | ☐   |
| 3   | Verify display after BRT reload    | Visually inspect the target field (identified in P6)           | `03/15/2026`                                       | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                     | ☐   |
| 6   | Verify BRT timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> The `ignoreTimezone=true` flag has no effect on date-only fields. Config B behaves identically to Config A for the save/reload cycle. The damage occurs during the IST save (Bug #7: `normalizeCalValue()` → `moment('03/15/2026').toDate()` → IST local midnight → `getSaveValue()` extracts UTC date → `"2026-03-14"`). The BRT reload simply reads the already-corrupted stored value.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior.

**FAIL-3 (Bug #7 — wrong day permanently stored):**
Step 4 returns `"2026-03-14"` instead of `"2026-03-15"`. Display (Step 3) shows `03/14/2026`. The date was corrupted during the IST save — Bug #7 caused `normalizeCalValue()` to parse `"03/15/2026"` as IST local midnight (2026-03-14T18:30:00Z), then `getSaveValue()` extracted the UTC date → `"2026-03-14"` (-1 day). The BRT reload sees the already-corrupted value.

- Interpretation: Bug #7 confirmed for Config B in IST, identical to Config A (3-A-IST-BRT, FAIL). `ignoreTimezone=true` does not prevent Bug #7 for date-only fields. The corruption is permanent — the wrong date is stored in the database.

**FAIL-4 (GFV transforms the stored value):**
Step 5 returns a value other than the raw stored value from Step 4.

- Interpretation: `getCalendarFieldValue()` is transforming the date-only value for Config B. For date-only fields (`enableTime=false`), GFV should return the raw stored value unchanged.

**FAIL-5 (Wrong BRT offset in isoRef):**
Step 6 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: BRT is not active in the browser. Abort and re-check P1–P2.

## Related

| Reference                        | Location                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| Matrix row                       | `matrix.md` — row `3-B-IST-BRT`                             |
| Run file                         | [run-1](../runs/tc-3-B-IST-BRT-run-1.md)                    |
| Summary                          | [summary](../summaries/tc-3-B-IST-BRT.md)                   |
| Bug #7 analysis                  | `analysis.md` — Bug #7: SetFieldValue Wrong Day (UTC+ only) |
| Config A equivalent: 3-A-IST-BRT | [tc-3-A-IST-BRT.md](tc-3-A-IST-BRT.md)                      |
| Same-TZ sibling: 3-B-BRT-BRT     | [tc-3-B-BRT-BRT.md](tc-3-B-BRT-BRT.md)                      |
| Cross-TZ BRT→IST: 3-B-BRT-IST    | [tc-3-B-BRT-IST.md](tc-3-B-BRT-IST.md)                      |
| Field config reference           | `matrix.md` — Field Configurations table, Config B          |
