# WS-10 forminstance/ Unblock Run — WADNR | 2026-04-10 | All Baseline Matches

**Context**: forminstance/ endpoint was previously BLOCKED on WADNR because the write policy guard couldn't match the template GUID (it's in the request body, not the URL). Fixed by adding body-based template matching to `common.js __isAllowedByPolicy` and resolving revision IDs in `run-ws-test.js`.

## Environment

| Parameter              | Value                                       |
| ---------------------- | ------------------------------------------- |
| Date                   | 2026-04-10                                  |
| Execution Mode         | Script + Playwright browser verification    |
| Server TZ              | `America/Sao_Paulo` (BRT)                   |
| VV Environment         | vv5dev / WADNR / fpOnline                   |
| Harness serverTimezone | `America/Sao_Paulo`                         |
| Write Policy Fix       | `common.js`: forminstance body check + revision ID matching; `run-ws-test.js`: revisionId resolution |

## Records Created

| Endpoint      | Record             | DataID                                 |
| ------------- | ------------------ | -------------------------------------- |
| postForms     | zzzDATETEST-000725 | `b670ff29-1835-f111-8333-99973bb0d2ea` |
| forminstance/ | zzzDATETEST-000726 | `382591b9-0d22-4587-8804-94aef1a02a0a` |

Input: `"2026-03-15T14:30:00"` for all configs (A,C,D,H).

## API Results (storedMatch)

| Config | Field   | postForms Stored       | forminstance/ Stored   | storedMatch |
| :----: | ------- | ---------------------- | ---------------------- | :---------: |
|   A    | Field7  | `2026-03-15T14:30:00Z` | `2026-03-15T14:30:00Z` |    true     |
|   C    | Field6  | `2026-03-15T14:30:00Z` | `2026-03-15T14:30:00Z` |    true     |
|   D    | Field5  | `2026-03-15T14:30:00Z` | `2026-03-15T14:30:00Z` |    true     |
|   H    | Field13 | `2026-03-15T14:30:00Z` | `2026-03-15T14:30:00Z` |    true     |

---

## WS-10A: Browser Verification — BRT (America/Sao_Paulo)

| Config | Endpoint     | Display             | rawValue            | GFV                          | Status | Notes |
| :----: | ------------ | ------------------- | ------------------- | ---------------------------- | :----: | ----- |
|   A    | postForms    | `03/15/2026`        | `2026-03-15`        | `2026-03-15`                 |  PASS  | Date-only strips time |
|   A    | forminstance | `03/15/2026`        | `03/15/2026 14:30:00` | `03/15/2026 14:30:00`      |  PASS  | Date-only — raw keeps US format |
|   C    | postForms    | `03/15/2026 11:30 AM` | `2026-03-15T11:30:00` | `2026-03-15T14:30:00.000Z` |  FAIL  | CB-8: UTC→BRT shift -3h |
|   C    | forminstance | **`03/15/2026 02:30 PM`** | **`2026-03-15T14:30:00`** | `2026-03-15T17:30:00.000Z` |  PASS  | **No shift!** |
|   D    | postForms    | `03/15/2026 02:30 PM` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00.000Z` |  FAIL  | CB-8,#5: display OK (ignoreTZ), rawValue shifted |
|   D    | forminstance | **`03/15/2026 02:30 PM`** | **`2026-03-15T14:30:00`** | **`2026-03-15T14:30:00.000Z`** |  PASS  | **No shift! No FORM-BUG-5!** |
|   H    | postForms    | `03/15/2026 02:30 PM` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00`      |  FAIL  | CB-8: like D minus fake Z |
|   H    | forminstance | **`03/15/2026 02:30 PM`** | **`2026-03-15T14:30:00`** | `2026-03-15T14:30:00`      |  PASS  | **No shift!** |

## WS-10A: Browser Verification — IST (Asia/Calcutta)

| Config | Endpoint     | Display             | rawValue            | GFV                          | Status | Notes |
| :----: | ------------ | ------------------- | ------------------- | ---------------------------- | :----: | ----- |
|   A    | postForms    | `03/15/2026`        | `2026-03-15`        | `2026-03-15`                 |  PASS  | Date-only correct |
|   A    | forminstance | `03/15/2026`        | `03/15/2026 14:30:00` | `03/15/2026 14:30:00`      |  PASS  | Date-only — raw keeps US format |
|   C    | postForms    | `03/15/2026 08:00 PM` | `2026-03-15T20:00:00` | `2026-03-15T14:30:00.000Z` |  FAIL  | CB-8: UTC→IST shift +5:30h |
|   C    | forminstance | **`03/15/2026 02:30 PM`** | **`2026-03-15T14:30:00`** | `2026-03-15T09:00:00.000Z` |  PASS  | **No shift!** |
|   D    | postForms    | `03/15/2026 02:30 PM` | `2026-03-15T20:00:00` | `2026-03-15T20:00:00.000Z` |  FAIL  | CB-8,#5: display OK, rawValue shifted +5:30h |
|   D    | forminstance | **`03/15/2026 02:30 PM`** | **`2026-03-15T14:30:00`** | **`2026-03-15T14:30:00.000Z`** |  PASS  | **No shift! No FORM-BUG-5!** |
|   H    | postForms    | `03/15/2026 02:30 PM` | `2026-03-15T20:00:00` | `2026-03-15T20:00:00`      |  FAIL  | CB-8: like D minus fake Z |
|   H    | forminstance | **`03/15/2026 02:30 PM`** | **`2026-03-15T14:30:00`** | `2026-03-15T14:30:00`      |  PASS  | **No shift!** |

