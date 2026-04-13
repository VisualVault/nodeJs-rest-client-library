# TC-15-sfv-widget — Summary

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md)
**Current status**: PASS — cross-env comparison complete 2026-04-13
**Bug surface**: Bug #5 confirmed on both v1 and v2

## Run History

| Run | Date | TZ | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-13 | BRT | PASS (vvdemo) | [run-1](../runs/tc-15-sfv-widget-run-1.md) |

## Current Interpretation

VV-level values identical across v1 and v2: raw="2026-03-15T14:30:00", api="2026-03-15T14:30:00.000Z" (Bug #5 — spurious Z suffix on API read). Widget-level access blocked on both (DOM selector returns null). Bug #5 is not Kendo-version-specific.

## Next Action

Complete.
