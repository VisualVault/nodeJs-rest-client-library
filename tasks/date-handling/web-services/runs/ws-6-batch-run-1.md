# WS-6 — Batch Run 1 | 2026-04-02 | BRT | 12 PASS, 0 FAIL

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter              | Value                                 |
| ---------------------- | ------------------------------------- |
| Date                   | 2026-04-02                            |
| Execution Mode         | Script (`run-ws-test.js`)             |
| Server TZ              | `America/Sao_Paulo` — UTC-3 (default) |
| Harness serverTimezone | `America/Sao_Paulo`                   |

## Results — On Create

| Scenario         | Config A (date-only) | Config D (DateTime+ignoreTZ) | Notes                     |
| ---------------- | :------------------: | :--------------------------: | ------------------------- |
| `""`             |        `null`        |            `null`            | Empty → null              |
| `null`           |        `null`        |            `null`            | Null → null               |
| (omitted)        |        `null`        |            `null`            | Omit → null               |
| `"null"`         |        `null`        |            `null`            | Literal string not stored |
| `"Invalid Date"` |        `null`        |            `null`            | Bug #6 string → null      |

## Results — On Update (Clear)

| Scenario                            | Config A                                         | Config D                                         |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Create `"2026-03-15"` → Update `""` | before: `"2026-03-15T00:00:00Z"` → after: `null` | before: `"2026-03-15T00:00:00Z"` → after: `null` |

## Outcome

**12 PASS, 0 FAIL** — H-3 fully confirmed. API handles empty/null/special values cleanly.

## Findings

1. **H-3 fully confirmed**: All empty/null variants store `null` in the database. API never returns `""` or `"Invalid Date"` for empty fields (contrast: Forms `GetFieldValue` returns `"Invalid Date"` for empty Config D — Bug #6).

2. **Literal `"null"` string**: Not stored as the string "null" — the server parses it as a null/empty value. Safe behavior.

3. **`"Invalid Date"` string**: Not stored as the string "Invalid Date" — the server rejects it as an invalid date and stores null. This means if a script accidentally sends the Bug #6 output (`"Invalid Date"` from `GetFieldValue` on empty Config D), it will clear the field rather than corrupting it.

4. **Field clearing via update**: Sending `""` (empty string) via `postFormRevision` successfully clears an existing date value → stores `null`. This is the correct way to clear date fields via API.

5. **Config-independent**: Configs A (date-only) and D (DateTime+ignoreTZ) behave identically for all empty/null scenarios. Field configuration has no effect on empty value handling.
