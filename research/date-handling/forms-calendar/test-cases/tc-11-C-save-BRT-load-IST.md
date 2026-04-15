# TC-11-C-save-BRT-load-IST — Config C, Cross-TZ Reload, BRT→IST: raw preserved; GFV re-interprets as IST UTC

## Environment Specs

| Parameter               | Required Value                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                                               |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).                                                           |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                                               |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                                               |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`                                               |
| **Scenario**            | BRT-saved record reloaded in IST — stored `"2026-03-15T00:00:00"` raw should be preserved; GFV UTC interpretation shifts with timezone |

---

## Preconditions

**P1 — Set system timezone to `Asia/Calcutta`:**

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

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the BRT-saved record** (DateTest-000080, Config C):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=6d2f720d-8621-4a97-a751-90c4cc8588b6&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from BRT (UTC-3) with Config C field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`. This test verifies the raw DateTime string is preserved on cross-TZ reload. The GFV return will differ because Config C's `getCalendarFieldValue` does `new Date(value).toISOString()`, which re-interprets the timezone-ambiguous stored value in the loading timezone.

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
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field6"]
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                                          | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                                                    | ☐   |
| 2   | Verify record loaded                        | Tab title or form header                                       | Title contains `DateTest-000080`                                         | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"` — preserved from BRT save                        | ☐   |
| 4   | Capture GFV (DevTools console)              | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"` — correct UTC if timezone context preserved | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active                       | ☐   |

> **Note on GFV re-interpretation**: The stored value `"2026-03-15T00:00:00"` is timezone-ambiguous. When saved from BRT, it represented BRT midnight (UTC 03:00). When loaded in IST, `getCalendarFieldValue` does `new Date("2026-03-15T00:00:00").toISOString()` which interprets the value as IST midnight (UTC 18:30 on Mar 14) — a different UTC instant. The raw value is preserved but the UTC interpretation shifts. This is a structural limitation of storing timezone-ambiguous timestamps, not a bug in the load path itself.

---

## Fail Conditions

**FAIL-1 (UTC re-interpretation):** Step 4 returns `"2026-03-14T18:30:00.000Z"` instead of `"2026-03-15T03:00:00.000Z"`.

- Interpretation: The stored value `"2026-03-15T00:00:00"` is re-interpreted as IST midnight (UTC-5:30h shift from the original BRT interpretation). `getCalendarFieldValue` does `new Date("2026-03-15T00:00:00").toISOString()` → parses as IST midnight → returns `"2026-03-14T18:30:00.000Z"`. This is expected structural behavior for timezone-ambiguous DateTime storage — the system stores local time without timezone context, so the UTC conversion changes depending on where the form is loaded. The raw value (Step 3) remains correct.

**FAIL-2 (Raw value corrupted):** Step 3 returns anything other than `"2026-03-15T00:00:00"`.

- Interpretation: The form load path modified the stored DateTime value. Unlike date-only fields, DateTime values should pass through `initCalendarValueV1` without date extraction. If the raw value is different, there is a load-time corruption bug.

**FAIL-3 (Wrong timezone):** Step 5 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-5 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config C flags.

---

## Related

| Reference                  | Location                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Matrix row                 | `matrix.md` — row `11-C-save-BRT-load-IST`                                              |
| Config A sibling           | [tc-11-A-save-BRT-load-IST.md](tc-11-A-save-BRT-load-IST.md) — date-only, raw preserved |
| Cat 3 sibling: 3-C-BRT-IST | [tc-3-C-BRT-IST.md](tc-3-C-BRT-IST.md) — if exists                                      |
| Bug #5 analysis            | `analysis/overview.md` — FORM-BUG-5: Fake [Z] in GetFieldValue                          |
| Field config reference     | `matrix.md` — Field Configurations table, Config C                                      |
