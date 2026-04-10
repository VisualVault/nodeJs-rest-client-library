# Date Handling Across VV Products — Analysis and Recommendation

**Audience:** VV leadership — engineering, product, and management

---

## Part 1: The Problem

A date-handling investigation across the VV platform and the new Licensing system found **16 confirmed bugs and 17 inconsistencies** in how dates are stored and displayed. The majority trace to a single root cause: both systems partially distinguish between date types (date-only vs. date-and-time) at the configuration and database level, but this distinction is not consistently enforced in the application code.

Some of these issues are visible today regardless of where users are located:

- A time value that shifts every time a script reads and writes it back
- A form, a dashboard, and an API response showing different values for the same record
- A date entered in non-US format (DD/MM/YYYY) silently stored as the wrong date or discarded

Others surface as usage expands:

- Users working remotely or traveling across timezones
- Integrations with systems hosted in other timezones or cloud regions
- Customers operating across states with multiple timezones (e.g., Florida, Indiana, Texas), or at the national level
- The Licensing system growing to serve organizations across multiple states

The Licensing system, despite being built from scratch with correct database column types, already has inconsistent date handling across pages — the right foundation is there, but without a shared standard each developer handles dates independently.

This document recommends a shared standard for how dates should work across VV products. Detailed bug analysis and per-component test results are available on request.

---

## Part 2: Date Types — From Diagnosis to Implementation

The investigation identified four distinct date types that any business application needs to handle. Each type has different rules for storage, display, and comparison. The confirmed bugs trace to cases where the system applies one type's rules to a value that belongs to another.

|  #  | Type                  | Example                           | Core Rule                                                       |
| :-: | :-------------------- | :-------------------------------- | :-------------------------------------------------------------- |
|  1  | **Calendar Date**     | License expiration, date of birth | Same date everywhere — no time, no timezone                     |
|  2  | **Instant**           | Audit trail, record creation time | One moment in universal time — converts to viewer's local clock |
|  3  | **Pinned DateTime**   | "Inspection at 2:30 PM Pacific"   | One clock reading in one timezone — same for everyone           |
|  4  | **Floating DateTime** | "Take medication at 8 AM"         | Same clock reading, viewer's own timezone                       |

These four types are the standard classification used across the software industry (ISO 8601, Java, Python, and iCalendar all make the same distinctions [1]).

**For implementation, four separate systems are not needed.** Most VV customers operate from a single timezone. In that context, types 2, 3, and 4 produce identical results — a time value displayed as-is to all users. This means they can be grouped into **two implementation behaviors**:

### Behavior 1: Calendar Date

**What it is:** A day on a calendar. No time, no timezone.

**Examples:** Date of Birth, License Expiration, Application Received Date, Permit Effective Date, Renewal Deadline, holiday dates.

**The rule:** March 15 is March 15 everywhere in the world. The system stores it as a date and displays it without any timezone conversion.

**What goes wrong without this behavior:** The system internally adds a midnight time (e.g., "March 15 at 00:00"). When processed through timezone conversion logic, the date can shift to the previous or next day.

**How common is this?** In WADNR, 122 of 137 date fields (89%) are calendar dates. In the Licensing system, effective dates and expiration dates are this type. This is the most common date type across VV products.

### Behavior 2: Business DateTime

**What it is:** A specific date and time, meaningful in the context of the business operation. Everyone in the organization sees the same clock reading.

**Examples:** Inspection time, appointment time, communication date, scheduled events, record created/modified time.

**The rule:** "The inspection was at 2:30 PM at the ranger station." This is anchored to the project's timezone. All users see the same time. The same applies to system-generated timestamps — when a record was created or modified, the organization cares about what time it was _in their timezone_.

---

## Part 3: This Distinction Is Already in the Standards

The separation between calendar dates and timestamps isn't a technical preference. It's embedded in federal regulations, international standards, and legal definitions that govern how government systems must handle dates.

### ISO 8601: The International Date Standard

ISO 8601 [1] — adopted by the US government as FIPS PUB 4-2 — explicitly defines **two distinct representations**:

- **Calendar date:** "March 15, 2026" — a date with no time and no timezone.
- **Date and time:** "March 15, 2026 at 2:30 PM Pacific" — a timestamp with time and timezone information.

These are not two formats for the same thing. They are two representations for fundamentally different concepts.

