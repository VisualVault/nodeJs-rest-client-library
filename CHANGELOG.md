# Changelog

Notable changes to the VisualVault Node.js server and client library (`lib/VVRestApi/`).

**Scope:** Server/library code changes and project-wide development tooling. For investigation work, see [`tasks/`](tasks/). For platform documentation, see [`docs/`](docs/).

Format follows [Keep a Changelog](https://keepachangelog.com/). Entries stay under **Unreleased** until a version is published to npm.

## [Unreleased]

### Changed

- **Artifact routing restructure**: Execution artifacts (runs, summaries, results.md, status.md) moved from `tasks/` to `projects/{customer}/testing/{task}/{component}/`. Tasks now hold only platform methodology (matrix, test-cases, analysis). Matrix files stripped of results columns — per-env tracking in `status.md`. Generalized principle: "Is this artifact true regardless of customer/environment?" determines routing. All test commands, sharing rules, and CLAUDE.md files updated.

### Added

- Custom Queries extract component (`tools/extract/components/queries.js`) — API-first probe with Playwright fallback, parallel SQL extraction via dock panel response interception, hash-based incremental sync, connection discovery from ConnectionsAdmin grid
- Renamed extract pipeline: `tools/export/` → `tools/extract/`, `projects/*/exports/` → `projects/*/extracts/`. Clarifies that the tools pull data from VV (extract), not push data out. All code, docs, commands updated.
- Bug report standard (`docs/standards/bug-report-standard.md`) — document structure, 21 writing principles, severity levels, reading guide, companion doc format, field config appendix pattern
- Fix-recommendation companion docs for all 7 Forms calendar bugs (`bug-{1-7}-fix-recommendations.md`) — workarounds, proposed fixes, impact assessments separated from bug reports
- Fix-recommendation companion docs for all 6 Web Services bugs (`ws-bug-{1-6}-fix-recommendations.md`) and Dashboard bug (`formdashboard-bug-1-fix-recommendations.md`)
- `testing/fixtures/env-config.js` — unified credential loader: reads `.env.json`, maps fields for Playwright and WS runner consumers. Replaces scattered credential references
- `.env.example.json` — credential template at repo root (replaces deleted `testing/config/vv-config.example.json`)
- `testing/scripts/export-wadnr-templates.js` — Playwright-based form template XML export from VV FormTemplateAdmin (pagination, parallel workers, resume support)
- `testing/scripts/inventory-wadnr-fields.js` — parses WADNR template XMLs, maps calendar fields to Config A–H, generates field inventory with heuristic model assessment and script interaction tracking (GFV/SFV, bulk reads, FillinAndRelate, date APIs)
- `testing/scripts/inventory-wadnr-scripts.js` — parses WADNR template XMLs for script-level analysis: date field interactions, web service calls, global function usage, round-trip detection
- `tasks/date-handling/wadnr-impact/` — WADNR project impact analysis: 77 templates exported (12 failed server-side), 35 contain calendar fields (137 total), configuration assessment with 8 likely misconfigurations identified
- `tasks/date-handling/wadnr-impact/bug-analysis/case-study-124697.md` — case study mapping Freshdesk #124697 (postForms time mutation) to FORM-BUG-1, FORM-BUG-5, WEBSERVICE-BUG-4; layer-by-layer analysis of `forminstance/` workaround limits
- Category 4 (URL Parameters) Playwright test suite: 2 spec files (`cat-4-url-params.spec.js`, `cat-4-fillinrelate.spec.js`), 36 test-data entries, `gotoWithUrlParams()` helper in `vv-form.js`, TargetDateTest form URL in `vv-config.js`
- `tasks/date-handling/forms-calendar/examples/fillinandrelated.js` — production FillinAndRelateForm global function example documenting the URL parameter chain pattern
- Read-only environment guard: per-customer `readOnly` flag in `.env.json` blocks POST/PUT/DELETE at the `httpHelper` HTTP layer (`common.js`). Propagated through `authorize` → `vvClient` → all sub-APIs. POST-as-read allowlist for search and scheduledProcess endpoints. `VV_FORCE_WRITE=1` env var override
- Unified WADNR export framework (`testing/scripts/export-wadnr.js`) — orchestrator for extracting multiple VV admin components via shared browser session. Components: `scripts` (outsideprocessadmin, 272 microservices), `schedules` (scheduleradmin, 21 scheduled services), `globals` (FormViewer runtime, 157 functions). Sync mode compares `modifyDate` from API manifests to skip unchanged items
- `testing/helpers/vv-admin.js` — reusable VV admin page helpers: login, RadGrid pagination, `__doPostBack` triggers, dock panel extraction via AJAX response interception, generic grid column reader (`readGridRows`)
- `testing/helpers/vv-sync.js` — shared manifest load/save/diff and README generation for all export components
- `testing/scripts/export-wadnr-globals.js` — extracts all `VV.Form.Global` functions from WADNR FormViewer via runtime introspection (`.toString()`)
- WADNR artifact exports: 251 web service scripts (`web-services/scripts/`), 157 global function files (`global-functions/`), 21 schedule configs with ~20 extracted scripts (`schedules/`), cross-linked READMEs
- Category 13 (Database Verification) test suite: 8 new TC specs + run files + summaries using REST API reads (`run-ws-test.js --action WS-2`) as alternative to direct SQL access. Key finding: API write path (`postForms`) stores dates uniformly — mixed timezone storage is Forms Angular-only

- **Repo restructure**: `testing/scripts/` → `tools/` (by purpose: export, runners, audit, inventory, generators, helpers) + `testing/pipelines/`. Specs → `testing/specs/date-handling/`. WADNR data → `projects/wadnr/`. New top-level: `tools/`, `projects/`
- Export orchestrator: `--project` flag resolves customer from `.env.json` (case-insensitive). No `project.json` needed — project name = customer name
- Templates component added to export orchestrator (4th component: scripts, schedules, globals, templates)
- Scripts export: pagination fix — SKIPped scripts tracked separately, no infinite retry loop
- Globals export: REST API-based discovery replaces dashboard UI navigation (3 page navigations eliminated)
- CLAUDE.md content standard with placement convention, size targets, pruning rules
- Scope-level CLAUDE.md files for all 7 topic folders (tools, testing, tasks, projects, docs, scripts, form-templates)
- `/@-status` command — session briefing (git state, tasks, projects, test results, health)
- `/@-create-project` and `/@-create-task` — scaffolding with standard structure + CLAUDE.md
- `/@-maintain-claude-md` — audit + fix CLAUDE.md files (11 checks: bloat, gaps, drift, counts)
- Sharing awareness in `/@-smart-commit-push` (personal vs shared classification, remote-aware push)
- `.prettierignore` — excludes `projects/` extracted customer code from formatting
- `projects/emanueljofre/` — development environment project (42 scripts, 5 schedules, 108 templates)
- `tasks/export-optimization/` — task tracking export pipeline improvements (parallel, revision tracking, API-first)
- `tools/explore/` — Playwright-based platform exploration: `platform-discovery.spec.js` (nav structure, admin tools, UI framework), `version-discovery.spec.js` (version API, FormViewer build, service config). Version tracking via `version-snapshot.js` and `version-diff.js`
- `tools/helpers/vv-explore.js` — reusable exploration utilities (auth, page helpers, response collectors) for explore specs
- `tools/helpers/build-context.js` — captures test build metadata (FormViewer build, platform version) for regression reporting
- `npm run explore`, `explore:headed`, `explore:report`, `version:snapshot`, `version:diff`, `version:list` scripts
- Export optimization: parallel template export (3 Playwright workers, ~3x faster), SHA-256 content-hash tracking in manifest for instant incremental sync, globals multi-template retry with record prioritization (5 attempts, 20s each)
- `hashField` option in `vv-sync.computeChanges()` for content-hash-based change detection (skips unchanged items without date fields)
- Per-project `test-assets.md` convention — catalogs platform-side test components (forms, WS, saved records) per environment. Created for `projects/emanueljofre/` and `projects/wadnr/`. Convention documented in `testing/CLAUDE.md` and `projects/CLAUDE.md` scaffolding template
- Document Library date investigation (`tasks/date-handling/document-library/`): DOC-BUG-1 (timezone offset converted to UTC with Z stripped), DOC-BUG-2 (cannot clear date index field). 17 automated regression tests in `testing/specs/date-handling/doc-index-field-dates.spec.js`
- `tools/explore/specs/document-dates.spec.js` — Document Library UI exploration spec (folder tree, grid, index fields tab, RadDateTimePicker)
- **Write-policy security harness**: per-customer `writePolicy` in `.env.json` with 3 modes (`unrestricted`, `allowlist`, `blocked`). Central enforcement in `testing/fixtures/write-policy.js`. Guards at 4 layers: Playwright form saves (`vv-form.js`), Playwright API writes (`vv-request.js`), Node.js REST client (`common.js`), environment banner (`playwright.config.js`). Audit log flushed to `testing/config/write-audit.json` via `global-teardown.js`. Per-customer template URLs in `testing/fixtures/vv-config.js` (`CUSTOMER_TEMPLATES`). Write Safety sections added to all CLAUDE.md files. Commands updated with environment safety checks (`/@-test-ws-date-pw`, `/@-test-forms-date-pw`, `/@-test-dash-date-pw`, `/@-create-project`)
- **Upstream file protection**: pre-commit guard (`.husky/pre-commit`) blocks commits to `lib/VVRestApi/` files unless on allowlist (`.husky/upstream-allowlist`) or `UPSTREAM_OK=1`. CI drift report (`.github/workflows/upstream-guard.yml`) on PRs touching `lib/`. `lib/VVRestApi/**` marked `upstream-tracked` in `.gitattributes`

- **Environment profile tool** (`tools/explore/environment-profile.js`): consolidates platform version, service configuration (behavioral toggles, FormSettings limits), and front-end library stack into `projects/{customer}/environment.json`. HTTP-only mode (~3s) captures platform, FormViewer, infrastructure, and per-service config. Browser mode (`--with-browser`, ~12s) adds admin app libraries (jQuery, Kendo, Telerik, Angular, Telerik controls, Kendo widgets, CSS frameworks, ASP.NET indicators) and FormViewer SPA detection (Kendo v1/v2 variant via input role, VV.Form properties). Shared HTTP probes extracted to `tools/helpers/vv-probes.js`; browser probes in `tools/helpers/vv-browser-probes.js`. npm scripts: `env:profile`, `env:profile:browser`
- `tools/helpers/vv-admin.js` — added `findCustomer()`, `listCustomers()`, `getActiveCustomer()` for shared project/customer resolution from `.env.json`
- WS test harness: `TemplateName` parameter (`scripts/server-scripts/webservice-test-harness.js`) — overrides default `'DateTest'` form name for cross-environment testing. Runner `--template-name` flag (`tools/runners/run-ws-test.js`). Fallback preserves backward compatibility
- Write policy name-based resolution in `run-ws-test.js` — after auth, resolves `writePolicy.forms[].name` to API template GUIDs via `getFormTemplateIdByName()`, injecting into the live policy object. Enables `.env.json` to use human-readable form names instead of environment-specific GUIDs. No `lib/` changes required
- `testing/scripts/wadnr-ws-browser-verify.js` — standalone Playwright script for WADNR WS-4 browser verification (BRT + IST) and IST record creation
- Cross-environment WS date test validation: all 10 categories (148/148 slots) executed against WADNR (vv5dev). All 6 WS bugs + CB-29 confirmed as platform-level
- **Write policy forminstance/ support**: `assertApiWriteAllowed` and `__isAllowedByPolicy` now accept request body for `forminstance/` URLs where the template GUID is in the payload, not the URL. Matches against both `templateId` and `revisionId` (FormsAPI uses revision ID). `run-ws-test.js` resolves and stores revision IDs at startup. `verify-ws10-browser.js` now environment-aware (loads config from `env-config.js` instead of hardcoded vvdemo constants)
- vv5dev `zzzTarget Date Test Harness` template updated to v1.2: `EnableQListener=true` on all 33 fields (was `false` — config gap from initial template creation). Fixes all 32 Cat 4 URL parameter test failures (27/27 BRT+IST pass). Export/modify/import workflow via `testing/tmp/fix-enableqlistener.js`

### Changed

- `tools/explore/version-snapshot.js` — refactored to import probe functions from shared `tools/helpers/vv-probes.js` (identical output, no behavior change)
- `tools/extract/extract.js` — imports `findCustomer` from `vv-admin.js` instead of defining inline; uses `listCustomers()` and `getActiveCustomer()` for project resolution

- `testing/helpers/vv-calendar.js` — Kendo v2 (vv5dev) compatibility: popup header selector (`kendo-calendar-header .k-title` → dual selector including `button.k-calendar-title`), time tab active selector (`k-state-active` → `aria-pressed`), typed input adapts to placeholder (strips time segments when field renders date-only despite `enableTime=true`), date-only popup month list selector (`[role="grid"] li` → dual selector including `kendo-calendar-navigation li` — v2 moved `<li>` items outside `[role="grid"]`). Fixes 19 Cat 1 infrastructure timeouts on vv5dev
- `testing/helpers/vv-form.js` — `saveFormOnly()` template ID extraction: fallback to URL `formid` query param when `VV.Form.formId` is undefined (vv5dev Kendo v2 doesn't expose this property)
- `testing/global-setup.js` — auth post-login URL pattern: replaced `waitForURL('**/FormDataAdmin**')` with generic `waitForFunction(!login)` (vv5dev redirects to `VVPortalUI/home`, not `FormDataAdmin`)
- `testing/fixtures/vv-config.js` — added WADNR `targetDateTest` form URL (revision `3f3a0b1a-4834-f111-8310-f323cafecf11`)
- VV platform docs: Form Designer URL pattern, template revision lifecycle, Kendo v1/v2 selector mapping, mask auto-population behavior on vv5dev

- `.env.json` restructured from flat `environments` map to hierarchical `servers → customers` structure reflecting VV platform architecture. Selectors changed from `activeEnv` to `activeServer` + `activeCustomer`. `env-config.js` and `app.js` resolve the new hierarchy; `loadConfig()` return shape unchanged
- ESLint config: excluded `lib/VVRestApi/` and `tasks/**/bug-analysis/` from linting (upstream code and captured VV script artifacts with pre-existing errors that blocked lint-staged)
- ESLint config: added browser globals (`window`, `HTMLElement`, `Window`, `Document`, `NodeFilter`) for `tools/**/*.js` — needed for `page.evaluate()` in explore specs
- Export globals: fixed API call (`getForms` not `getFormInstances`), `xcid`/`xcdid` from config (was `undefined` from API response). Now works on all environments including EmanuelJofre
- Export scripts: unified manifest tracks all items (scheduled + non-scheduled). Fixes double-deletion bug from split `computeChanges` calls
- Export orchestrator: manifest save moved after extraction (enables content-hash persistence), browser context passed to `extract()` for parallel workers
- Login timeout increased 30s → 60s in `vv-admin.js` for slow VV environments

- Refactored all 7 Forms calendar bug reports (FORM-BUG-1 through FORM-BUG-7) to comply with bug report standard: standalone structure, jargon-free "What Happens," conditions-based "When This Applies," "How to Reproduce" for support audience, Verification summary replacing raw test data, field config appendix, supporting repository notice
- Refactored all 6 Web Services bug reports (WEBSERVICE-BUG-1 through WEBSERVICE-BUG-6) and FORMDASHBOARD-BUG-1 to comply with bug report standard: same restructuring as Forms bugs, plus tone fixes ("fake"→"incorrect", editorial language removed), non-standard "Impact Analysis" sections eliminated
- Replaced "fake Z" terminology with "incorrect Z" / "literal Z" across all bug docs (neutral language per standard)
- Corrected "same timezone = safe" assumption in FORM-BUG-4 severity — DST transitions, business travel, and multi-timezone US states break the self-consistency pattern
- Added V2 init path limitation to `docs/reference/form-fields.md` (flag resets on reload, cannot test init path via console)
- FORM-BUG-1 scope corrected in `docs/reference/form-fields.md`: V1 also strips Z for DateTime+ignoreTZ=true via inline `e.replace('Z','')` — confirmed live via Cat 4 URL parameter tests. Added `enableQListener` property documentation, `.000` ms parsing behavior section, and FillinAndRelate chain transfer table
- Fixed `testing/global-setup.js` BASE_URL construction — was using `vvConfig.instance` (contains `/`) instead of `vvConfig.baseUrl`, producing malformed URLs like `https://vvdemo/EmanuelJofre.visualvault.com`

- Support for adding index fields to a folder ([#71](https://github.com/VisualVault/nodeJs-rest-client-library/pull/71))
- Get user role permissions ([#70](https://github.com/VisualVault/nodeJs-rest-client-library/pull/70))
- CurrentUser namespace and WhoAmI endpoint ([#69](https://github.com/VisualVault/nodeJs-rest-client-library/pull/69))
- ObjectsAPI support ([#68](https://github.com/VisualVault/nodeJs-rest-client-library/pull/68))
- Jest as test framework, replacing placeholder test script
- Documentation folder structure (`docs/`) for platform knowledge
- Task workspace (`tasks/`) for structured investigation tracking
- CHANGELOG.md for tracking server and project changes
- ESLint (flat config) + Prettier + Husky + lint-staged for code quality and pre-commit formatting
- Claude Code custom commands (`[@]-update-docs`, `[@]-smart-commit-push`, `[@]-sync-with-develop`, `[@]-vv-learn`, `[@]-test-forms-date-pw`, `[@]-test-ws-date-pw`, `[@]-test-dash-date-pw`, `[@]-cleanup`)
- `[@]-test-dash-date-pw` command: dashboard date display test execution + artifact generation (TC spec, run file, summary, matrix update). Playwright-based against Telerik RadGrid
- `tasks/date-handling/dashboards/` — dashboard date display investigation: README, matrix (8 categories, 44 slots), analysis (server-side rendering, TZ independence), exploration script, category-specific test scripts (`test-sort-v4.js`, `test-filter-v3.js`, `test-cross-layer.js`)
- Dashboard architecture documentation in `docs/architecture/visualvault-platform.md`: Telerik RadGrid rendering, DOM selectors, date format rules, DateTest Dashboard GUID
- `[@]-test-forms-date-pw` batch mode: multiple space-separated IDs, grouped by TZ. `--skip-verify` flag: backfill test-data.js entries from existing run files without browser session
- `[@]-test-ws-date-pw` command: WS test execution + artifact generation (TC spec, run file, summary, matrix update). Script and browser modes, batch support, TZ simulation
- `docs/guides/scripting.md` — Node.js server data flow guide: script contracts, API serialization chain, field name casing (camelCase), date passthrough behavior
- Web services date-handling test infrastructure: action-driven harness (`webservice-test-harness.js`), direct Node.js runner (`run-ws-test.js`), form button script (`ws-harness-button.js`), test matrix (9 categories, ~118 slots)
- Multi-environment credentials via `.env.json` (gitignored). Loaded at `app.js` startup into `global.VV_ENV`; server-side scripts read credentials from this global with fallback to placeholder defaults
- WS-3 through WS-9 action handlers in `webservice-test-harness.js`: round-trip, API→Forms cross-layer, format tolerance, empty/null handling, update path, query filtering, and date computation patterns
- `verify-ws4-browser.js` — Playwright browser verification script for WS-4 (API→Forms cross-layer testing)
- `docs/reference/api-date-patterns.md` — practical guide for CSV imports and web service datetime handling: decision tree, UTC offset reference, TZ-safe patterns, Bug #8 warnings
- `docs/guides/scripting.md` expanded: server-side date format acceptance table, OData query format tolerance, TZ-safe Date construction patterns for production scripts
- `docs/reference/form-template-xml.md` — Form template XML export format reference: field types with XML element names, Groups/Conditions structure, script library/assignments, built-in form control GUIDs, what's included vs excluded in exports
- `docs/reference/form-fields.md` expanded: field type enum table with 7 new types from production template analysis (Label, Dropdown, Checkbox, CellField, UploadButton, FormIDStamp), `mask`/`placeholder` calendar properties
- `docs/reference/vv-form-api.md` expanded: script event type IDs (onChange/onBlur/onClick), `VV.Form.Template` namespace correction, `CentralDateValidation` operator details, `CloseAndUnlockForm` method, `CreateFormInstance` full signature and FormsAPI payload format
- WS-10 action handler in `webservice-test-harness.js`: compares `postForms` vs `forminstance/` (FormsAPI) endpoints. Includes `createFormRecordViaFormInstance()` helper and `verify-ws10-browser.js` browser verification script with compare + save-stabilize modes (Freshdesk #124697)
- FormTemplateAdmin grid architecture documented in `docs/architecture/visualvault-platform.md`: Telerik RadGrid column layout (12 cols), Export mechanism (`__doPostBack` → XML download), pagination details, ASP.NET strict mode workaround (`addScriptTag`)
- Authentication & Login section in `docs/architecture/visualvault-platform.md`: post-login redirect differences across VV environments (vvdemo → FormDataAdmin, vv5dev → VVPortalUI/home)
- WADNR Environment Reference in `docs/architecture/visualvault-platform.md`: 228 templates (89 active), top calendar field counts per template
- FormsAPI service architecture documented in `docs/architecture/visualvault-platform.md`: separate .NET service, endpoint catalog, JWT auth, form template ID hierarchy, storage format difference (CB-29)
- `docs/reference/api-date-patterns.md` expanded: CB-29 endpoint storage format warning — `postForms` stores ISO+Z, `forminstance/` stores US format (no TZ); workaround for migration scripts
- `docs/guides/scripting.md` expanded: FormsAPI access patterns via `vvClient.formsApi.formInstances.postForm()`, payload format, error handling, comparison table vs `postForms`
- `[@]-cleanup` command: read-only 6-phase repository maintenance audit (staleness, orphans, bloat, doc consistency, config hygiene, git hygiene)
- `testing/README.md` — entry-point documentation for testing infrastructure
- PST timezone project (`America/Los_Angeles`, UTC-8/UTC-7) added to Playwright test matrix — 4 TZ × 3 browsers = 12 projects
- Category 5 (Preset Date) testing complete: 18/18 slots (11P, 7F), 17 test-data entries. Key findings: Bug #7 on all date-only presets in UTC+, Bug #5 on Config D presets (invisible at UTC0), legacy configs safe from Bug #5, Config C presets TZ-independent
- Category 6 (Current Date) testing complete: 15/15 slots (13P, 2F), 14 test-data entries. Key finding: `new Date()` init path is the only fully correct initialization — no Bug #7, no Bug #5 except on non-legacy Config D GFV
- Category 7 (SetFieldValue Formats) major expansion: 33/39 slots done (24P, 9F), 34 test-data entries. All 8 configs tested. Key finding: `useLegacy=true` bypasses Bug #5 fake Z on GFV (Config G/H safe) but does NOT protect date-only fields from Bug #7 (Config E/F still shift in IST). Legacy DateTime GFV returns raw value directly — no UTC conversion (unlike Config C) and no fake Z (unlike Config D).
- Dashboard DB-7 export verification complete: Excel (.xls/HTML), Word (.doc/HTML), and XML exports all preserve date accuracy. `test-export-v1.js` script for reproducible testing. Dashboard investigation fully complete: 44/44 (36P, 8F)
- `xlsx` npm package added as dev dependency for Excel export parsing in dashboard tests
- Playwright testing infrastructure under `testing/` (4-TZ projects, global auth, reusable helpers, data-driven specs)
- Regression-to-artifact pipelines for Forms (`test:pw:regression`), WS (`test:ws:regression`), and Dashboards (`test:dash:regression`). Run tests → capture results → auto-generate run files, summaries, and session index entries. Matrix-based PASS/FAIL for WS and Dashboards.
- Custom Playwright reporter (`testing/reporters/regression-reporter.js`) that captures test results and actual values to JSON for artifact generation
- `selectDateViaLegacyPopup()` in `testing/helpers/vv-calendar.js`: opens legacy field popup via `.cal-icon` toggle, reuses Kendo calendar selection. Enables automated testing of legacy popup code path (Bug #2)
- `testing/date-handling/cat-1-legacy-popup.spec.js`: Category 1 legacy popup tests for Configs E-H. Separate from `cat-1-calendar-popup.spec.js` which skips legacy fields
- Bug #2 and Bug #3 audit reports with Playwright verification (`analysis/bug-2-audit.md`, `analysis/bug-3-audit.md`). Bug #2 independently confirmed via automated Playwright. Bug #3 verified via source code + `parseDateString()` direct invocation (V2 could not be activated on test env)
- DB evidence script (`testing/scripts/audit-bug2-db-evidence.js`): saves popup vs typed records for DB comparison. Confirms Bug #2 causes different `datetime` values in SQL Server (3-hour offset in BRT)
- VV demo server timezone confirmed as BRT (UTC-3) via VVCreateDate vs `toISOString()` offset analysis
- Bug #4 through Bug #7 audit scripts and reports: `audit-bug4-save-format.js`, `audit-bug5-fake-z.js`, `audit-bug6-empty-fields.js`, `audit-bug7-wrong-day.js` with corresponding `bug-{4-7}-audit.md` reports. All 4 bugs independently confirmed via Playwright direct invocation + spec regression

- Dashboard test specs (`dash-filter.spec.js`, `dash-sort.spec.js`, `dash-export.spec.js`, `dash-cross-layer.spec.js`) — converted from standalone scripts to Playwright specs in `testing/date-handling/`
- `scripts/templates/` folder with boilerplate script patterns (`webservice-pattern.js`, `web-service-call-pattern.js`)
- `scripts/log.js` — log shim so `scripts/server-scripts/` harness works locally via runner

### Changed

- File reorganization: all JS files moved out of `tasks/date-handling/` (analysis-only folder). Server harness → `scripts/server-scripts/`, form button script → `scripts/form-scripts/`, test runner + verification scripts → `testing/scripts/`, templates → `scripts/templates/`, log shim → `testing/helpers/ws-log.js`. Deleted `forms-calendar/main.js` (webpack bundle)
- Bug #2 severity upgraded from Low to **Medium** — DB schema shows all fields are `datetime` (no `date` type), making format inconsistency an actual data difference. SQL queries and reports affected
- Matrix summary counts corrected across 6 categories to match actual row data: Cat 1 (7P/13F→4P/16F), Cat 2 (11P/5F→8P/8F), Cat 3 (14P/4F→10P/8F), Cat 7 (29P/9F→23P/16F), Cat 8 (12P/6F/1P→13P/6F/0P), Cat 12 (5P/9F→1P/13F). Total 130P/72F→111P/93F
- DB wording audit across all 7 bug analysis docs: clarified SQL Server `datetime` storage semantics, replaced VV Query Admin display format with actual SSMS datetime values, updated Bug #7 double-shift from UNVERIFIED to VERIFIED (confirmed -2 days for Date objects in IST)
- Legacy popup description in `docs/reference/form-fields.md` corrected: popup is Kendo calendar (not Angular UI Bootstrap as previously documented)
- `docs/reference/api-date-patterns.md` corrected: server does not uniformly store UTC — stores whatever the client sends (mixed UTC/local in same column)
- All 13 bug analysis documents (7 Forms, 6 Web Services) restructured for support/product readability: user-facing opening, progressive technical disclosure, concepts introduced before use. Bug IDs renamed: `Bug #X` → `FORM-BUG-X`, `WS-BUG-X` → `WEBSERVICE-BUG-X`. Audit findings merged into original documents (separate audit files removed). Classification tables replaced with narrative severity sections.
- Dashboard analysis restructured: `analysis.md` → `analysis/overview.md` (matching forms-calendar and web-services pattern). Created `FORMDASHBOARD-BUG-1` (format inconsistency between dashboard .NET `M/d/yyyy` and Forms Angular `MM/dd/yyyy` — cosmetic, LOW severity)

### Fixed

- Firefox timezone IDs in `playwright.config.js`: `Asia/Calcutta` → `Asia/Kolkata`, `Etc/GMT` → `UTC`. Firefox's `setTimezoneOverride` rejects legacy IANA names.
- `docs/guides/dev-setup.md` — canonical dev environment setup guide (single source of truth for all setup instructions)
- Playwright helpers: `captureDisplayValue`, `saveFormAndReload`, `roundTripCycle` in `testing/helpers/vv-form.js`
- Multi-browser Playwright testing: TZ × browser matrix (Chromium, Firefox, WebKit) with per-browser npm scripts (`test:pw:chromium`, `test:pw:firefox`, `test:pw:webkit`)
- Portable test record creation: `global-setup.js` auto-creates saved form records via browser UI using per-field input methods (popup, typed, SetFieldValue), caches DataIDs in `saved-records.json` (1h TTL). Replaces hardcoded SAVED_RECORDS for environment portability
- `RECORD_DEFINITIONS` in `vv-config.js`: declarative record definitions with timezone, field values, and input methods per record
- DateTime popup support in `vv-calendar.js`: `selectDateViaPopup` handles both kendo-datepicker (date-only) and kendo-datetimepicker (DateTime) popups with infinite-scroll navigation
- Legacy field handling in calendar helpers: `typeDateInField` and `roundTripCycle` detect plain `<input>` (useLegacy=true) vs Kendo wrappers and adapt interaction accordingly
- `saveFormOnly` helper in `vv-form.js`: saves form and extracts DataID via `VV.Form.DataID` property (reliable post-save indicator)
- New Playwright spec files: cat-5 (preset), cat-6 (current date), cat-8 (GetFieldValue), cat-8b (GetDateObject), cat-9-gdoc (GDOC round-trip), cat-9-gfv (GFV round-trip), cat-12 (edge cases) — 11 total category specs
- Web services date-handling test infrastructure: test matrix (WS-1 through WS-9, 145 slots — complete), form button harness (`ws-harness-button.js`), direct Node.js runner (`run-ws-test.js`), and `README.md` with setup/architecture docs

- `tasks/form-templates/` — new task folder for VV form template XML analysis and generation: original DateTest export, Subscription Pack reference, generator script (`generate-datetest-v2.js`), redesigned DateTest v2 template with descriptive field names (Cal_A, Pre_B, Cur_C), labels, and grouped layout

### Changed

- Renamed all 28 date fields on the VV platform form: `DataFieldN` → `FieldN` (removed "Data" prefix). Updated 22 files across testing fixtures, helpers, specs, WS harness, commands, and all reference documentation to match
- Moved XML template exports from `tasks/date-handling/forms-calendar/` to `tasks/form-templates/` with descriptive filenames (`datetest-original.xml`, `subscription-pack.xml`)
- Normalized date test command names: `[@]-create-pw-date-test` → `[@]-test-forms-date-pw`, `[@]-run-ws-date-test` → `[@]-test-ws-date-pw`, `[@]-create-db-date-test` → `[@]-test-dash-date-pw`. Consistent `test-{layer}-date-pw` pattern
- Removed `[@]-create-date-test` command (Chrome MCP variant deprecated — Playwright covers all forms testing)
- `[@]-test-forms-date-pw` command (was `[@]-create-pw-date-test`): removed Chrome hardcode from initial verification (Phase 0.3); browser row in generated TC specs now reflects actual engine used; Layer 2 re-runs handle multi-browser regression via `npx playwright test --project=...`
- Playwright output dirs moved from `/tmp/pw-test-results` and `/tmp/pw-report` to `testing/tmp/test-results` and `testing/tmp/playwright-report` (project-local, gitignored) for portability across machines
- Consolidated setup instructions into `docs/guides/dev-setup.md`; trimmed duplicated setup from `CLAUDE.md`, `testing/date-handling/README.md`, and `docs/guides/playwright-testing.md` (replaced with links)
- `[@]-update-docs` command: expanded documentation registry (6 → 12 files), added single-source-of-truth principle, added `testing/` impact zones

### Fixed

- WebKit popup click interception in `selectDateInDatePicker` (`vv-calendar.js`): switched from Playwright locator clicks to `page.evaluate()` DOM clicks for month and day selection, matching the proven pattern in `selectDateInDateTimePicker`. Fixes 4 WebKit-only failures caused by Playwright WebKit z-index stacking differences vs real Safari
- Cat 1 spec now skips legacy configs (E-H) — legacy fields use Angular UI Bootstrap datepicker, not Kendo; the Kendo popup toggle selector doesn't exist in legacy DOM. Eliminates 10 misleading timeout failures across all browsers
- Timezone config files (`testing/config/tz-*.json`) updated from flat `{ "timezoneId": "..." }` to nested `{ "browser": { "contextOptions": { "timezoneId": "..." } } }` format required by `playwright-cli` v0.1.3 — previous format was silently ignored, BRT tests only passed because it matched the system timezone

### Removed

- `Puppeteer.md` — stale (155 days), fully superseded by `docs/guides/playwright-testing.md`
- `tasks/date-handling/forms-calendar/test-bak-20260330/` — orphaned backup directory (16 files), superseded by current test structure
- `tasks/date-handling/forms-calendar/main.js` — untracked from git (13MB minified bundle, added to `.gitignore`)

## [1.2.0] - 2026-02-19

_Version bump for npm publish. Includes all changes above._

## Prior History

Changes before this changelog was introduced. See [git log](https://github.com/emanueljofre/nodeV2/commits/master) for full history.

- Add `setFieldImage` API function and config.yml path (2025-08-21)
- Allow parallel file downloads (2025-03-13)
- Add NotificationsApi with ForceUIRefresh endpoint (2025-02-11)
- Instantiate DocApi, FormsApi, StudioApi managers when authenticating with JWT (2024-09-17)
- Add function to run scheduled processes (2024-06-10)
- Fix common.js logging (2024-03-21)
