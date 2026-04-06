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

- **API analysis**: `analysis/overview.md` — hypotheses, confirmed behaviors, confirmed bugs
- **Test matrix**: `matrix.md` — authoritative coverage tracker
- **Overall context**: `../CLAUDE.md` — full investigation scope across all VV components
- **Forms comparison**: `../forms-calendar/analysis/overview.md` — Forms UI bugs (reference for cross-layer tests)

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

## Session 2026-04-03 (WS Regression Pipeline)

**Purpose**: Automated regression verification of all WS test cases.
**Key outcomes**: 105 tests documented.

- 2026-04-03 [TC-ws-1-A-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config A
- 2026-04-03 [TC-ws-1-B-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config B
- 2026-04-03 [TC-ws-1-E-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config E
- 2026-04-03 [TC-ws-1-F-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config F
- 2026-04-03 [TC-ws-1-C-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config C
- 2026-04-03 [TC-ws-1-D-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config D
- 2026-04-03 [TC-ws-1-G-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config G
- 2026-04-03 [TC-ws-1-H-BRT](runs/ws-1-brt-batch-run-2.md) — BRT — PASS — WS-1 Config H
- 2026-04-03 [TC-ws-1-A-IST](runs/ws-1-ist-batch-run-1.md) — IST — PASS — WS-1 Config A
- 2026-04-03 [TC-ws-1-C-IST](runs/ws-1-ist-batch-run-1.md) — IST — PASS — WS-1 Config C
- 2026-04-03 [TC-ws-1-D-IST](runs/ws-1-ist-batch-run-1.md) — IST — PASS — WS-1 Config D
- 2026-04-03 [TC-ws-1-H-IST](runs/ws-1-ist-batch-run-1.md) — IST — PASS — WS-1 Config H
- 2026-04-03 [TC-ws-1-A-UTC](runs/ws-1-utc-batch-run-1.md) — UTC — PASS — WS-1 Config A
- 2026-04-03 [TC-ws-1-C-UTC](runs/ws-1-utc-batch-run-1.md) — UTC — PASS — WS-1 Config C
- 2026-04-03 [TC-ws-1-D-UTC](runs/ws-1-utc-batch-run-1.md) — UTC — PASS — WS-1 Config D
- 2026-04-03 [TC-ws-1-H-UTC](runs/ws-1-utc-batch-run-1.md) — UTC — PASS — WS-1 Config H
- 2026-04-03 [TC-ws-2-A-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — FAIL — WS-2 Config A
- 2026-04-03 [TC-ws-2-B-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — PASS — WS-2 Config B
- 2026-04-03 [TC-ws-2-C-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — PASS — WS-2 Config C
- 2026-04-03 [TC-ws-2-D-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — FAIL — WS-2 Config D
- 2026-04-03 [TC-ws-2-E-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — PASS — WS-2 Config E
- 2026-04-03 [TC-ws-2-F-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — PASS — WS-2 Config F
- 2026-04-03 [TC-ws-2-G-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — PASS — WS-2 Config G
- 2026-04-03 [TC-ws-2-H-BRT](runs/ws-2-brt-batch-run-1.md) — BRT — PASS — WS-2 Config H
- 2026-04-03 [TC-ws-2-A-IST](runs/ws-2-ist-batch-run-1.md) — IST — FAIL — WS-2 Config A
- 2026-04-03 [TC-ws-2-B-IST](runs/ws-2-ist-batch-run-1.md) — IST — PASS — WS-2 Config B
- 2026-04-03 [TC-ws-2-C-IST](runs/ws-2-ist-batch-run-1.md) — IST — PASS — WS-2 Config C
- 2026-04-03 [TC-ws-2-D-IST](runs/ws-2-ist-batch-run-1.md) — IST — FAIL — WS-2 Config D
- 2026-04-03 [TC-ws-2-E-IST](runs/ws-2-ist-batch-run-1.md) — IST — PASS — WS-2 Config E
- 2026-04-03 [TC-ws-2-F-IST](runs/ws-2-ist-batch-run-1.md) — IST — PASS — WS-2 Config F
- 2026-04-03 [TC-ws-2-G-IST](runs/ws-2-ist-batch-run-1.md) — IST — PASS — WS-2 Config G
- 2026-04-03 [TC-ws-2-H-IST](runs/ws-2-ist-batch-run-1.md) — IST — PASS — WS-2 Config H
- 2026-04-03 [TC-ws-3-A-BRT](runs/ws-3-brt-batch-run-1.md) — BRT — FAIL — WS-3 Config A
- 2026-04-03 [TC-ws-3-C-BRT](runs/ws-3-brt-batch-run-1.md) — BRT — FAIL — WS-3 Config C
- 2026-04-03 [TC-ws-3-D-BRT](runs/ws-3-brt-batch-run-1.md) — BRT — FAIL — WS-3 Config D
- 2026-04-03 [TC-ws-3-H-BRT](runs/ws-3-brt-batch-run-1.md) — BRT — FAIL — WS-3 Config H
- 2026-04-03 [TC-ws-5-A-BRT](runs/ws-5-brt-batch-run-1.md) — BRT — FAIL — WS-5 Config A
- 2026-04-03 [TC-ws-5-C-BRT](runs/ws-5-brt-batch-run-1.md) — BRT — FAIL — WS-5 Config C
- 2026-04-03 [TC-ws-5-D-BRT](runs/ws-5-brt-batch-run-1.md) — BRT — FAIL — WS-5 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-1.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-7-A-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — FAIL — WS-7 Config A
- 2026-04-03 [TC-ws-7-A-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — FAIL — WS-7 Config A
- 2026-04-03 [TC-ws-7-A-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — FAIL — WS-7 Config A
- 2026-04-03 [TC-ws-7-C-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — PASS — WS-7 Config C
- 2026-04-03 [TC-ws-7-C-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — FAIL — WS-7 Config C
- 2026-04-03 [TC-ws-7-C-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — PASS — WS-7 Config C
- 2026-04-03 [TC-ws-7-D-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — PASS — WS-7 Config D
- 2026-04-03 [TC-ws-7-D-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — FAIL — WS-7 Config D
- 2026-04-03 [TC-ws-7-D-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — PASS — WS-7 Config D
- 2026-04-03 [TC-ws-7-H-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — PASS — WS-7 Config H
- 2026-04-03 [TC-ws-7-H-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — FAIL — WS-7 Config H
- 2026-04-03 [TC-ws-7-H-BRT](runs/ws-7-brt-batch-run-1.md) — BRT — PASS — WS-7 Config H
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-1.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-9-A-iso-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-iso-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-us-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-us-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-parts-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-parts-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-utc-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-utc-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-arith-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-arith-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-arithUTC-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-arithUTC-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-safe-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-safe-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-locale-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-locale-BRT](runs/ws-9-brt-batch-run-1.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-iso-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-us-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-parts-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-utc-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arith-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arithUTC-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-safe-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-locale-IST](runs/ws-9-ist-batch-run-1.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-iso-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-us-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-parts-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-utc-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arith-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arithUTC-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-safe-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-locale-UTC](runs/ws-9-utc-batch-run-1.md) — UTC — FAIL — WS-9 Config A

## Session 2026-04-03 (WS Regression Pipeline)

**Purpose**: Automated regression verification of all WS test cases.
**Key outcomes**: 105 tests documented.

- 2026-04-03 [TC-ws-1-A-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config A
- 2026-04-03 [TC-ws-1-B-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config B
- 2026-04-03 [TC-ws-1-E-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config E
- 2026-04-03 [TC-ws-1-F-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config F
- 2026-04-03 [TC-ws-1-C-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config C
- 2026-04-03 [TC-ws-1-D-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config D
- 2026-04-03 [TC-ws-1-G-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config G
- 2026-04-03 [TC-ws-1-H-BRT](runs/ws-1-brt-batch-run-3.md) — BRT — PASS — WS-1 Config H
- 2026-04-03 [TC-ws-1-A-IST](runs/ws-1-ist-batch-run-2.md) — IST — PASS — WS-1 Config A
- 2026-04-03 [TC-ws-1-C-IST](runs/ws-1-ist-batch-run-2.md) — IST — PASS — WS-1 Config C
- 2026-04-03 [TC-ws-1-D-IST](runs/ws-1-ist-batch-run-2.md) — IST — PASS — WS-1 Config D
- 2026-04-03 [TC-ws-1-H-IST](runs/ws-1-ist-batch-run-2.md) — IST — PASS — WS-1 Config H
- 2026-04-03 [TC-ws-1-A-UTC](runs/ws-1-utc-batch-run-2.md) — UTC — PASS — WS-1 Config A
- 2026-04-03 [TC-ws-1-C-UTC](runs/ws-1-utc-batch-run-2.md) — UTC — PASS — WS-1 Config C
- 2026-04-03 [TC-ws-1-D-UTC](runs/ws-1-utc-batch-run-2.md) — UTC — PASS — WS-1 Config D
- 2026-04-03 [TC-ws-1-H-UTC](runs/ws-1-utc-batch-run-2.md) — UTC — PASS — WS-1 Config H
- 2026-04-03 [TC-ws-2-A-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — FAIL — WS-2 Config A
- 2026-04-03 [TC-ws-2-B-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — PASS — WS-2 Config B
- 2026-04-03 [TC-ws-2-C-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — PASS — WS-2 Config C
- 2026-04-03 [TC-ws-2-D-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — FAIL — WS-2 Config D
- 2026-04-03 [TC-ws-2-E-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — PASS — WS-2 Config E
- 2026-04-03 [TC-ws-2-F-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — PASS — WS-2 Config F
- 2026-04-03 [TC-ws-2-G-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — PASS — WS-2 Config G
- 2026-04-03 [TC-ws-2-H-BRT](runs/ws-2-brt-batch-run-2.md) — BRT — PASS — WS-2 Config H
- 2026-04-03 [TC-ws-2-A-IST](runs/ws-2-ist-batch-run-2.md) — IST — FAIL — WS-2 Config A
- 2026-04-03 [TC-ws-2-B-IST](runs/ws-2-ist-batch-run-2.md) — IST — PASS — WS-2 Config B
- 2026-04-03 [TC-ws-2-C-IST](runs/ws-2-ist-batch-run-2.md) — IST — PASS — WS-2 Config C
- 2026-04-03 [TC-ws-2-D-IST](runs/ws-2-ist-batch-run-2.md) — IST — FAIL — WS-2 Config D
- 2026-04-03 [TC-ws-2-E-IST](runs/ws-2-ist-batch-run-2.md) — IST — PASS — WS-2 Config E
- 2026-04-03 [TC-ws-2-F-IST](runs/ws-2-ist-batch-run-2.md) — IST — PASS — WS-2 Config F
- 2026-04-03 [TC-ws-2-G-IST](runs/ws-2-ist-batch-run-2.md) — IST — PASS — WS-2 Config G
- 2026-04-03 [TC-ws-2-H-IST](runs/ws-2-ist-batch-run-2.md) — IST — PASS — WS-2 Config H
- 2026-04-03 [TC-ws-3-A-BRT](runs/ws-3-brt-batch-run-2.md) — BRT — FAIL — WS-3 Config A
- 2026-04-03 [TC-ws-3-C-BRT](runs/ws-3-brt-batch-run-2.md) — BRT — FAIL — WS-3 Config C
- 2026-04-03 [TC-ws-3-D-BRT](runs/ws-3-brt-batch-run-2.md) — BRT — FAIL — WS-3 Config D
- 2026-04-03 [TC-ws-3-H-BRT](runs/ws-3-brt-batch-run-2.md) — BRT — FAIL — WS-3 Config H
- 2026-04-03 [TC-ws-5-A-BRT](runs/ws-5-brt-batch-run-2.md) — BRT — FAIL — WS-5 Config A
- 2026-04-03 [TC-ws-5-C-BRT](runs/ws-5-brt-batch-run-2.md) — BRT — FAIL — WS-5 Config C
- 2026-04-03 [TC-ws-5-D-BRT](runs/ws-5-brt-batch-run-2.md) — BRT — FAIL — WS-5 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-6-A-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config A
- 2026-04-03 [TC-ws-6-D-BRT](runs/ws-6-brt-batch-run-2.md) — BRT — FAIL — WS-6 Config D
- 2026-04-03 [TC-ws-7-A-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — FAIL — WS-7 Config A
- 2026-04-03 [TC-ws-7-A-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — FAIL — WS-7 Config A
- 2026-04-03 [TC-ws-7-A-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — FAIL — WS-7 Config A
- 2026-04-03 [TC-ws-7-C-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — PASS — WS-7 Config C
- 2026-04-03 [TC-ws-7-C-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — FAIL — WS-7 Config C
- 2026-04-03 [TC-ws-7-C-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — PASS — WS-7 Config C
- 2026-04-03 [TC-ws-7-D-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — PASS — WS-7 Config D
- 2026-04-03 [TC-ws-7-D-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — FAIL — WS-7 Config D
- 2026-04-03 [TC-ws-7-D-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — PASS — WS-7 Config D
- 2026-04-03 [TC-ws-7-H-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — PASS — WS-7 Config H
- 2026-04-03 [TC-ws-7-H-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — FAIL — WS-7 Config H
- 2026-04-03 [TC-ws-7-H-BRT](runs/ws-7-brt-batch-run-2.md) — BRT — PASS — WS-7 Config H
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-A-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config A
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-8-C-BRT](runs/ws-8-brt-batch-run-2.md) — BRT — FAIL — WS-8 Config C
- 2026-04-03 [TC-ws-9-A-iso-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-iso-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-us-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-us-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-parts-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-parts-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-utc-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-utc-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-arith-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-arith-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-arithUTC-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-arithUTC-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-safe-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-safe-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-locale-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-C-locale-BRT](runs/ws-9-brt-batch-run-2.md) — BRT — FAIL — WS-9 Config C
- 2026-04-03 [TC-ws-9-A-iso-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-us-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-parts-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-utc-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arith-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arithUTC-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-safe-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-locale-IST](runs/ws-9-ist-batch-run-2.md) — IST — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-iso-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-us-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-parts-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-utc-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arith-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-arithUTC-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-safe-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
- 2026-04-03 [TC-ws-9-A-locale-UTC](runs/ws-9-utc-batch-run-2.md) — UTC — FAIL — WS-9 Config A
