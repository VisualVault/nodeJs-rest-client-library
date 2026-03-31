# TC-1-E-IST — Summary

**Spec**: [tc-1-E-IST.md](../test-cases/tc-1-E-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Legacy format + IST midnight UTC crossover — stored UTC datetime has previous-day date portion

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-1-E-IST-run-1.md) |

## Current Interpretation

Config E (date-only, ignoreTZ=false, useLegacy=true) in IST stores `"2026-03-14T18:30:00.000Z"` — two compounding failure modes: (1) the legacy path stores a full UTC datetime instead of a date-only string, and (2) the UTC datetime for IST midnight March 15 falls on March 14 in UTC (18:30Z). The field display shows `03/15/2026` (correct, re-converted to local IST), but storage contains a March 14 UTC date. This is the worst-case legacy scenario: a developer reading this value would receive March 14 UTC datetime when March 15 local was intended. Compare with tc-1-E-BRT.md (FAIL-1 but BRT midnight = same UTC day, so UTC date portion is still March 15). The IST case makes the date error visible in the stored value itself.

## Next Action

IST legacy popup behavior documented for Config E. Expected to generalize to Configs F, G, H in IST (pending). Run tc-1-F-IST.md, tc-1-G-IST.md, tc-1-H-IST.md to confirm the pattern.
