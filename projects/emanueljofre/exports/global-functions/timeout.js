/**
 * VV.Form.Global.timeout
 * Parameters: 2
 * Extracted: 2026-04-09
 */
function (promise, ms) {

  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ]);


}
