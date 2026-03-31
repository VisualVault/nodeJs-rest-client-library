# TC-2-E-IST — Summary

**Spec**: [tc-2-E-IST.md](../tc-2-E-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Bug #7 (date-only -1 day shift in UTC+), Bug #2 (popup vs typed format inconsistency)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-E-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed in legacy typed input path in IST. The typed date `03/15/2026` is parsed as IST midnight, converted to UTC date `"2026-03-14"` — a -1 day shift identical to non-legacy configs A/B (tc-2-A-IST, tc-2-B-IST). Bug #2 is also confirmed: the popup path (1-E-IST) stores full UTC datetime `"2026-03-14T18:30:00.000Z"` while the typed path stores date-only `"2026-03-14"` — different formats for the same intended date, both wrong in IST.

## Next Action

Run 2-F-IST (sibling — same as E but with ignoreTZ=true) to confirm ignoreTZ has no effect on legacy date-only typed input in IST.
