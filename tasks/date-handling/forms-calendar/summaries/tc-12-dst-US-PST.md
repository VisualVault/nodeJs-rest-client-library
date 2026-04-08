# TC-12-dst-US-PST — Summary

**Spec**: [tc-12-dst-US-PST.md](../test-cases/tc-12-dst-US-PST.md)
**Current status**: FAIL — last run 2026-04-08 (PDT)
**Bug surface**: FORM-BUG-5 (DST + day boundary crossing)

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-08 | PDT | FAIL    | [run-1](../runs/tc-12-dst-US-PST-run-1.md) |

## Current Interpretation

DST spring-forward creates a compound anomaly with Bug #5. The non-existent 2AM is resolved to 3AM PDT, then the fake Z round-trip lands in the pre-DST (PST, UTC-8) window, causing -8h drift and crossing both the day boundary and the DST boundary. This is the most extreme Bug #5 variant tested — it demonstrates that DST transitions amplify the fake Z problem.

## Next Action

No further action — DST anomaly confirmed.
