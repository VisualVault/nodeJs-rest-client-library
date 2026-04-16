#!/usr/bin/env node

/**
 * review-forms.js
 *
 * Standards review tool for VV form template XML files.
 * Parses extracted templates, runs rule checks, and generates markdown reports.
 *
 * Usage:
 *   node tools/review/review-forms.js --project wadnr
 *   node tools/review/review-forms.js --project wadnr --template Appeal
 *   node tools/review/review-forms.js --project wadnr --rule field-naming
 *   node tools/review/review-forms.js --project wadnr --severity error
 *   node tools/review/review-forms.js --project wadnr --print
 *
 * Input:  projects/{project}/extracts/form-templates/*.xml
 * Output: projects/{project}/analysis/standards-review/
 */

const fs = require('fs');
const path = require('path');
const { parseTemplate } = require('./lib/parse-template');
const { writeReports, generateTemplateReport, generateSummaryReport } = require('./lib/report');
const allRules = require('./rules');

// ---------- Parse CLI args ----------

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--project':
                parsed.project = args[++i];
                break;
            case '--template':
                parsed.template = args[++i];
                break;
            case '--rule':
                parsed.rule = args[++i];
                break;
            case '--severity':
                parsed.severity = args[++i];
                break;
            case '--print':
                parsed.print = true;
                break;
            case '--help':
                console.log(`
Form Template Standards Review

Options:
  --project <name>      Required. Customer project to review.
  --template <name>     Review a single template (filename without .xml).
  --rule <id>           Only run a specific rule (e.g., field-naming).
  --severity <level>    Only show findings at this severity or above (error, warning, info).
  --print               Print to stdout only (no file output).
  --help                Show this help.

Examples:
  node tools/review/review-forms.js --project wadnr
  node tools/review/review-forms.js --project wadnr --template Appeal --print
  node tools/review/review-forms.js --project wadnr --rule accessibility
`);
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${args[i]}`);
                process.exit(1);
        }
    }

    return parsed;
}

// ---------- Severity filter ----------

const SEVERITY_LEVELS = { error: 0, warning: 1, info: 2 };

function filterBySeverity(findings, minSeverity) {
    if (!minSeverity) return findings;
    const threshold = SEVERITY_LEVELS[minSeverity];
    if (threshold === undefined) {
        console.error(`Unknown severity: ${minSeverity}. Use: error, warning, info`);
        process.exit(1);
    }
    return findings.filter((f) => (SEVERITY_LEVELS[f.severity] ?? 9) <= threshold);
}

// ---------- Main ----------

function main() {
    const opts = parseArgs();

    if (!opts.project) {
        console.error('Error: --project is required');
        process.exit(1);
    }

    const templatesDir = path.resolve(__dirname, `../../projects/${opts.project}/extracts/form-templates`);
    const outputDir = path.resolve(__dirname, `../../projects/${opts.project}/analysis/standards-review`);

    if (!fs.existsSync(templatesDir)) {
        console.error(`Templates directory not found: ${templatesDir}`);
        console.error(`Run extract first: node tools/extract/extract.js --output projects/${opts.project}/extracts`);
        process.exit(1);
    }

    // Discover template files (XML and JSON)
    let templateFiles = fs
        .readdirSync(templatesDir)
        .filter((f) => f.endsWith('.xml') || f.endsWith('.json'))
        .sort();

    if (opts.template) {
        templateFiles = templateFiles.filter((f) => f.replace(/\.(xml|json)$/, '') === opts.template);
        if (templateFiles.length === 0) {
            console.error(`Template not found: ${opts.template} in ${templatesDir}`);
            process.exit(1);
        }
    }

    // Filter rules
    let rules = allRules;
    if (opts.rule) {
        rules = allRules.filter((r) => r.id === opts.rule);
        if (rules.length === 0) {
            console.error(`Unknown rule: ${opts.rule}. Available: ${allRules.map((r) => r.id).join(', ')}`);
            process.exit(1);
        }
    }

    console.log(`Reviewing ${templateFiles.length} template(s) with ${rules.length} rule(s)...`);

    // Process templates
    const templateResults = [];
    let errors = 0;

    for (const file of templateFiles) {
        const filePath = path.join(templatesDir, file);
        const templateName = file.replace(/\.(xml|json)$/, '');

        try {
            const context = parseTemplate(filePath);
            let findings = [];

            for (const rule of rules) {
                const ruleFindings = rule.check(context);
                findings.push(...ruleFindings);
            }

            // Apply severity filter
            findings = filterBySeverity(findings, opts.severity);

            templateResults.push({ templateName, findings });
        } catch (err) {
            errors++;
            console.error(`  Error parsing ${templateName}: ${err.message}`);
            templateResults.push({
                templateName,
                findings: [
                    {
                        ruleId: 'parse-error',
                        severity: 'error',
                        field: '—',
                        page: '—',
                        message: `Failed to parse: ${err.message}`,
                    },
                ],
            });
        }
    }

    // Output
    const ruleCount = rules.length;
    const totalFindings = templateResults.reduce((sum, t) => sum + t.findings.length, 0);
    const withIssues = templateResults.filter((t) => t.findings.length > 0).length;

    if (opts.print) {
        // Stdout mode
        for (const result of templateResults) {
            if (result.findings.length === 0) continue;
            console.log(`\n${'='.repeat(60)}`);
            console.log(generateTemplateReport(result.templateName, result.findings, ruleCount));
        }
        console.log(`\n${'='.repeat(60)}`);
        console.log(generateSummaryReport(templateResults, ruleCount));
    } else {
        // File mode
        const { summaryPath, matrixPath, metadataPath } = writeReports(outputDir, templateResults, rules, opts);
        console.log(`\nReports written to: ${path.relative(process.cwd(), outputDir)}/`);
        console.log(`  Summary:  ${path.relative(process.cwd(), summaryPath)}`);
        console.log(`  Matrix:   ${path.relative(process.cwd(), matrixPath)}`);
        console.log(`  Metadata: ${path.relative(process.cwd(), metadataPath)}`);
    }

    // Console summary
    console.log(`\nDone: ${templateResults.length} templates, ${totalFindings} findings, ${withIssues} with issues`);
    if (errors > 0) console.log(`  ${errors} template(s) failed to parse`);
}

main();
