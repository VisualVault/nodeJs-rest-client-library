/**
 * report.js
 *
 * Converts review findings into markdown reports.
 * Two output types: per-template detail and cross-template summary.
 */

const fs = require('fs');
const path = require('path');

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

function bySeverity(a, b) {
    return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
}

/**
 * Generate a markdown report for a single template.
 */
function generateTemplateReport(templateName, findings, ruleCount) {
    const errors = findings.filter((f) => f.severity === 'error');
    const warnings = findings.filter((f) => f.severity === 'warning');
    const infos = findings.filter((f) => f.severity === 'info');

    const lines = [];
    lines.push(`# Standards Review: ${templateName}`);
    lines.push('');
    lines.push(
        `Generated: ${new Date().toISOString().slice(0, 10)} | Rules: ${ruleCount} | Findings: ${findings.length} (${errors.length} errors, ${warnings.length} warnings, ${infos.length} info)`
    );
    lines.push('');

    // Summary table
    lines.push('## Summary');
    lines.push('');
    lines.push('| Severity | Count |');
    lines.push('| :------- | ----: |');
    lines.push(`| Error    | ${errors.length} |`);
    lines.push(`| Warning  | ${warnings.length} |`);
    lines.push(`| Info     | ${infos.length} |`);
    lines.push('');

    // Findings by severity
    for (const [label, group] of [
        ['Errors', errors],
        ['Warnings', warnings],
        ['Info', infos],
    ]) {
        if (group.length === 0) continue;
        lines.push(`## ${label}`);
        lines.push('');
        lines.push('| Rule | Field | Page | Message |');
        lines.push('| :--- | :---- | :--- | :------ |');
        for (const f of group) {
            lines.push(`| ${f.ruleId} | ${f.field || '—'} | ${f.page || '—'} | ${f.message} |`);
        }
        lines.push('');
    }

    if (findings.length === 0) {
        lines.push('No issues found.');
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Generate the main summary report across all templates.
 */
function generateSummaryReport(templateResults, ruleCount) {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const totalTemplates = templateResults.length;
    const totalFindings = templateResults.reduce((sum, t) => sum + t.findings.length, 0);
    const totalErrors = templateResults.reduce(
        (s, t) => s + t.findings.filter((f) => f.severity === 'error').length,
        0
    );
    const totalWarnings = templateResults.reduce(
        (s, t) => s + t.findings.filter((f) => f.severity === 'warning').length,
        0
    );
    const totalInfo = templateResults.reduce((s, t) => s + t.findings.filter((f) => f.severity === 'info').length, 0);
    const withErrors = templateResults.filter((t) => t.findings.some((f) => f.severity === 'error')).length;
    const withWarnings = templateResults.filter((t) => t.findings.some((f) => f.severity === 'warning')).length;
    const clean = templateResults.filter((t) => t.findings.length === 0).length;
    const complianceRate = totalTemplates > 0 ? ((clean / totalTemplates) * 100).toFixed(1) : '0.0';

    const lines = [];

    // --- Header ---
    lines.push('# Form Template Standards Review');
    lines.push('');
    lines.push(`**Run:** ${timestamp}  `);
    lines.push(`**Templates:** ${totalTemplates} | **Rules:** ${ruleCount} | **Findings:** ${totalFindings}  `);
    lines.push(`**Clean templates:** ${clean} of ${totalTemplates} (${complianceRate}% compliance)`);
    lines.push('');

    // --- Severity Breakdown ---
    lines.push('## Findings by Severity');
    lines.push('');
    lines.push('| Severity | Count | % of Total |');
    lines.push('| :------- | ----: | ---------: |');
    for (const [label, count] of [
        ['Error', totalErrors],
        ['Warning', totalWarnings],
        ['Info', totalInfo],
    ]) {
        const pct = totalFindings > 0 ? ((count / totalFindings) * 100).toFixed(1) : '0.0';
        lines.push(`| ${label} | ${count} | ${pct}% |`);
    }
    lines.push(`| **Total** | **${totalFindings}** | |`);
    lines.push('');

    // --- Template Coverage ---
    lines.push('## Template Coverage');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('| :----- | ----: |');
    lines.push(`| Templates scanned | ${totalTemplates} |`);
    lines.push(`| With errors | ${withErrors} |`);
    lines.push(
        `| With warnings (no errors) | ${withWarnings - withErrors >= 0 ? templateResults.filter((t) => t.findings.some((f) => f.severity === 'warning') && !t.findings.some((f) => f.severity === 'error')).length : 0} |`
    );
    lines.push(
        `| Info only | ${templateResults.filter((t) => t.findings.length > 0 && t.findings.every((f) => f.severity === 'info')).length} |`
    );
    lines.push(`| Clean (no findings) | ${clean} |`);
    lines.push('');

    // --- By Rule ---
    const byRule = {};
    for (const t of templateResults) {
        for (const f of t.findings) {
            if (!byRule[f.ruleId]) byRule[f.ruleId] = { error: 0, warning: 0, info: 0, templates: new Set() };
            byRule[f.ruleId][f.severity]++;
            byRule[f.ruleId].templates.add(t.templateName);
        }
    }

    lines.push('## Findings by Rule');
    lines.push('');
    lines.push('| # | Rule | Errors | Warnings | Info | Total | Templates |');
    lines.push('| -:| :--- | -----: | -------: | ---: | ----: | --------: |');
    const sortedRules = Object.entries(byRule).sort(
        (a, b) => b[1].error + b[1].warning + b[1].info - (a[1].error + a[1].warning + a[1].info)
    );
    sortedRules.forEach(([ruleId, stats], i) => {
        const total = stats.error + stats.warning + stats.info;
        lines.push(
            `| ${i + 1} | ${ruleId} | ${stats.error} | ${stats.warning} | ${stats.info} | ${total} | ${stats.templates.size} |`
        );
    });
    // Rules with zero findings
    const activeRuleIds = new Set(Object.keys(byRule));
    const zeroRules = [];
    // We don't have the full rule list here, but we can note if all rules had findings
    if (sortedRules.length < ruleCount) {
        lines.push(`| — | *(${ruleCount - sortedRules.length} rules with 0 findings)* | 0 | 0 | 0 | 0 | 0 |`);
    }
    lines.push('');

    // --- All Templates ---
    const allTemplates = templateResults
        .map((t) => ({
            name: t.templateName,
            total: t.findings.length,
            errors: t.findings.filter((f) => f.severity === 'error').length,
            warnings: t.findings.filter((f) => f.severity === 'warning').length,
            infos: t.findings.filter((f) => f.severity === 'info').length,
        }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    lines.push('## All Templates');
    lines.push('');
    lines.push('| # | Template | Errors | Warnings | Info | Total | Status |');
    lines.push('| -:| :------- | -----: | -------: | ---: | ----: | :----- |');
    allTemplates.forEach((t, i) => {
        let status;
        if (t.total === 0) status = 'Clean';
        else if (t.errors > 0) status = 'Errors';
        else if (t.warnings > 0) status = 'Warnings';
        else status = 'Info';
        lines.push(`| ${i + 1} | ${t.name} | ${t.errors} | ${t.warnings} | ${t.infos} | ${t.total} | ${status} |`);
    });
    lines.push('');

    return lines.join('\n');
}

/**
 * Build structured metadata for a review run.
 */
function buildRunMetadata(templateResults, rules, opts) {
    const now = new Date().toISOString();
    const totalFindings = templateResults.reduce((sum, t) => sum + t.findings.length, 0);

    // By-rule breakdown
    const byRule = {};
    for (const t of templateResults) {
        for (const f of t.findings) {
            if (!byRule[f.ruleId]) byRule[f.ruleId] = { error: 0, warning: 0, info: 0, templates: new Set() };
            byRule[f.ruleId][f.severity]++;
            byRule[f.ruleId].templates.add(t.templateName);
        }
    }

    const ruleBreakdown = {};
    for (const [ruleId, stats] of Object.entries(byRule)) {
        ruleBreakdown[ruleId] = {
            errors: stats.error,
            warnings: stats.warning,
            info: stats.info,
            templatesAffected: stats.templates.size,
        };
    }

    // Per-template breakdown
    const templates = templateResults.map((t) => {
        const errors = t.findings.filter((f) => f.severity === 'error').length;
        const warnings = t.findings.filter((f) => f.severity === 'warning').length;
        const infos = t.findings.filter((f) => f.severity === 'info').length;
        return {
            name: t.templateName,
            findings: t.findings.length,
            errors,
            warnings,
            info: infos,
        };
    });

    return {
        generatedAt: now,
        project: opts.project || null,
        filters: {
            template: opts.template || null,
            rule: opts.rule || null,
            severity: opts.severity || null,
        },
        rules: rules.map((r) => r.id),
        ruleCount: rules.length,
        summary: {
            templatesScanned: templateResults.length,
            templatesWithErrors: templateResults.filter((t) => t.findings.some((f) => f.severity === 'error')).length,
            templatesWithWarnings: templateResults.filter((t) => t.findings.some((f) => f.severity === 'warning'))
                .length,
            cleanTemplates: templateResults.filter((t) => t.findings.length === 0).length,
            totalFindings,
            totalErrors: templateResults.reduce(
                (s, t) => s + t.findings.filter((f) => f.severity === 'error').length,
                0
            ),
            totalWarnings: templateResults.reduce(
                (s, t) => s + t.findings.filter((f) => f.severity === 'warning').length,
                0
            ),
            totalInfo: templateResults.reduce((s, t) => s + t.findings.filter((f) => f.severity === 'info').length, 0),
        },
        byRule: ruleBreakdown,
        templates,
    };
}

/**
 * Write reports to disk.
 */
function writeReports(outputDir, templateResults, rules, opts) {
    fs.mkdirSync(outputDir, { recursive: true });

    // Per-template reports
    for (const result of templateResults) {
        const report = generateTemplateReport(result.templateName, result.findings, rules.length);
        const filePath = path.join(outputDir, `${result.templateName}.md`);
        fs.writeFileSync(filePath, report, 'utf-8');
    }

    // Summary report
    const summary = generateSummaryReport(templateResults, rules.length);
    fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf-8');

    // Run metadata
    const metadata = buildRunMetadata(templateResults, rules, opts);
    const metadataPath = path.join(outputDir, 'run-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    return {
        templateReports: templateResults.length,
        summaryPath: path.join(outputDir, 'summary.md'),
        metadataPath,
    };
}

module.exports = { generateTemplateReport, generateSummaryReport, buildRunMetadata, writeReports };
