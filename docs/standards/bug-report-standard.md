# Bug Report Standard

Guidelines for writing bug reports that will be read by people with no prior context — product teams, developers picking up the fix, support engineers triaging tickets.

Reference implementation: `research/date-handling/forms-calendar/analysis/bug-1-timezone-stripping.md`

---

## Bug ID Convention

Bug IDs follow the pattern `{COMPONENT}-BUG-{N}`:

| Component               | Prefix               | Example                |
| ----------------------- | -------------------- | ---------------------- |
| Forms calendar fields   | `FORM-BUG-`          | FORM-BUG-1, FORM-BUG-7 |
| Web Services (REST API) | `WEBSERVICE-BUG-`    | WEBSERVICE-BUG-1       |
| Analytic Dashboards     | `FORMDASHBOARD-BUG-` | FORMDASHBOARD-BUG-1    |
| Reports                 | `REPORT-BUG-`        | (future)               |
| Node.js Client Library  | `NODECLIENT-BUG-`    | (future)               |

Numbers are sequential within each component. Once assigned, a bug ID is permanent — do not renumber.

---

## Reading Guide

The document is structured in layers. Different readers stop at different depths:

| Reader                      | Sections to read                                                        | Time    |
| --------------------------- | ----------------------------------------------------------------------- | ------- |
| **Support / Product**       | 1. What Happens, 2. When This Applies, 3. Severity, 4. How to Reproduce | ~3 min  |
| **Developer investigating** | Above + 5. Background, 6. The Problem in Detail                         | ~10 min |
| **Developer fixing**        | Above + 7. Verification, 8. Technical Root Cause, + companion doc       | ~15 min |

Write with this in mind: a support engineer should be able to triage the bug after reading the first four sections without touching any code or technical detail. Everything after Severity is for developers.

---

## Document Structure

Every bug report follows this structure. Sections are in this order because each builds on the previous one.

### 1. What Happens

**Purpose**: The reader understands the observable symptom in under 30 seconds.

- Describe what the user sees go wrong, in plain language
- Include one concrete example with real values
- No function names, no code path names, no internal flags, no jargon
- A non-technical stakeholder should be able to read this section and understand the impact

### 2. When This Applies

**Purpose**: The reader can answer "does this affect me?" before any technical detail.

- List every condition that must be true for the bug to manifest
- Each condition gets its own numbered subsection with a brief explanation
- Use tables for multi-dimensional scope (e.g., which code path + field configuration combinations are affected)
- If a value "arrives" at a component, explain where it came from — trace the full data flow
- Introduce technical terms here (not before) — define them in the sentence that first uses them

**Condition headings must not use undefined terminology.** The heading states the condition in plain terms; the body introduces and defines any technical terms. For example, use "The form must be running a specific version of the calendar loading code" as the heading, then introduce "V1" and "V2" in the body text.

**Does not include**: _Why_ each condition causes the bug — only _what_ must be true. If a condition needs a mechanism explanation (e.g., "non-legacy fields are safe because of a normalization step"), state the condition and link to the relevant subsection in Problem in Detail. The reader at this stage needs to know if they're affected, not how the code works.

### 3. Severity

**Purpose**: Prioritization context.

- State the active impact scope — what's affected right now, in what scenarios
- If the bug has limited real-world impact (e.g., self-consistent save/reload masks it), say so explicitly
- Do not overstate ("all users affected") or understate ("dormant") — describe the actual scope
- Rate using the severity definitions below, with a brief justification

**Severity levels:**

| Level        | Definition                                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRITICAL** | Data loss or corruption that cannot be recovered, or the defect affects all users in all configurations with no workaround                                                          |
| **HIGH**     | Incorrect data is stored or returned, affecting a broad set of users or configurations. Workarounds exist but require non-obvious changes                                           |
| **MEDIUM**   | Incorrect behavior with a narrow trigger (specific configuration, specific data source, specific timezone). Workarounds are available or the most common usage paths are unaffected |
| **LOW**      | Cosmetic, edge-case-only, or theoretical — the defect exists in code but has no confirmed real-world impact under tested conditions                                                 |

### 4. How to Reproduce

**Purpose**: A support engineer or QA person can verify the bug without reading any code.

- Step-by-step instructions: what URL to open, what timezone to set, what field to interact with, what to observe
- State the **expected result** (correct behavior) and the **actual result** (buggy behavior)
- If the bug requires environment setup (e.g., changing system timezone), include those steps
- If automated reproduction exists, reference the spec file and the command to run it

Keep this short — 5 to 10 steps maximum. This is the last section a support/product reader needs.

### 5. Background

**Purpose**: Technical context the reader needs to understand the root cause.

- Explain the system architecture relevant to this bug (code paths, flags, data flow)
- Define any remaining technical terms not introduced in "When This Applies"
- State what was tested, where, and what was not tested
- This section is optional if "When This Applies" already provides sufficient context

