/**
 * Guarded request wrappers for Playwright API calls.
 *
 * Wraps Playwright's request.put() / request.post() / request.delete() with
 * write-policy validation. Use these instead of raw request methods in test
 * specs that perform write operations.
 *
 * Read operations (request.get()) do not need a wrapper.
 */
const { assertApiWriteAllowed } = require('../fixtures/write-policy');

async function guardedPut(request, url, options) {
    assertApiWriteAllowed('PUT', url, options?.data);
    return request.put(url, options);
}

async function guardedPost(request, url, options) {
    assertApiWriteAllowed('POST', url, options?.data);
    return request.post(url, options);
}

async function guardedDelete(request, url, options) {
    assertApiWriteAllowed('DELETE', url);
    return request.delete(url, options);
}

module.exports = { guardedPut, guardedPost, guardedDelete };
