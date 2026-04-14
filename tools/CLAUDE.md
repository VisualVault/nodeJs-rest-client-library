# Tools — General-Purpose Workspace Tooling

Standalone CLI utilities for working with VV environments. Not tied to Playwright test execution — used for development, analysis, debugging, reviews, and workflow automation.

## Subfolders

| Folder        | Purpose                                       | Example usage                                                                              |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `extract/`    | Extract data from any VV environment          | `node tools/extract/extract.js --output projects/wadnr/extracts`                           |
| `runners/`    | Execute workflows, WS/SP harness, debug       | `node tools/runners/run-ws-test.js --action WS-2`, `node tools/runners/run-sp-test.js`     |
| `audit/`      | Verify platform behaviors in browser          | `node tools/audit/audit-bug5-fake-z.js`                                                    |
| `inventory/`  | Analyze extracted project data                | `node tools/inventory/inventory-fields.js`                                                 |
| `generators/` | Create structured artifacts from test results | `node tools/generators/generate-artifacts.js`                                              |
| `explore/`    | Platform exploration + version monitoring     | `npm run explore:headed`, `npm run version:snapshot`                                       |
| `admin/`      | Create/manage VV admin objects via Playwright | `node tools/admin/create-ws.js --project emanueljofre --name myWS`                         |
| `review/`     | Standards compliance review + reports         | `node tools/review/review-forms.js --project wadnr`                                        |
| `helpers/`    | Shared libraries used by tools                | `vv-admin.js`, `vv-probes.js`, `vv-browser-probes.js`, `vv-explore.js`, `build-context.js` |

## Explore Commands

```bash
npm run explore              # Run exploration specs (headless)
npm run explore:headed       # Run with visible browser
npm run explore:report       # Open HTML report with artifacts
npm run version:snapshot     # Capture current platform version state
npm run version:diff         # Compare two most recent snapshots
npm run version:list         # List available snapshots
npm run env:profile          # Generate environment profile (HTTP only, ~3s)
npm run env:profile:browser  # Generate profile with browser probes (~12s)
```

Environment profiles are saved to `projects/{customer}/environment.json`. Use `--project <name>` to target a specific customer, `--print` for stdout only. Browser probes capture front-end library versions (jQuery, Kendo, Telerik, Angular) from both the Admin app and FormViewer SPA — including Kendo v1/v2 variant detection.

## Write Safety

Tools connect to live VV environments. See root `CLAUDE.md` § "Write Safety" for the full policy.

- **Extract tools are read-only by design.** All extract components set `readOnly: true` on their API clients. Do not add write operations to extract components.
- **Explore specs are read-only.** They navigate and inspect — never click Save, Edit, or Delete in admin panels.
- **Runners (`run-ws-test.js`)** respect `readOnly` and `writePolicy` from `.env.json`. The WS harness can invoke web services that create/modify forms — it is governed by the same write policy.
- **Audit scripts** that create test records (e.g., `audit-bug2-db-evidence.js`) should use `saveFormOnly()` from `testing/helpers/vv-form.js` so the write-policy guard applies. New audit scripts that write data require explicit user approval.
- **Do not modify** `lib/VVRestApi/VVRestApiNodeJs/common.js` (the API-layer write guard) without explicit user approval.

## Conventions

1. **Environment-agnostic.** Tools work for any VV customer/environment, not just WADNR. Customer-specific references belong in `projects/`, not here.
2. **Parameterized output.** Export and inventory tools accept `--output` flags to direct results to the appropriate `projects/{customer}/` folder.
3. **Shared.** All tools are committed to the team repo — they benefit every developer.
4. **Helpers split.** `tools/helpers/` has libraries used by tools (vv-admin, vv-probes, vv-browser-probes, vv-sync, ws-api). Test-specific helpers (vv-form, vv-calendar) stay in `testing/helpers/`.
5. **Environment profiles are read-only.** They only GET data via HTTP and navigate browser pages — no writes to VV environments.