**Avoid redundancy**: If "When This Applies" already introduces a concept (e.g., V1/V2 code paths), Background should add _new_ detail (activation conditions, testing coverage, flag locations) — not re-explain the same concept. If the reader would get the same information from both sections, one of them has too much.

### 6. The Problem in Detail

**Purpose**: A developer can understand exactly what's going wrong and why.

- Show the defective code (all implementations if the bug exists in multiple code paths)
- Walk through a step-by-step example with real values
- Document edge cases, recovery branches, interactions with other bugs
- Label which code path each subsection applies to

**Does not include**: File paths, line numbers, or call site tables — those go in Technical Root Cause. This section explains _how_ the code produces the wrong result; Technical Root Cause is the _reference_ for where to find that code. Don't duplicate code blocks between them. If the defective code is shown here with a walkthrough, Technical Root Cause can reference it and add location details without repeating the code.

**Related bugs**: If this bug interacts with other documented bugs, include a "Relationship to {BUG-ID}" subsection. State the relationship directionally:

- "A feeds into B" (one bug's output triggers another)
- "A and B are independent" (same symptom, different mechanisms)
- "A masks B" (fixing A would expose B)

Explain _why_ they're related or independent — don't just link.

### 7. Verification

**Purpose**: Give the reader confidence that the bug is real and measured, without overwhelming them with raw test data.

This is a **summary**, not a data dump. One paragraph covering:

- **What was tested**: environment, timezones, tools, methodology
- **Scope of testing**: how many tests, how many configurations, pass/fail counts
- **Key result**: one sentence stating the confirmed behavior (e.g., "popup and typed input produce different stored values for all 4 legacy configs across 2 timezones")
- **Limitations**: what could not be tested and why (e.g., "V2 init path could not be end-to-end tested because the flag resets on reload")

If a specific data table is essential to understanding the bug's behavior (e.g., "what gets stored for each input method"), it belongs in **Problem in Detail** — not here. The Verification section confirms the conclusions; Problem in Detail shows the evidence that matters.

**Supporting repository notice**: Include a note that a supporting test repository exists with automation scripts, test specs, per-test results, and raw data. State that access can be requested. This ensures readers who receive the bug report standalone know there is more material available.

**Does not include**:

- Per-test-case PASS/FAIL tables — those live in the test repository
- Internal test IDs (e.g., "3-A-BRT-BRT") — use descriptive labels if referencing specific tests
- Regression baseline data for other bugs — summarize ("V1 regression: 10P/8F, failures attributable to FORM-BUG-4, 5, 7") rather than listing every row
- Database dumps or raw query results — summarize the finding, reference the repository for raw data

### 8. Technical Root Cause

**Purpose**: A developer knows exactly what code to look at.

- File paths, function names, line numbers
- Call sites — where the defective function is invoked from
- Present all implementations as peers if the bug exists in multiple code paths
- If the defective code was already shown in "The Problem in Detail," reference it — don't repeat it. Add call site tables and location details here.

### 9. Workarounds and Fix Recommendations

**Purpose**: Actionable next steps.

- **This goes in a separate companion document** (e.g., `bug-N-fix-recommendations.md`)
- The bug report links to it with a one-line reference at the end
- See [Companion Document Structure](#companion-document-structure) for its internal format

**Why separate**: The bug report describes the problem — it's stable once written. Fix recommendations evolve as understanding deepens and may be shared with different audiences.

### Appendix: Field Configuration Reference (when applicable)

If the document references named field configurations (e.g., "Config A," "Config D"), include the full configuration table as an appendix at the end of the document, before the companion doc link. This keeps the doc standalone — the reader can scroll down to decode any config letter without needing access to other documents.

The appendix is the same table in every bug report (copy from the canonical source). Narrative sections reference configs by letter; the appendix provides the full mapping.

---

## Companion Document Structure

The fix recommendations companion doc (`bug-N-fix-recommendations.md`) follows this structure:

### 1. Workarounds

- Grouped by code path or scenario
- Each workaround states what it avoids and any trade-offs
- If no workaround is needed for a scenario (e.g., saved user data is unaffected), state that explicitly

### 2. Proposed Fix

- Before/after code blocks for each code path that needs changes
- A "Key Changes" summary listing what changed and why (numbered, one per change)

### 3. Fix Impact Assessment

- **What Changes If Fixed**: bullet list of behavior changes
- **Backwards Compatibility Risk**: rated LOW/MEDIUM/HIGH with explanation. Call out whether existing saved data is affected.
- **Regression Risk**: what could break, what needs testing, deployment ordering constraints

---

## Scope Boundary Check

Before finalizing a bug report, verify that the defect's **full scope** is accounted for:

1. List every code path and configuration where the defect could manifest
2. For each, confirm it is covered either in _this_ report or explicitly in another bug report
3. If a gap exists — a scenario that falls between this bug and another — either expand this report's scope or document the gap with a note explaining which report the reader should look at

Example of what to catch: a defect that exists in both a load path and a save path, where the load path is documented in BUG-1 and the save path in BUG-4, but the load path for one specific configuration isn't covered by either.

---

## Document Updates

When new evidence changes the understanding of a bug:

- **Update the document directly** to reflect current understanding
- Do not add "Corrections From Original Analysis" tables or "this was revised" annotations
- Git history tracks what changed and when — the document always reflects the latest understanding
- If a severity rating changes, update the rating and justification. Don't keep the old rating visible.

---

## Writing Principles

### Language and tone

1. **Use neutral, precise language.** Bug reports describe defective behavior — they are not editorials. Avoid informal, judgmental, or emotionally loaded words. The tone should be that of a clinical report: factual, measured, and professional.

    | Avoid                            | Use instead                                                            |
    | -------------------------------- | ---------------------------------------------------------------------- |
    | "garbage", "junk", "bogus"       | "invalid", "incorrect", "malformed"                                    |
    | "tricks", "fools", "lies to"     | "causes", "results in", "leads to"                                     |
    | "insidious", "nasty", "ugly"     | "silent" (if no warning), "difficult to detect"                        |
    | "explodes", "blows up"           | "throws an uncaught exception", "crashes"                              |
    | "fake" (as adjective for values) | "literal" (for hardcoded markers), "non-functional", "incorrect"       |
    | "wearing a costume", metaphors   | Describe the behavior directly                                         |
    | "breaks" (when vague)            | "fails", "produces incorrect results", "does not function as expected" |

    "Crashes" is acceptable when the code literally throws an uncaught exception. "Breaks" is acceptable when describing a specific pattern that stops working. The test is: would this word appear in a vendor support ticket? If not, rephrase.

### Audience and assumptions

2. **The reader has zero prior context.** No "the original analysis stated," no "corrected during the audit," no "as we discussed." Every concept must be introduced before it's used.

3. **Don't use technical jargon before defining it.** First use of any internal term must include a brief explanation. Introduce it in the section where the reader first needs it — not earlier, not later.

4. **Don't forward-reference unexplained concepts.** Don't write "see Background for what X means" in the opening. Either introduce it where you mention it, or don't mention it yet.

### Scope and accuracy

5. **Report the full scope of the defect.** If a bug exists in multiple code paths, all are first-class manifestations. Don't frame one as "the bug" and others as "equivalents" or footnotes.

6. **Don't claim knowledge about environments you haven't tested.** Say "the demo environment" not "production." Say "we have not verified other environments" not "not active in production."

7. **State what you don't know.** If you can see code-level triggers but don't know what admin setting controls them, say so. Don't present code observations as complete system knowledge.

8. **Don't call a bug "dormant" when it has a narrower active scope.** A bug affecting one field configuration on API-created records is _narrow_, not dormant.

9. **If two concepts are independent, say so explicitly.** Don't let the reader conflate orthogonal axes (e.g., a service-level flag vs a per-field flag).

10. **Verify scope boundaries before finalizing.** Check that every affected scenario is covered by this report or another. Don't leave gaps between bug reports.

### Evidence and claims

11. **Every claim should be backed or marked as unverified.** "Verified via automated testing" or "code-level observation — not verified in a live environment."

12. **When a bug has limited real-world impact, call that out.** If a save/reload cycle masks the defect for the most common scenario, state it. Don't overstate or understate severity.

13. **No internal process language.** No "corrections from original analysis," no "this was revised during the audit." State the finding directly — the reader doesn't care about your drafts.

### Structure and clarity

14. **"What Happens" is jargon-free.** Observable symptom only. No function names, no code paths, no internal flags.

15. **Conditions come before technical details.** The reader answers "does this affect me?" within the first four sections, before any code.

16. **Explain the full data flow for any value that "arrives."** If something enters a component, explain who put it there. Don't assume the reader knows which layer transforms what.

17. **Separate problem from solution.** Bug report = what's broken, when, why, evidence. Workarounds and fixes = companion document.

18. **Don't keep redundant sections after restructuring.** If content was integrated elsewhere, delete the old section.

19. **Declare the test environment in the Verification section.** Tools, environment URL, timezones, browsers — stated once, not assumed.

20. **Reference the supporting repository on first mention of automation.** The reader may receive the bug report standalone. The first time automated testing, spec files, or test artifacts are mentioned, include a note that a supporting repository with automation scripts, additional analysis, and raw data exists and can be requested.

21. **Avoid redundancy between sections.** "When This Applies" introduces concepts; "Background" adds detail — not the same detail. "Problem in Detail" explains the mechanism; "Technical Root Cause" is a code reference — not the same code block twice. If two sections say the same thing, one needs trimming.

---

## File Naming

| File                           | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `bug-N-short-description.md`   | Bug report (problem description, evidence, root cause)       |
| `bug-N-fix-recommendations.md` | Companion doc (workarounds, proposed fix, impact assessment) |

Both files live in the same `analysis/` directory. The `N` matches the bug ID number (e.g., `bug-1-timezone-stripping.md` for FORM-BUG-1).
