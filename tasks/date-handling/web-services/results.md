# Web Services Date Handling — Live Test Results

## Purpose

Live test evidence for date handling behavior in the VisualVault REST API. Tests are performed using the Node.js client library (`VVRestApi.js`) and Playwright API testing.

## Test Environment

| Parameter             | Value                                             |
| --------------------- | ------------------------------------------------- |
| **Node.js Client**    | `lib/VVRestApi/VVRestApiNodeJs/` (local fork)     |
| **API Base**          | `https://vvdemo.visualvault.com`                  |
| **Customer/Database** | `EmanuelJofre` / `Main`                           |
| **Form Template**     | DateTest (`6be0265c-152a-f111-ba23-0afff212cc87`) |
| **Test Start Date**   | 2026-04-01                                        |
| **Platform**          | VisualVault REST API v1                           |

## Related Files

- **API analysis**: `analysis.md` — hypotheses, confirmed behaviors, confirmed bugs
- **Test matrix**: `matrix.md` — authoritative coverage tracker
- **Overall context**: `../CLAUDE.md` — full investigation scope across all VV components
- **Forms comparison**: `../forms-calendar/analysis.md` — Forms UI bugs (reference for cross-layer tests)

---

## Session Index

<!-- Add session entries as testing progresses -->
<!-- Format: ### Session N: Brief Description (YYYY-MM-DD) -->

## Session 2026-04-03 (WS Regression Pipeline)

**Purpose**: Automated regression verification of all WS test cases.
**Key outcomes**: 8 tests documented.

- 2026-04-03 [TC-ws-1-A-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config A
- 2026-04-03 [TC-ws-1-B-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config B
- 2026-04-03 [TC-ws-1-E-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config E
- 2026-04-03 [TC-ws-1-F-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config F
- 2026-04-03 [TC-ws-1-C-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config C
- 2026-04-03 [TC-ws-1-D-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config D
- 2026-04-03 [TC-ws-1-G-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config G
- 2026-04-03 [TC-ws-1-H-BRT](runs/ws-1-brt-batch-run-1.md) — BRT — PASS — WS-1 Config H
