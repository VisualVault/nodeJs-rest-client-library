var winston = require('winston');
var CloudWatchTransport = require('winston-cloudwatch');

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

logger.add(CloudWatchTransport, {
  logGroupName: 'nodejs-logs',  
  logStreamName: infoLogStreamName,
    awsRegion: 'us-east-1',
    formatLog: function (item) {
        return item.level + ' - ' + item.message + ' - ' + JSON.stringify(item.meta)
    }
});

module.exports = logger;



