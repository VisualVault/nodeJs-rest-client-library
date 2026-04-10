# TC-3-D-BRT-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-2-9-form-load-server-reload-brt.md](tasks/date-handling/forms-calendar/test-cases/tc-2-9-form-load-server-reload-brt.md) | **Summary**: [summary](../summaries/tc-3-D-BRT-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-27                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                                          | Actual                       | Match |
| ------ | ----------------------------------------------------------------- | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass                                             | All P1–P6 checks pass        | PASS  |
| 8      | Display: `03/15/2026 12:00 AM`                                    | `03/15/2026 12:00 AM`        | PASS  |
| 9      | Raw stored: `"2026-03-15T00:00:00"` — no shift from server reload | `"2026-03-15T00:00:00"`      | PASS  |
| 10     | GFV: `"2026-03-15T00:00:00"` — same as raw, no transformation     | `"2026-03-15T00:00:00"`      | PASS  |
| 17     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)                      | `"2026-03-15T03:00:00.000Z"` | PASS  |

> Note: Step numbers match the Config D block in tc-2-9 spec (steps 8–10; isoRef = step 17). Config D is DataField5 (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`). Observed during the DateTest-000004 Rev 1 reload session. Bug #5 is present on the GFV path but was not triggered here — the stored value after reload matched the pre-save value. Step 10 GFV returned `"2026-03-15T00:00:00"` without the fake Z appended; this is consistent with tc-2-9 expected behavior (spec FAIL-2 describes the fake-Z case as a known failure condition).

## Outcome

**PASS** — Config D display and GFV are identical on server reload in BRT (same TZ as save); raw stored value unchanged; no extra drift introduced by the reload path.

## Findings

- Server reload does not introduce additional drift for Config D in BRT — the raw stored value `"2026-03-15T00:00:00"` is returned as-is from the server.
- GFV returned `"2026-03-15T00:00:00"` in this run (no fake Z appended); Bug #5 is latent on the Config D GFV path but was not activated in this reload observation.
- Any subsequent `SetFieldValue(GetFieldValue())` round-trip would activate Bug #5 and cause −3h drift per trip (see 9-D-BRT-1 and 9-D-BRT-8).

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
