# TC-1-F-IST — Summary

**Spec**: [tc-1-F-IST.md](../tc-1-F-IST.md)
**Current status**: PASS — last run 2026-03-31 (IST)
**Bug surface**: none — control/passing scenario; ignoreTZ is a no-op on legacy popup path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | PASS    | [run-1](../runs/tc-1-F-IST-run-1.md) |

## Current Interpretation

Run 1 confirms that Config F (useLegacy=true, ignoreTimezone=true, enableTime=false) stores `"2026-03-14T18:30:00.000Z"` on a legacy calendar popup in IST — identical to Config E (tc-1-E-IST.md). The `ignoreTimezone=true` flag has no observable effect on the legacy popup path. No bugs triggered. The stored value correctly represents IST midnight (2026-03-15 00:00:00+05:30) as its UTC equivalent. This result was predicted by the 2026-03-31 matrix correction derived from the 1-E-IST live test.

## Next Action

Run 2-F-IST (typed input, Config F, IST) to determine whether the legacy typed input path matches the popup (same UTC datetime) or diverges (date-only string), which would confirm Bug #2 on the legacy path under IST.
