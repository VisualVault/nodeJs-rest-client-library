# TC-13-ws-input — Summary

**Spec**: [tc-13-ws-input.md](../test-cases/tc-13-ws-input.md)
**Current status**: PASS — last run 2026-04-08 (BRT)
**Bug surface**: none — API write path stores dates uniformly

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-08 | BRT | PASS    | [run-1](../runs/tc-13-ws-input-run-1.md) |

## Current Interpretation

The REST API write path (postForms) stores dates uniformly for all field configurations. Unlike the browser save path, there is no Config C vs Config D storage divergence. This confirms that the mixed timezone storage pattern is exclusive to the Forms Angular `getSaveValue()` pipeline. Developers using the API to set dates can rely on consistent storage.

## Next Action

No further action — closed PASS. Cross-reference with 13-C-vs-D-storage for the browser-path contrast.
