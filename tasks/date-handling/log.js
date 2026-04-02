// Log shim for running web-services scripts outside the server tree.
// The harness does `require('../log')` — when run from tasks/date-handling/web-services/,
// that resolves here. Proxies to the real logger in the server lib.
module.exports = require('../../lib/VVRestApi/VVRestApiNodeJs/log');
