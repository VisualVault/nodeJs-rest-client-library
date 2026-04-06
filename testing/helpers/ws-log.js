// Log shim for running web-services scripts outside the server tree.
// The server harness does `require('../log')` — this proxies to the real logger in the server lib.
// Moved from tasks/date-handling/log.js during file reorganization.
module.exports = require('../../lib/VVRestApi/VVRestApiNodeJs/log');
