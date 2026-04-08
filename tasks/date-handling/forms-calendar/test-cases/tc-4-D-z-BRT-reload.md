# TC-4-D-z-BRT-reload — Config D, URL Param Save/Reload, BRT: FORM-BUG-1 wrong value locked in DB; Bug #1, Bug #5

## Environment Specs

| Parameter               | Required Value                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                            |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                   |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                            |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)            |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableQListener=true` |
| **Scenario**            | URL param `Field5=2026-03-15T00:00:00.000Z` → save → reload → verify bug persists   |

## Preconditions

**P1 — Set system timezone to `America/Sao_Paulo`:**

macOS:

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT-0300"
```

**P4 — Open the TargetDateTest form with URL parameter:**

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=203734a0-5433-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939&Field5=2026-03-15T00%3A00%3A00.000Z
```

**P5 — Verify code path** (DevTools console):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1 is active
```

## Test Steps

| #   | Action                        | Test Data                                                | Expected Result              | ✓   |
| --- | ----------------------------- | -------------------------------------------------------- | ---------------------------- | --- |
| 1   | Complete setup                | See Preconditions P1–P5                                  | All checks pass              | ☐   |
| 2   | Capture pre-save raw value    | `VV.Form.VV.FormPartition.getValueObjectValue('Field5')` | `"2026-03-14T21:00:00"`      | ☐   |
| 3   | Save the form                 | Click Save button                                        | Form saves, DataID assigned  | ☐   |
| 4   | Reload the page               | F5 or browser reload                                     | Form reloads from server     | ☐   |
| 5   | Capture post-reload raw value | `VV.Form.VV.FormPartition.getValueObjectValue('Field5')` | `"2026-03-14T21:00:00"`      | ☐   |
| 6   | Capture post-reload API value | `VV.Form.GetFieldValue('Field5')`                        | `"2026-03-14T21:00:00.000Z"` | ☐   |

> Step 2 shows FORM-BUG-1: input was UTC midnight (`T00:00:00.000Z`) but Z was stripped, `.000` caused UTC parse → BRT 21:00 Mar 14. Steps 5-6 confirm this wrong value is now permanently stored in the DB.

## Fail Conditions

**FAIL-1 (Value changed after reload):** Steps 5 or 6 differ from expected.

- If raw becomes `"2026-03-15T00:00:00"`: the server-side save corrected the value (unexpected but positive).
- If raw drifts further: additional bug in save/reload path.

**FAIL-2 (Pre-save value correct):** Step 2 returns `"2026-03-15T00:00:00"`.

- Would mean FORM-BUG-1 is not present — Z was handled correctly. Disproves the `.000` residue finding.

## Related

| Reference            | Location                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| Matrix row           | `matrix.md` — row `4-D-z-BRT-reload`                                      |
| Pre-save sibling     | `tc-4-D-z-BRT.md` — URL param input without save                          |
| `.000` documentation | `docs/reference/form-fields.md` — JavaScript `.000` Millisecond Parsing   |
| Run history          | [`summaries/tc-4-D-z-BRT-reload.md`](../summaries/tc-4-D-z-BRT-reload.md) |
