# TC-13-user-input — DB Storage: user-input calendar fields store local time via getSaveValue()

## Environment Specs

| Parameter         | Required Value                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Browser**       | Google Chrome, latest stable (V8 engine)                                            |
| **Platform**      | VisualVault ConnectionQueryAdmin (Database Query Manager)                           |
| **VV Code Path**  | N/A — direct database query; no client-side code path involved                      |
| **Target Record** | DateTest-000004 (saved from BRT, contains both initial-value and user-input fields) |
| **Scope**         | DataField5–7 (`enableInitialValue=false` fields: user-input Configs A, C, D)        |

---

## Preconditions

Same as [tc-13-initial-values.md](tc-13-initial-values.md) P1–P3.

---

## Test Steps

| #   | Action                                   | Test Data                                                | Expected Result                                                       | ✓   |
| --- | ---------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- | --- |
| 1   | Complete setup                           | See Preconditions P1–P3                                  | Query editor open; connection active                                  | ☐   |
| 2   | Execute SELECT query                     | `SELECT DhDocID, DataField5, DataField6, DataField7 ...` | One row returned for DateTest-000004                                  | ☐   |
| 3   | Verify DataField5 (Config D, user input) | —                                                        | `3/15/2026 12:00:00 AM` — local BRT midnight, not UTC                 | ☐   |
| 4   | Verify DataField6 (Config C, user input) | —                                                        | `3/15/2026 12:00:00 AM` — local BRT midnight, same as Config D        | ☐   |
| 5   | Verify DataField7 (Config A, user input) | —                                                        | `3/15/2026 12:00:00 AM` — local BRT midnight, same as Configs C and D | ☐   |

> **Storage path**: User sets value via popup/typed input → `getSaveValue()` extracts local time components → stores `"MM/dd/yyyy HH:mm:ss"` without timezone context. This contrasts with initial-value fields (tc-13-initial-values) which store UTC. A SQL query comparing DataField2 (preset, UTC `3:00 AM`) with DataField5 (user-input, local `12:00 AM`) for the same logical date would not match — this is the mixed-timezone storage pattern.

---

## Fail Conditions

**FAIL-1 (UTC stored instead of local time):**
DataField5 returns `3/15/2026 3:00:00 AM` instead of `3/15/2026 12:00:00 AM`.

- Interpretation: `getSaveValue()` is now storing UTC via `toISOString()` for user-input fields. This would actually resolve the mixed-timezone inconsistency but changes behavior.

---

## Related

| Reference                 | Location                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| Matrix row                | `../matrix.md` — row `13-user-input`                                     |
| Run file                  | [`../runs/tc-13-user-input-run-1.md`](../runs/tc-13-user-input-run-1.md) |
| Summary                   | [`../summaries/tc-13-user-input.md`](../summaries/tc-13-user-input.md)   |
| Companion: initial-values | [`tc-13-initial-values.md`](tc-13-initial-values.md) — UTC storage       |
| Analysis                  | `../analysis.md` — Database Mixed Timezone Storage section               |
