# TC-9-D-UTC0 — Summary

**Spec**: [tc-9-D-UTC0.md](../test-cases/tc-9-D-UTC0.md)
**Current status**: PASS — last run 2026-04-03 (UTC0, Chromium)
**Bug surface**: Bug #5 structurally present but 0 drift at UTC+0

## Run History

| Run | Date       | TZ   | Outcome | File                                  |
| --- | ---------- | ---- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | UTC0 | PASS    | [run-1](../runs/tc-9-D-UTC0-run-1.md) |

## Current Interpretation

Fake Z is structurally present in the GFV output (finalApi has .000Z suffix), but produces 0 drift because local-to-UTC offset is 0. The bug is coincidentally invisible at UTC+0. This confirms Bug #5 is structurally present but practically invisible when the tester timezone matches UTC.

## Next Action

No further action.
