# TC-13-C-vs-D-storage — Summary

**Spec**: [tc-13-C-vs-D-storage.md](../test-cases/tc-13-C-vs-D-storage.md)
**Current status**: FAIL — last run 2026-04-08 (BRT)
**Bug surface**: Mixed timezone storage — Config C stores real UTC, Config D stores local time

## Run History

| Run | Date       | TZ  | Outcome | File                                           |
| --- | ---------- | --- | ------- | ---------------------------------------------- |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-13-C-vs-D-storage-run-1.md) |

## Current Interpretation

Browser-saved records have different storage semantics for Config C and Config D despite both being DateTime fields. Config C stores real UTC (3h ahead of local for BRT), Config D stores local time as-is. This creates a mixed-timezone database where the same `datetime` column means different things depending on the field's configuration. The API write path does NOT exhibit this divergence — it stores uniformly, confirming the problem is in the Forms Angular `getSaveValue()` pipeline.

## Next Action

Re-run after `getSaveValue()` normalization fix. Verify both configs store the same value for the same input. Cross-reference with IST data for a non-BRT perspective.
