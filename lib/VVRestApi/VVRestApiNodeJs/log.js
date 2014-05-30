var winston = require('winston');

//see https://github.com/flatiron/winston for other logging transport options

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'debugger.log' })
    ]
});

module.exports = logger;