# TC-3-C-IST-BRT — Summary

**Spec**: [tc-3-C-IST-BRT.md](../test-cases/tc-3-C-IST-BRT.md)
**Current status**: FAIL — last run 2026-04-01 (BRT)
**Bug surface**: Bug #1 (timezone marker stripping) + Bug #4 (legacy save format)

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | BRT | FAIL    | [run-1](../runs/tc-3-C-IST-BRT-run-1.md) |

## Current Interpretation

Cross-TZ reload of Config C (DateTime, ignoreTimezone=false) from IST→BRT confirms that timezone information is lost on save. The raw string `"2026-03-15T00:00:00"` survives the DB round-trip, but GFV reinterprets it as BRT midnight (`T03:00:00.000Z`) instead of the original IST midnight (`T18:30:00.000Z`), a +8.5h UTC shift. This is the mirror of 3-C-BRT-IST (which showed the same shift in reverse). The pair confirms that Config C DateTime values are always interpreted in the loader's timezone, not the saver's — making cross-TZ date queries fundamentally unreliable for this config.

## Next Action

Re-run after Bug #1+#4 fix deployed. Compare with Config D cross-TZ reload (3-D-IST-BRT already PASS — Config D raw is TZ-invariant by design).
