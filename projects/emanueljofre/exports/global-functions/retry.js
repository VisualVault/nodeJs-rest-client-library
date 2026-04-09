/**
 * VV.Form.Global.retry
 * Parameters: 1
 * Extracted: 2026-04-09
 */
function (fn, maxAttempts = 3) {
return (async () => {

/* ------------------------- RETRY HELPER FUNCTIONS ------------------------- */

  function isRetryableError(error) {
    if (error.status !== undefined) {
      // Server errors (5xx) - server might recover
      if (error.status >= 500 && error.status < 600) return true;
      // Rate limited - retry after backoff
      if (error.status === 429) return true;

      return false;
    }

    // Network errors. All TypeErrors from fetch are network-related
    if (error.name === 'TypeError') {
      return true;
    }

    return false;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ------------------------------- RETRY MAIN ------------------------------- */

  let attempt = 0;
  const baseDelay = 500;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      if (attempt >= maxAttempts) {
        return error;
      }

      if (isRetryableError(error)) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * delay;
        await sleep(jitter);
      } else {
        return error; // 4xx errors return immediately
      }
    }
  }
})();
}