### Two Regulatory Requirements That Pull in Opposite Directions

Federal standards and state law place two requirements on date values in government systems — and they contradict each other if you try to satisfy both with a single approach:

**Audit timestamps must include timezone context.** NIST SP 800-53 (the federal security and privacy control framework, mandatory under FISMA [3]) requires [2]:

> _"Record time stamps for audit records that [...] use Coordinated Universal Time, have a fixed local time offset from Coordinated Universal Time, or that include the local time offset as part of the time stamp."_
> — NIST SP 800-53 Rev. 5, Control AU-8

For audit trail entries — record created, modified, submitted — the system **must** preserve timezone information so the exact moment can be determined. A timestamp pinned to the project timezone satisfies this as long as the project timezone is known and stored. Stripping timezone context from a timestamp violates this requirement.

**License expiration dates must NOT have timezone context.** Across US jurisdictions, license expiration dates are defined as calendar dates — a day on a calendar, not a moment in time [5]:

- A license is valid through 11:59:59 PM on its expiration date and becomes expired at 12:00 AM the following day. The expiration is a property of the **date**, not of a specific moment.
- Washington State hunting and fishing licenses follow an April 1 – March 31 license year (RCW 77.32) [6]. Forest Practices Applications have review periods measured in **calendar days** [7].
- Texas, when a specific time matters, explicitly states: "before midnight Central Time on the license expiration date" [8]. The need to specify the timezone proves that without such specification, the date alone is the legal boundary.

When WADNR issues a permit that "expires December 31, 2026," that is a legal statement about a calendar date. Adding timezone context to this value is what causes it to shift — turning December 31 into December 30 or January 1 depending on the timezone. For most users today the date displays correctly, but the error is latent in the code path.

**The contrast:** Audit timestamps are _damaged by removing_ timezone information. Calendar dates are _damaged by adding_ timezone information. A single approach that either applies timezone logic to everything or strips it from everything will violate one of these two requirements. This is why two behaviors — not one — are the minimum.

### Vital Records Separate Date From Time

The US Standard Certificate of Live Birth records **date of birth** and **time of birth** as separate fields [9]. The government treats these as fundamentally different: date of birth is a calendar date used for identity and license eligibility; time of birth is a timestamp for medical records.

### What This Means

These standards consistently draw the same line: calendar dates and timestamps require different handling. A single-behavior approach can work for datetime values (pinning to a known project timezone satisfies traceability requirements), but it cannot correctly handle calendar dates — because applying timezone logic to a date that has no time component is what creates the errors documented in this investigation.

---

## Part 4: The Options

### Option A: One Behavior for Everything

Treat all date values the same way — pin everything to the project timezone.

| Pro                             | Con                                                                                                   |
| :------------------------------ | :---------------------------------------------------------------------------------------------------- |
| Simplest mental model           | Calendar dates (birthdays, expirations) can show the wrong day when accessed from different timezones |
| Easiest to explain to customers | Doesn't build on the distinction that both systems already make at the database level                 |

Even with this approach, the code still needs to handle date-only fields differently — a birthday stored as "March 15 at midnight" can shift when processed through timezone logic. The only way to prevent that is to not apply timezone logic to date-only fields, which means you already have two behaviors without naming them.

### Option B: Two Behaviors (Recommended)

Distinguish between **calendar dates** (no timezone logic) and **business datetimes** (pinned to project timezone).

| Pro                                                                                                   | Con                                                                                     |
| :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| Eliminates the wrong-day issue for date-only fields                                                   | Two behaviors to document and maintain                                                  |
| Builds on the distinction both systems already make at the database level                             | If a customer later needs multi-timezone audit trails, an upgrade to Option C is needed |
| Simple to explain: "Dates show the same date everywhere. Times show in your organization's timezone." |                                                                                         |
| Prevents this class of issues from recurring in new products                                          |                                                                                         |

**This approach addresses the identified issues while keeping complexity low.**

### Option C: Three Behaviors (Future Enhancement)

Same as Option B, but system-generated timestamps (record created, modified, submission time) are stored as universal time and displayed in each user's local timezone.

| Pro                                                                       | Con                                                                         |
| :------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| Audit trails work correctly when users span multiple timezones            | Not needed if all users share a timezone (true for most VV customers today) |
| Industry standard for enterprise platforms (Salesforce, ServiceNow, Jira) | System timestamps showing different local times could confuse some users    |

