# Testing — Playwright Test Infrastructure

Browser automation for VisualVault platform testing. Everything here is **shared** — any developer can run these tests against their own VV environment.

## Structure

| Folder                 | Purpose                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `specs/date-handling/` | Parameterized spec files (categories 1-12 + dashboard + audit)                                      |
| `web-services/`        | Web service API date-handling specs                                                                 |
| `helpers/`             | Test-specific page helpers: `vv-form.js` (form automation), `vv-calendar.js` (calendar interaction) |
| `fixtures/`            | Shared test data and config: `test-data.js`, `vv-config.js`, `env-config.js`, `ws-config.js`        |
| `pipelines/`           | Regression orchestrators: `run-regression.js`, `run-ws-regression.js`, `run-dash-regression.js`     |
| `config/`              | Auth state (gitignored), TZ configs (committed), saved records (gitignored)                         |
| `reporters/`           | Custom Playwright reporter for regression artifact generation                                       |

## How It Works

1. `playwright.config.js` defines a TZ x browser matrix (4 TZ x 3 browsers = 12 projects)
2. `global-setup.js` logs into VV and creates saved records (per-TZ, cached 1h)
3. Specs in `specs/date-handling/` use `test.skip()` to self-filter by TZ project
4. Specs import from `fixtures/` (data) and `helpers/` (page interaction)
5. Pipelines orchestrate: run specs -> collect results -> call `tools/generators/` for artifacts

## Adding New Tests

1. Add test case entries to `fixtures/test-data.js` (data-driven)
2. Create or extend a spec file in `specs/date-handling/`
3. Use `helpers/vv-form.js` and `helpers/vv-calendar.js` for page interaction
4. Non-Playwright helpers (admin scraping, sync) live in `tools/helpers/`, not here

## Test Assets

Platform-side test components (forms, web services, saved records) are cataloged per-project:

- [`projects/emanueljofre/test-assets.md`](../projects/emanueljofre/test-assets.md) — development environment (read-write)
- [`projects/wadnr/test-assets.md`](../projects/wadnr/test-assets.md) — WADNR environment (read-only)

When adding a test harness to any environment, update that project's `test-assets.md`.
For Playwright-executable config (field IDs, URLs, record definitions): `fixtures/vv-config.js`.

## Credentials

All tests read credentials from root `.env.json` via `fixtures/env-config.js`. See `.env.example.json` for the format.
