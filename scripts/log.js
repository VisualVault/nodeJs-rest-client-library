// Log shim — examples/ harness scripts do require('../log').
// On the VV server this resolves to the real logger; locally, this shim proxies to it.
module.exports = require('../lib/VVRestApi/VVRestApiNodeJs/log');
