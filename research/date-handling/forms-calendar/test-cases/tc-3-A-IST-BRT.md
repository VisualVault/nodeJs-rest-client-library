# TC-3-A-IST-BRT — Config A, Server Reload, IST→BRT: Bug #7 wrong day baked in during IST save; persists on BRT reload

## Environment Specs

| Parameter               | Required Value                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                     |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. No DST active (BRT abolished DST in 2019).               |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                     |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                     |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`    |
| **Scenario**            | IST-saved record reloaded in BRT — stored value should be `"2026-03-15"` if save was correct |

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

**P4 — Open the IST-saved record** (DateTest-000084 Rev 1):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from IST (UTC+5:30, 2026-04-01) with Config A field set to `03/15/2026`. Bug #7 was active during the IST save: `normalizeCalValue()` parsed the date-only string as IST local midnight (2026-03-14T18:30:00Z), then `getSaveValue()` extracted the UTC date → stored `"2026-03-14"` instead of `"2026-03-15"`. This test verifies the corrupted value persists on cross-TZ BRT reload.

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
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField7"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                             | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                              | `DateTest-000084 Rev 1` (or current revision)      | ☐   |
| 3   | Verify display after BRT reload    | Visually inspect the target field (identified in P6)           | `03/15/2026`                                       | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                     | ☐   |
| 6   | Verify BRT timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Note on Bug #7 impact**: The IST-saved record (DateTest-000084) had Bug #7 active during save. `normalizeCalValue()` parsed the date-only input as IST midnight (previous UTC day), so the DB stores `"2026-03-14"` instead of `"2026-03-15"`. Steps 3–5 are expected to FAIL (show `"2026-03-14"`) while Bug #7 is present. The Expected column reflects correct behavior (no bug). The BRT reload path itself introduces no additional shift — proven by TC-3-A-BRT-BRT (PASS) and TC-3-A-BRT-IST (PASS) which both preserve the stored value unchanged.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. The test cannot proceed because the reload behavior depends on the local timezone. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Bug #7 — wrong day baked in during IST save):**
Steps 3–5 return `"2026-03-14"` / `03/14/2026` instead of `"2026-03-15"` / `03/15/2026`. The IST save path parsed the date-only string `"03/15/2026"` as IST local midnight (`2026-03-14T18:30:00Z`), then `getSaveValue()` extracted the UTC date → stored `"2026-03-14"`. The BRT reload faithfully renders this corrupted value — the damage was permanent at save time.

- Interpretation: Bug #7 confirmed — date-only fields store the wrong day when saved from UTC+ timezones. The corruption is permanent: once the wrong day is in the DB, all subsequent reloads from any timezone display the wrong date. This is the reverse-direction confirmation of TC-3-A-BRT-IST (PASS), which proved that correctly-saved BRT records survive IST reload. Together they show Bug #7 is a save-path defect, not a load-path defect.

**FAIL-4 (GFV transforms the stored value):**
Step 5 returns a value different from Step 4.

- Interpretation: `getCalendarFieldValue()` is transforming the date-only value for Config A. For Config A (`enableTime=false`, `ignoreTimezone=false`, `!useLegacy`), GFV should return the raw stored value unchanged. Any transformation indicates an undocumented bug in the GFV path for date-only fields.

**FAIL-5 (Wrong BRT offset in isoRef):**
Step 6 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: BRT is not active in the browser's JS engine. The timezone change did not take effect. Abort and re-check P1–P2.

## Related

| Reference                  | Location                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Matrix row                 | `../matrix.md` — row `3-A-IST-BRT`                                    |
| Summary                    | [summary](../summaries/tc-3-A-IST-BRT.md)                             |
| Bug #7 analysis            | `../analysis.md` — Bug #7 (date-only SetFieldValue wrong day in UTC+) |
| Sibling: reverse direction | [tc-3-A-BRT-IST.md](tc-3-A-BRT-IST.md) — BRT→IST (PASS)               |
| Sibling: same-TZ BRT-BRT   | [tc-3-A-BRT-BRT.md](tc-3-A-BRT-BRT.md) — BRT→BRT (PASS)               |
| Sibling: IST→BRT Config D  | [tc-3-D-IST-BRT.md](tc-3-D-IST-BRT.md) — DateTime cross-TZ (PASS)     |
| Sibling: IST→BRT Config B  | matrix.md — row `3-B-IST-BRT` (PENDING — same prediction)             |
| Field config reference     | `../../CLAUDE.md` — Test Form Fields table                            |
