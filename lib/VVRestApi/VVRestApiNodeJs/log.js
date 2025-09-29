var winston = require('winston');

var os = require("os");
var infoLogStreamName = 'nodejs-' + os.hostname().toLowerCase() + '-info';
var errorLogStreamName = 'nodejs-' + os.hostname().toLowerCase() + '-error';

const tsFormat = () => (new Date()).toUTCString();

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ timestamp: tsFormat }),
        new (winston.transports.File)({ timestamp: tsFormat, filename: infoLogStreamName + '.log' })     
    ]
});


module.exports = logger;



