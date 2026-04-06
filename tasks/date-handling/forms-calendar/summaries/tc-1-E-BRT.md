# TC-1-E-BRT — Summary

**Spec**: [tc-1-E-BRT.md](../test-cases/tc-1-E-BRT.md)
**Current status**: FAIL-1 — last run 2026-04-06 (BRT, Playwright audit)
**Bug surface**: Legacy format — useLegacy=true popup stores full UTC datetime instead of date-only string

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-E-BRT-run-1.md) |
| 2   | 2026-04-06 | BRT | FAIL-1  | [run-2](../runs/tc-1-E-BRT-run-2.md) |

## Current Interpretation

Config E (date-only, ignoreTZ=false, useLegacy=true) in BRT stores `"2026-03-15T03:00:00.000Z"` — a full UTC datetime string — rather than the date-only `"2026-03-15"` produced by modern Configs A/B. This is an inherent characteristic of the legacy popup path: it stores the UTC datetime of local midnight regardless of `enableTime=false`. For BRT (UTC-3), the UTC date portion is still March 15 (same calendar day), so the date itself is not shifted — only the format differs. GetFieldValue returns the same UTC datetime string unchanged. The FAIL-1 outcome reflects the format mismatch: code consuming this field and expecting `"2026-03-15"` will receive `"2026-03-15T03:00:00.000Z"`, which has different parsing semantics and downstream behavior.

## Next Action

Bug #2 audit complete. Run-2 (Playwright automated, 2026-04-06) confirms run-1 (manual, 2026-03-31) — values match exactly. Dual-method verification achieved. Cross-category comparison with TC-2-E-BRT (typed: `"2026-03-15"`) confirms format divergence (Bug #2). IST case already documented in tc-1-E-IST.md.
