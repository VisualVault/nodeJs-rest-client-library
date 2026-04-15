# TC-13-initial-values — DB Storage: initial/preset date fields store UTC via toISOString()

## Environment Specs

| Parameter         | Required Value                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Browser**       | Google Chrome, latest stable (V8 engine)                                            |
| **Platform**      | VisualVault ConnectionQueryAdmin (Database Query Manager)                           |
| **VV Code Path**  | N/A — direct database query; no client-side code path involved                      |
| **Target Record** | DateTest-000004 (saved from BRT, contains both initial-value and user-input fields) |
| **Scope**         | DataField1–4 (`enableInitialValue=true` fields: CurrentDate and Preset configs)     |

---

## Preconditions

**P1 — Access ConnectionQueryAdmin** in the VV admin panel under Enterprise Tools > Connections.

**P2 — Ensure DateTest-000004 exists** with initial-value fields populated (DataField1–4).

**P3 — Create or open a query** targeting the DateTest form data table with a SELECT for all DataField columns, filtered to `DhDocID = 'DateTest-000004'`.

---

## Test Steps

| #   | Action                                    | Test Data                                                            | Expected Result                                                                       | ✓   |
| --- | ----------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                            | See Preconditions P1–P3                                              | Query editor open; connection active                                                  | ☐   |
| 2   | Execute SELECT query                      | `SELECT DhDocID, DataField1, DataField2, DataField3, DataField4 ...` | One row returned for DateTest-000004                                                  | ☐   |
| 3   | Verify DataField1 (Config A, CurrentDate) | —                                                                    | UTC timestamp (e.g., `3/27/2026 8:02:51 PM`) — UTC moment of form creation, not local | ☐   |
| 4   | Verify DataField2 (Config A, Preset)      | —                                                                    | `3/1/2026 3:00:00 AM` — BRT midnight March 1 expressed as UTC (midnight + 3h)         | ☐   |
| 5   | Verify DataField3 (duplicate of DF1)      | —                                                                    | Same value as DataField1                                                              | ☐   |
| 6   | Verify DataField4 (duplicate of DF2)      | —                                                                    | Same value as DataField2                                                              | ☐   |

> **Storage path**: `initCalendarValueV1()` → Date object → `getSaveValue()` → `.toISOString()` strips Z → UTC value stored without timezone suffix. The key finding is that initial-value fields store UTC, while user-input fields store local time — creating a mixed-timezone pattern in the same database table.

---

## Fail Conditions

**FAIL-1 (Local time stored instead of UTC):**
DataField2 returns `3/1/2026 12:00:00 AM` instead of `3/1/2026 3:00:00 AM`.

- Interpretation: `getSaveValue()` changed behavior — it is now storing local time instead of UTC for initial-value fields. This would actually fix the mixed-timezone inconsistency, but represents a behavior change.

---

## Related

| Reference             | Location                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| Matrix row            | `../matrix.md` — row `13-initial-values`                                         |
| Run file              | [`../runs/tc-13-initial-values-run-1.md`](../runs/tc-13-initial-values-run-1.md) |
| Summary               | [`../summaries/tc-13-initial-values.md`](../summaries/tc-13-initial-values.md)   |
| Companion: user-input | [`tc-13-user-input.md`](tc-13-user-input.md) — local time storage                |
| Analysis              | `../analysis.md` — Database Mixed Timezone Storage section                       |
