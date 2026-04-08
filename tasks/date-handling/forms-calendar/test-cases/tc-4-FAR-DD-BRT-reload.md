# TC-4-FAR-DD-BRT-reload — FillinRelate D→D, Save/Reload, BRT: Compound bug locked in DB; Bug #5, Bug #1

## Environment Specs

| Parameter               | Required Value                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                      |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                             |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                      |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                      |
| **Source Field Config** | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`                         |
| **Target Field Config** | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableQListener=true` |
| **Scenario**            | Source SFV(`2026-03-15T00:00:00`) → GFV → URL param → Target D → save → reload                |

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

**P4 — Open the source DateTest form** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1 is active
```

## Test Steps

| #   | Action                                             | Test Data                                                               | Expected Result                        | ✓   |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- | --- |
| 1   | Complete setup                                     | See Preconditions P1–P5                                                 | All checks pass                        | ☐   |
| 2   | Set value on source Config D field                 | `VV.Form.SetFieldValue('Field5', '2026-03-15T00:00:00')`                | Field displays `03/15/2026 12:00 AM`   | ☐   |
| 3   | Capture source raw                                 | `VV.Form.VV.FormPartition.getValueObjectValue('Field5')`                | `"2026-03-15T00:00:00"`                | ☐   |
| 4   | Capture source GFV (what FillinAndRelate passes)   | `VV.Form.GetFieldValue('Field5')`                                       | `"2026-03-15T00:00:00.000Z"` (fake Z)  | ☐   |
| 5   | Open TargetDateTest with Step 4 value as URL param | Navigate to TargetDateTest URL + `&Field5=2026-03-15T00%3A00%3A00.000Z` | Form loads with value                  | ☐   |
| 6   | Capture target pre-save raw                        | `VV.Form.VV.FormPartition.getValueObjectValue('Field5')`                | `"2026-03-14T21:00:00"` (compound bug) | ☐   |
| 7   | Save the target form                               | Click Save button                                                       | Form saves, DataID assigned            | ☐   |
| 8   | Reload the page                                    | F5 or browser reload                                                    | Form reloads from server               | ☐   |
| 9   | Capture post-reload raw                            | `VV.Form.VV.FormPartition.getValueObjectValue('Field5')`                | `"2026-03-14T21:00:00"`                | ☐   |
| 10  | Capture post-reload API                            | `VV.Form.GetFieldValue('Field5')`                                       | `"2026-03-14T21:00:00.000Z"`           | ☐   |

> The chain: Source stores BRT midnight → GFV adds fake `.000Z` → target strips Z but `.000` remains → `new Date()` parses as UTC midnight → BRT 21:00 Mar 14. Save locks this wrong value into the DB. Reload confirms it persists.

## Fail Conditions

**FAIL-1 (Source GFV has no fake Z):** Step 4 returns `"2026-03-15T00:00:00"`.

- Would mean FORM-BUG-5 is not present. The chain test depends on the fake Z.

**FAIL-2 (Target pre-save is correct):** Step 6 returns `"2026-03-15T00:00:00"`.

- Would mean bugs cancel instead of compound. Disproves the `.000` residue finding.

**FAIL-3 (Post-reload differs from pre-save):** Steps 9-10 differ from Steps 6.

- Would indicate a save/reload path bug beyond FORM-BUG-1/5.

## Related

| Reference               | Location                                                                        |
| ----------------------- | ------------------------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `4-FAR-DD-BRT-reload`                                         |
| Chain sibling           | `tc-4-FAR-DD-BRT.md` — same chain without save                                  |
| `.000` documentation    | `docs/reference/form-fields.md` — JavaScript `.000` Millisecond Parsing         |
| FillinAndRelate example | `examples/fillinandrelated.js` — production pattern                             |
| Run history             | [`summaries/tc-4-FAR-DD-BRT-reload.md`](../summaries/tc-4-FAR-DD-BRT-reload.md) |