## WS-10B: Side-by-Side Comparison (BRT)

| Config | postForms rawValue      | forminstance/ rawValue  | postForms GFV                | forminstance/ GFV            | Display Match | Status |
| :----: | ----------------------- | ----------------------- | ---------------------------- | ---------------------------- | :-----------: | :----: |
|   C    | `2026-03-15T11:30:00`   | `2026-03-15T14:30:00`   | `2026-03-15T14:30:00.000Z`   | `2026-03-15T17:30:00.000Z`   |      No       |  FAIL  |
|   D    | `2026-03-15T11:30:00`   | `2026-03-15T14:30:00`   | `2026-03-15T11:30:00.000Z`   | `2026-03-15T14:30:00.000Z`   |      Yes      |  FAIL  |

> CB-29 confirmed on WADNR: API stores identical values, but Forms V1 treats them differently based on endpoint.

## WS-10C: Save-and-Stabilize (BRT)

postForms record `b670ff29-...` → saved as `ffe4bc18-8f1f-422e-93e0-c89876df5a42`.

| Config | Snap 1 Display | Snap 1 rawValue         | Snap 2 Display   | Snap 2 rawValue         | Snap 3 = Snap 2? | Status | Notes |
| :----: | -------------- | ----------------------- | ---------------- | ----------------------- | :---------------: | :----: | ----- |
|   C    | `11:30 AM`     | `2026-03-15T11:30:00`   | `11:30 AM`       | `2026-03-15T11:30:00`   |       Yes         |  FAIL  | CB-8 shift on load, save commits shifted value, stable after |
|   D    | **`02:30 PM`** | `2026-03-15T11:30:00`   | **`11:30 AM`**   | `2026-03-15T11:30:00`   |       Yes         |  FAIL  | **#124697**: Display shows original on first open, save commits shifted value, display changes on reopen |

> WS-10C matches EmanuelJofre baseline exactly. Config D is the exact Freshdesk #124697 scenario.

---

## Summary — All 12 WS-10 Slots

| ID           | Config | TZ  | Endpoint     | Status | Matches Baseline? |
| ------------ | :----: | --- | ------------ | :----: | :---------------: |
| ws-10a-A-BRT |   A    | BRT | postForms    |  PASS  |        Yes        |
| ws-10a-A-BRT |   A    | BRT | forminstance |  PASS  |        Yes        |
| ws-10a-C-BRT |   C    | BRT | postForms    |  FAIL  |        Yes        |
| ws-10a-C-BRT |   C    | BRT | forminstance |  PASS  |        Yes        |
| ws-10a-D-BRT |   D    | BRT | postForms    |  FAIL  |        Yes        |
| ws-10a-D-BRT |   D    | BRT | forminstance |  PASS  |        Yes        |
| ws-10a-H-BRT |   H    | BRT | postForms    |  FAIL  |        Yes        |
| ws-10a-H-BRT |   H    | BRT | forminstance |  PASS  |        Yes        |
| ws-10a-A-IST |   A    | IST | postForms    |  PASS  |        Yes        |
| ws-10a-C-IST |   C    | IST | postForms    |  FAIL  |        Yes        |
| ws-10a-D-IST |   D    | IST | postForms    |  FAIL  |        Yes        |
| ws-10a-H-IST |   H    | IST | postForms    |  FAIL  |        Yes        |
| ws-10b-C-BRT |   C    | BRT | comparison   |  FAIL  |        Yes        |
| ws-10b-D-BRT |   D    | BRT | comparison   |  FAIL  |        Yes        |
| ws-10c-C-BRT |   C    | BRT | stabilize    |  FAIL  |        Yes        |
| ws-10c-D-BRT |   D    | BRT | stabilize    |  FAIL  |        Yes        |

**All results identical to EmanuelJofre baseline.** Bugs are platform-level, not environment-specific.

Counted slots (per matrix counting rules — forminstance rows share IDs): **2 PASS, 10 FAIL** — matches EmanuelJofre.
