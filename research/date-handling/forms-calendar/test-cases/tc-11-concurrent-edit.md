# TC-11-concurrent-edit — Config D, Concurrent Edit, BRT→IST: day-boundary crossing + compound +2:30h net drift (FORM-BUG-5)

## Environment Specs

| Parameter               | Required Value                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                             |
| **System Timezone**     | Multi-TZ: Phase A = `America/Sao_Paulo` (BRT, UTC-3); Phase B = `Asia/Calcutta` (IST, UTC+5:30)      |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                             |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5-A and P5-B)                  |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`              |
| **Scenario**            | User A (BRT) sets a value + round-trip → User B (IST) loads that value + round-trip → compound drift |

---

## Preconditions — Phase A (BRT — User A)

**P1-A — Set system timezone to `America/Sao_Paulo`:**

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

**P2-A — Restart Chrome** after the timezone change.

**P3-A — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1-A and P2-A
```

**P4-A — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5-A — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6-A — Locate the target field by configuration** (DevTools console):

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
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6-A returns more than one field, use the first result and note the ambiguity.
> If P6-A returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps — Phase A (BRT — User A Sets Value + Round-Trip)

| #   | Action                               | Test Data                                                                      | Expected Result                                      | ✓   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------- | --- |
| 1   | Complete BRT setup                   | See Preconditions P1-A through P6-A                                            | All P1-A through P6-A checks pass                    | ☐   |
| 2   | Set initial value (DevTools)         | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`                 | ☐   |
| 3   | Capture raw (DevTools)               | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                              | ☐   |
| 4   | Capture GFV (DevTools)               | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct: no transformation | ☐   |
| 5   | Execute BRT round-trip (DevTools)    | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                             | ☐   |
| 6   | Capture post-BRT-trip raw (DevTools) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — correct: no drift          | ☐   |
| 7   | Confirm BRT active (DevTools)        | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT          | ☐   |

---

## Preconditions — Phase B (IST — User B)

**P1-B — Set system timezone to `Asia/Calcutta`:**

macOS:

```bash
sudo systemsetup -settimezone Asia/Calcutta
```

Windows (run as Administrator):

```bat
tzutil /s "India Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "India Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone Asia/Calcutta
```

**P2-B — Restart Chrome** after the timezone change.

**P3-B — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1-B and P2-B
```

**P4-B — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5-B — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
```

**P6-B — Locate the target field by configuration** (DevTools console):

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

---

## Test Steps — Phase B (IST — User B Loads BRT Value + Round-Trip)

| #   | Action                                       | Test Data                                                                      | Expected Result                                      | ✓   |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- | --- |
| 8   | Complete IST setup                           | See Preconditions P1-B through P6-B                                            | All P1-B through P6-B checks pass                    | ☐   |
| 9   | Load User A's BRT post-trip value (DevTools) | `VV.Form.SetFieldValue('<FIELD_NAME>', '<BRT post-trip value from step 6>')`   | Field updates                                        | ☐   |
| 10  | Capture raw (DevTools)                       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — should match BRT value     | ☐   |
| 11  | Capture GFV (DevTools)                       | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct: no transformation | ☐   |
| 12  | Execute IST round-trip (DevTools)            | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                             | ☐   |
| 13  | Capture final raw (DevTools)                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — correct: no drift          | ☐   |
| 14  | Confirm IST active (DevTools)                | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-14T18:30:00.000Z"` — confirms IST          | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 BRT -3h drift + day boundary crossing):** Step 4 returns `"2026-03-15T00:00:00.000Z"` (fake Z). Step 6 returns `"2026-03-14T21:00:00"` instead of `"2026-03-15T00:00:00"`. The fake Z causes moment to parse local time as UTC, subtracting 3h and crossing the day boundary from March 15 to March 14.

- Interpretation: FORM-BUG-5 active. The -3h BRT drift moves the stored value to the previous calendar day — visually more dramatic than the IST-first variant. Recovery: proceed to Phase B; the compound drift still applies.

**FAIL-2 (Bug #5 IST +5:30h drift on drifted value):** Step 11 returns `"2026-03-14T21:00:00.000Z"` (fake Z on BRT-drifted value). Step 13 returns `"2026-03-15T02:30:00"` instead of expected. The IST round-trip applies +5:30h to the already-drifted `T21:00:00` value, crossing back to March 15 but at 02:30.

- Interpretation: FORM-BUG-5 compounds across users. IST offset (+5:30) applied to BRT-corrupted value (-3h) produces net +2:30h from original midnight.

**FAIL-3 (Compound +2:30h net):** After both TZ round-trips, the value shifted from midnight (`T00:00:00`) to `T02:30:00` — net +2:30h (BRT -3h then IST +5:30h). Same net drift as the IST→BRT variant (tc-11-D-concurrent-IST-edit), proving drift is commutative.

- Interpretation: Neither user is aware the other's timezone contributed to the corruption. In production: BRT admin sets a date → IST helpdesk reviews and updates → date silently shifts +2:30h.

**FAIL-4 (Day boundary crossing in intermediate state):** Step 6 shows `"2026-03-14T21:00:00"` — the BRT round-trip moved the date to the **previous calendar day**. While the IST round-trip brings it back to March 15 (at 02:30), the intermediate state crosses a day boundary. Any system reading the record between Phase A and Phase B sees the wrong date entirely.

- Interpretation: In multi-user workflows, there is a window where the stored date is on the wrong day. Audit logs, notifications, or dashboards querying the record during this window would show March 14 instead of March 15.

**FAIL-5 (Wrong timezone):** Step 7 or Step 14 does not return the expected BRT or IST reference value.

- Interpretation: System timezone is wrong for that phase. Re-do P1 and P2.

**FAIL-6 (V2 active):** P5-A or P5-B returns `true`.

- Interpretation: V2 code path active.

**FAIL-7 (Field not found):** P6-A or P6-B returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference                        | Location                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Matrix row                       | `matrix.md` — row `11-concurrent-edit`                                                               |
| Bug #5 analysis                  | `analysis/bug-5.md` — FORM-BUG-5: fake Z in GetFieldValue                                            |
| Sibling: IST→BRT variant         | [tc-11-D-concurrent-IST-edit.md](tc-11-D-concurrent-IST-edit.md) — same net drift, reversed TZ order |
| Sibling: sequential round-trip   | [tc-11-roundtrip-cross.md](tc-11-roundtrip-cross.md) — same +2:30h drift mechanism                   |
| Sibling: 9-D-BRT-1 (-3h/trip)    | [tc-9-D-BRT-1.md](tc-9-D-BRT-1.md) — single BRT round-trip                                           |
| Sibling: 9-D-IST-1 (+5:30h/trip) | [tc-9-D-IST-1.md](tc-9-D-IST-1.md) — single IST round-trip                                           |
| Run history                      | `summaries/tc-11-concurrent-edit.md`                                                                 |
