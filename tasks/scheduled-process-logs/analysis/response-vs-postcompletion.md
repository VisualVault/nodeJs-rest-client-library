# Scheduled Process Execution: response.json() vs postCompletion()

## Summary

Every scheduled process script communicates back to VV through two independent mechanisms:

|                     | `response.json()`                             | `postCompletion()`                              |
| ------------------- | --------------------------------------------- | ----------------------------------------------- |
| **What it is**      | The HTTP response back to VV                  | A separate API call from the Node server to VV  |
| **What VV records** | "Message" column in the Scheduled Service Log | "Result" flag (True/False) in the log           |
| **When to call**    | Before VV's HTTP timeout expires              | After all work completes (in a `finally` block) |
| **If skipped**      | VV times out and records an error             | Result flag is never set                        |

These are completely separate channels. Neither replaces the other.

---

## Execution flow

```
1. VV sends HTTP POST to the Node server with the script code + a scheduledProcessGUID
2. Node server authenticates, loads the script, calls main(vvClient, response, token)
3. Script calls response.json()  →  HTTP connection closes, VV logs the message
4. Script continues running asynchronously
5. Script calls postCompletion(token)  →  separate API call sets the Result flag
```

After step 3, VV is no longer connected to the Node server. Steps 4 and 5 happen independently.

---

## Scheduled Service Log

Accessed via the "View" link in `scheduleradmin`. Columns:

| Column             | Source                                                          |
| ------------------ | --------------------------------------------------------------- |
| Scheduled Run Date | When VV planned the run                                         |
| Actual Run Date    | When execution started                                          |
| Completion Date    | When VV received the HTTP response                              |
| **Result**         | Set by `postCompletion()` — True or False                       |
| **Message**        | Set by `response.json()` — the string sent in the HTTP response |

The message parameter of `postCompletion()` (its 4th argument) is **not displayed anywhere in the UI**. Only `response.json()` controls the visible message.

---

## Completion Callback setting

Each microservice in `outsideprocessadmin` has a "Enable completion callback" checkbox with a configurable timeout.

| Callback setting       | `postCompletion()` effect             | Recurrence advances when                                |
| ---------------------- | ------------------------------------- | ------------------------------------------------------- |
| **Disabled** (default) | Sets Result flag only                 | VV receives the HTTP response                           |
| **Enabled**            | Sets Result flag + signals completion | `postCompletion()` arrives, or callback timeout expires |

When disabled, skipping `postCompletion()` has no operational impact on the schedule — recurrence advances regardless. When enabled, skipping it causes VV to wait until the callback timeout expires before advancing.

**Implication**: with callback disabled and `response.json()` called at the start, VV considers the run "complete" before the script has done any work. If the script fails after that point, VV has already advanced the schedule and recorded a success message.

---

## Platform timeout

Each microservice has a **Timeout** field in `outsideprocessadmin` (under "Long Running Service Settings"). The field is in **seconds**. When set to `0`, VV uses the platform default.

| Timeout value | Behavior                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------- |
| `0` (default) | VV waits **between 3 and 5 minutes** (empirically tested: 180s succeeded, 300s timed out) |
| `10`          | VV waits 10 seconds (confirmed: 15s delay timed out, 5s delay succeeded)                  |

When VV times out:

- The script **continues running** on the Node server — VV cannot terminate it
- If the script later calls `postCompletion()`, VV still accepts and processes it

---

## Recommendations

1. **Use `response.json()` for the outcome message**, not just "Started." The log Message column is the only visible record of what happened — make it actionable (e.g., record counts, error summaries). For scripts that complete within the configured timeout, call it at the end with the real result.

    **Trade-off:** calling at the end blocks the scheduler queue for the full execution time. Calling at the start frees the queue but limits the log to a generic message — since `postCompletion()`'s message is not displayed in the UI, the only visible outcome is the True/False Result flag. Detailed results (record counts, errors) require an external logging strategy.

2. **Always call `postCompletion()` in a `finally` block.** Even with callback disabled, it sets the Result flag — the only way to distinguish success from failure in the log.

3. **Evaluate enabling Completion Callback** for critical schedules. With callback disabled, VV cannot distinguish "script started" from "script completed." Enabling it gates recurrence on actual completion.

4. **Set explicit Timeout values** (in seconds) on long-running microservices instead of relying on the platform default. For a script expected to take up to 60 seconds, set `Timeout=90` to allow headroom. For scripts where `response.json()` is called at the end, the timeout must exceed the total execution time — but keep in mind this blocks the scheduler queue for that duration.
