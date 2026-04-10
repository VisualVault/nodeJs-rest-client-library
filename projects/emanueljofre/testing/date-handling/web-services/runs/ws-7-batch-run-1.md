# WS-7 — Batch Run 1 | 2026-04-02 | BRT | 12 PASS, 0 FAIL

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                 |
| -------------- | ------------------------------------- |
| Date           | 2026-04-02                            |
| Execution Mode | Script (`run-ws-test.js`)             |
| Server TZ      | `America/Sao_Paulo` — UTC-3 (default) |

## Results

| Config | Scenario | Create Value            | Update Value            | Stored After Update      | Status |
| :----: | :------: | ----------------------- | ----------------------- | ------------------------ | :----: |
|   A    |  Change  | `"2026-03-15"`          | `"2026-06-20"`          | `"2026-06-20T00:00:00Z"` |  PASS  |
|   A    | Preserve | `"2026-03-15"`          | (field omitted)         | `"2026-03-15T00:00:00Z"` |  PASS  |
|   A    |   Add    | (no date)               | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  |
|   C    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00Z"` |  PASS  |
|   C    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00Z"` |  PASS  |
|   C    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  |
|   D    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00Z"` |  PASS  |
|   D    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00Z"` |  PASS  |
|   D    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  |
|   H    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00Z"` |  PASS  |
|   H    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00Z"` |  PASS  |
|   H    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  |

## Outcome

**12 PASS, 0 FAIL** — H-9 confirmed. `postFormRevision()` behaves correctly for all scenarios.

## Findings

1. **H-9 confirmed**: Omitting a field from `postFormRevision()` preserves its existing value. This is standard REST partial-update behavior and works correctly for all field configs.

2. **Change works cleanly**: The new value fully replaces the old value. No remnants of the previous value.

3. **Add works cleanly**: Adding a date to a previously empty field via update works exactly like creating with the date initially.

4. **Config-independent**: All 4 configs (A date-only, C DateTime, D DateTime+ignoreTZ, H legacy) behave identically. Field configuration flags have zero effect on the update path (consistent with CB-6).
