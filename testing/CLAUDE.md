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
| `scripts/`             | Standalone Playwright scripts for one-off browser tasks (IST record creation, WS-4 verification)    |
| `reporters/`           | Custom Playwright reporter for regression artifact generation                                       |

## How It Works

1. `playwright.config.js` defines a TZ x browser matrix (4 TZ x 3 browsers = 12 projects)
2. `global-setup.js` logs into VV and creates saved records (per-TZ, cached 1h)
3. Specs in `specs/date-handling/` use `test.skip()` to self-filter by TZ project
4. Specs import from `fixtures/` (data) and `helpers/` (page interaction)
5. Pipelines orchestrate: run specs -> collect results -> call `tools/generators/` for artifacts

## Write Safety — Spec Authoring Rules

Tests run against **live VV environments**, including active client projects. See root `CLAUDE.md` § "Write Safety" for full context.

### Mandatory Chokepoints

Every write operation in a spec MUST go through a guarded helper. No exceptions.

| Operation      | Use This                                                                   | NEVER This                                                             |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Save a form    | `saveFormOnly(page)` / `saveFormAndReload(page)` from `helpers/vv-form.js` | `page.click('button.btn-save')`, `page.evaluate(() => VV.Form.Save())` |
| PUT to API     | `guardedPut(request, url, opts)` from `helpers/vv-request.js`              | `request.put(url, opts)`                                               |
| POST to API    | `guardedPost(request, url, opts)` from `helpers/vv-request.js`             | `request.post(url, opts)`                                              |
| DELETE via API | `guardedDelete(request, url, opts)` from `helpers/vv-request.js`           | `request.delete(url, opts)`                                            |

### New Spec Checklist (if the spec writes data)

1. Import from guarded helpers — `vv-form.js` for form saves, `vv-request.js` for API writes
2. Verify the target form/resource is in the active customer's `writePolicy` allowlist (check `.env.json`)
3. Add a comment at the top of the spec stating which environment it targets and what it writes
4. Read-only specs (navigation, DOM inspection, GET requests) need no special treatment

### Protected Files — Do Not Modify Without User Approval

- `fixtures/write-policy.js` — central write enforcement
- `helpers/vv-request.js` — guarded API wrappers
- `helpers/vv-form.js` `saveFormOnly()` guard block (the lines between `WRITE POLICY GUARD` comments)

## Adding New Tests

1. Add test case entries to `fixtures/test-data.js` (data-driven)
2. Create or extend a spec file in `specs/date-handling/`
3. Use `helpers/vv-form.js` and `helpers/vv-calendar.js` for page interaction
4. **If the spec writes data**, follow the Write Safety checklist above
5. Non-Playwright helpers (admin scraping, sync) live in `tools/helpers/`, not here

## Test Assets

Platform-side test components (forms, web services, saved records) are cataloged per-project:

- [`projects/emanueljofre/test-assets.md`](../projects/emanueljofre/test-assets.md) — development environment (read-write)
- [`projects/wadnr/test-assets.md`](../projects/wadnr/test-assets.md) — WADNR environment (read-only)

When adding a test harness to any environment, update that project's `test-assets.md`.
For Playwright-executable config (field IDs, URLs, record definitions): `fixtures/vv-config.js`.

## Credentials

All tests read credentials from root `.env.json` via `fixtures/env-config.js`. See `.env.example.json` for the format.
