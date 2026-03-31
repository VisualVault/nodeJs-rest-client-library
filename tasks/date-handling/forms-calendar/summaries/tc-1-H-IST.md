# TC-1-H-IST — Summary

**Spec**: [tc-1-H-IST.md](../test-cases/tc-1-H-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Legacy format + IST midnight UTC crossover + ignoreTZ confirmed no-op

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-1-H-IST-run-1.md) |

## Current Interpretation

Config H (DateTime, ignoreTZ=true, useLegacy=true) in IST stores `"2026-03-14T18:30:00.000Z"` — identical to Config G (tc-1-G-IST). The `ignoreTimezone=true` flag has zero effect on legacy popup storage, consistent with all prior findings (tc-1-F-IST = tc-1-E-IST, tc-1-H-BRT = tc-1-G-BRT). This completes all four legacy IST popup slots (E/F/G/H) — all produce the same UTC datetime. The legacy popup always stores raw `toISOString()` regardless of `enableTime` or `ignoreTimezone` settings. GetFieldValue returns the stored value without fake-Z transformation (Bug #5 inactive for useLegacy=true), meaning round-trip drift does not occur for legacy configs — the problem is the storage format itself, not API behavior.

## Next Action

All legacy IST popup tests complete. No further action for Category 1 legacy IST. Next priority: legacy typed input in IST (Category 2, E–H IST) or legacy UTC+0 controls (1-E-UTC0, 1-F-UTC0).
