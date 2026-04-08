# TC-13-preset-vs-user-input — Summary

**Spec**: [tc-13-preset-vs-user-input.md](../test-cases/tc-13-preset-vs-user-input.md)
**Current status**: FAIL — last run 2026-04-08 (BRT+IST)
**Bug surface**: Mixed timezone storage — preset stores UTC, user-input stores local, within same record

## Run History

| Run | Date       | TZ      | Outcome | File                                                 |
| --- | ---------- | ------- | ------- | ---------------------------------------------------- |
| 1   | 2026-04-08 | BRT+IST | FAIL    | [run-1](../runs/tc-13-preset-vs-user-input-run-1.md) |

## Current Interpretation

Preset and user-input fields use different code paths that produce different storage semantics. Preset fields store UTC timestamps (via `new Date().toISOString()`) while user-input fields store local time (via `getSaveValue()` → `moment().format()`). This creates a mixed-timezone database where the same `datetime` column has two different meanings depending on whether the value came from an initial value or user input. The IST evidence is particularly stark — the preset for March 1 stores as February 28 (crossing a month boundary due to UTC conversion).

## Next Action

Re-run after storage normalization fix. Verify both code paths produce identical storage for the same input date and timezone.