Worth considering later if VV serves customers with teams distributed across timezones, or if compliance requirements demand universal-time audit trails. It's an additive change on top of Option B.

### Comparison

| Aspect               | Option A                                           | Option B                                           | Option C                                       |
| :------------------- | :------------------------------------------------- | :------------------------------------------------- | :--------------------------------------------- |
| Calendar dates       | Can show wrong day                                 | Correct everywhere                                 | Correct everywhere                             |
| Date-and-time values | Correct (pinned)                                   | Correct (pinned)                                   | User-entered: pinned. System: universal.       |
| Developer complexity | Looks simple, hides a required exception           | Two explicit rules                                 | Three explicit rules                           |
| Customer explanation | "Everything is in your timezone" (with exceptions) | "Dates stay the same. Times are in your timezone." | Same, plus: "System timestamps adjust to you." |

---

## Part 5: Recommendation

### I recommend Option B as the immediate standard, with a path to Option C.

**The two rules:**

1. **Date-only values are never processed as timestamps.** They are stored, transmitted, and displayed as date strings — no timezone conversion, no time component.

2. **Date-and-time values are pinned to the project timezone.** They are stored with the project timezone as reference and displayed as-is to all users.

### Why Option B

- It addresses the most impactful issues, including the wrong-day problem affecting 89% of WADNR's date fields
- It builds on the database design that both systems already use
- It's two sentences that any developer can follow
- Option C can be adopted later if multi-timezone customers or compliance requirements demand it — an additive change, not a rewrite

### What This Means in Practice

| For                        | What changes                                                                                                                                                                      |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product/Design**         | Date-only fields and date-time fields are formally recognized as different. Template and field configuration should enforce the distinction.                                      |
| **Engineering**            | Date-only fields stop going through timezone conversion logic. Date-time fields are anchored to the project timezone. A shared convention replaces individual developer judgment. |
| **QA**                     | Date fields are tested in at least two timezones — not just the server's.                                                                                                         |
| **Customer communication** | "Dates show the same date everywhere. Times show in your organization's timezone."                                                                                                |

### What Doesn't Change

- No database schema changes are expected. Both systems already distinguish date-only from datetime at the database level. The foundation is in place.
- This is primarily about consistent enforcement of rules that the systems already partially implement — not about adding new capabilities.
- The project timezone approach for date-and-time fields is correct and remains unchanged. This recommendation adds explicit handling for date-only fields.

### Next Step

I am looking for alignment on Option B as the shared standard across both products. Once aligned, engineering can begin defining the implementation plan for each system.

---

## References

[1] International Organization for Standardization, _Date and time — Representations for information interchange — Part 1: Basic rules_, ISO 8601-1:2019, 2019. [Online]. Available: https://www.iso.org/iso-8601-date-and-time-format.html

[2] National Institute of Standards and Technology, "AU-8: Time Stamps," in _Security and Privacy Controls for Information Systems and Organizations_, NIST SP 800-53 Rev. 5, Sep. 2020, pp. 80–81. [Online]. Available: https://csf.tools/reference/nist-sp-800-53/r5/au/au-8/

[3] National Institute of Standards and Technology, _Security and Privacy Controls for Information Systems and Organizations_, NIST SP 800-53 Rev. 5.1.1, Dec. 2024. [Online]. Available: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final

[5] LegalClarity, "Can You Use Your License on the Day It Expires?," _LegalClarity.org_, 2024. [Online]. Available: https://legalclarity.org/can-you-use-your-license-on-the-day-it-expires/

[6] Washington State Legislature, "Licenses," Revised Code of Washington § 77.32, 2024. [Online]. Available: https://app.leg.wa.gov/rcw/default.aspx?cite=77.32

[7] Washington Department of Natural Resources, "Forest Practices Application," _dnr.wa.gov_, 2024. [Online]. Available: https://dnr.wa.gov/forest-regulation/forest-practices-application

[8] Texas Department of Insurance, "My license expires today or in less than 30 days," _tdi.texas.gov_, 2024. [Online]. Available: https://www.tdi.texas.gov/agent/renew-agent/expires-in-less-than-30-days.html

[9] US Birth Certificates, "What Information Is on a Birth Certificate?," _usbirthcertificates.com_, 2024. [Online]. Available: https://www.usbirthcertificates.com/articles/what-information-is-on-a-birth-certificate
