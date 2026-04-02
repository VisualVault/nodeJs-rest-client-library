# TC-12-near-midnight-2-IST — Summary

**Spec**: [tc-12-near-midnight-2-IST.md](../test-cases/tc-12-near-midnight-2-IST.md)
**Current status**: FAIL-2 — last run 2026-04-02 (IST)
**Bug surface**: Bug #5 — +5:30h drift per round-trip, day crosses forward after 1 trip from 23:00

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-02 | IST | FAIL-2  | [run-1](../runs/tc-12-near-midnight-2-IST-run-1.md) |

## Current Interpretation

Near-midnight round-trip at 23:00 IST drifts +5:30h to 04:30 next day — day crosses FORWARD after just 1 trip. Opposite of BRT (-3h, stays same day after 1 trip). IST is more destructive for near-midnight values because +5:30h > remaining hours to midnight (1h). Demonstrates Bug #5 drift direction is TZ-dependent.

## Next Action

No further action — IST near-midnight drift behavior characterized.
