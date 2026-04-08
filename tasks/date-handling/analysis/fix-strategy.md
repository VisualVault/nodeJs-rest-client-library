# VisualVault Date Handling — Fix Strategy

> Companion to [Root Cause Analysis](temporal-models.md). Read the RCA first for context on the four temporal models, the 14 confirmed bugs, and the architectural limitations.

---

## Categories of Change

| Category              | What Must Change Across All Layers                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Calendar Date**     | Date-only strings must never enter `Date` / `moment()`. Parse → validate → store as `YYYY-MM-DD` string. Return as string. Every layer must treat these as calendar positions, not timestamps.         |
| **Instant**           | Approximately correct today. Fix empty-field error, ensure the save path preserves the UTC marker. Every layer must consistently treat these as UTC instants.                                          |
| **Pinned DateTime**   | Fix the incorrect UTC marker on local times (use a real timezone token or omit it entirely). Store anchor timezone as field metadata. Every layer must know the anchor and never apply UTC conversion. |
| **Floating DateTime** | If needed: ensure naive datetime is never tagged with Z or any offset. Every layer must accept that cross-timezone comparison is undefined.                                                            |

> ### Design Decision Required
>
> Does VV need to distinguish Pinned from Floating DateTime? If all `ignoreTZ=true` use cases are Pinned (likely for enterprise document management), then storing the server timezone as the implicit anchor may be sufficient. If Floating use cases exist, they need a separate flag or field property. **This decision determines whether the fix is a targeted cross-layer effort or a broader schema extension.**

---

## Traps to Avoid

| Approach                                            | Why it fails                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| "Convert everything to UTC"                         | Destroys Pinned/Floating. A local 15:30 in São Paulo is not 18:30 UTC — converting loses wall-clock meaning. |
| "Add Z to everything"                               | Forces all values into Instant. This is the anti-pattern that causes the highest-severity bug.               |
| "Normalize date-only to midnight UTC"               | Still TZ-dependent. Midnight UTC is the previous day in UTC+. Date-only values should never have a time.     |
| "Store the offset (-03:00) as metadata"             | Offsets change with DST. Store the timezone _name_ (`America/Sao_Paulo`), not the offset.                    |
| "Use `Date.parse()` for server parsing"             | Parsing is implementation-dependent and locale-sensitive. Use explicit format-aware parsing.                 |
| "Treat `ignoreTimezone` as 'no TZ handling needed'" | The opposite — it means the timezone IS the value's identity. Requires _more_ metadata, not less.            |
| "Compare dates from different configs in queries"   | A UTC instant and a local time in the same column cannot be meaningfully compared.                           |
