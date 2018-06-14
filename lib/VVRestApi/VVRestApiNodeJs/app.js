
var logger = require('./log');

var message = "Web site starting";
logger.info(message);

//If using a Virtual Directory name, set routeAlias
//For example, https://myserver:3000/vvnodeserver
//If virtual directory is not present in the URL it will be ignored
var routeAlias = 'vvnodeserver';

var express = require('express'),
    scriptController = require('./routes/scripts'),
    scheduleController = require('./routes/scheduledscripts'),
    testScheduledScriptsController = require('./routes/testScheduledScripts'),
    http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    bodyParser = require('body-parser'),
    favicon = require('serve-favicon'),
    expressErrorHandler = require('express-error-handler');

var app = express();


app.set('port', process.env.PORT || 3000);
app.set('httpsPort', process.env.PORT || 3001);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(allowCors);
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser());
//app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(errorHandler);


//express error handler
function errorHandler(err, req, res, next) {

    //if http headers sent do not attempt to send a response
    //next(err) will pass the error to default express error handler
    if (res.headersSent) {
        return next(err);
    }

    logger.error(err.stack);
    res.status(500);
    res.render('error', { error: err });
}

// Add CORS headers
function allowCors(req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    if (req.method === "OPTIONS") {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        console.log("OPTIONS Requested");
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }

    // Pass to next layer of middleware
    next();
}


//HTTP GET: /
app.get('/' + routeAlias, scriptController.testsite);
app.get('/node/' + routeAlias, scriptController.testsite);
app.get('/', scriptController.testsite);
app.get('/node/', scriptController.testsite);

//HTTP GET: /app.js
app.get('/' + routeAlias + '/app.js', scriptController.testsite);
app.get('/node/' + routeAlias + '/app.js', scriptController.testsite);
app.get('/app.js', scriptController.testsite);
app.get('/node/app.js', scriptController.testsite);

//HTTP POST: /scripts
//HTTP POST: /node/scripts
app.post('/' + routeAlias + '/scripts', scriptController.scripts);
app.post('/node/' + routeAlias + '/scripts', scriptController.scripts);
app.post('/scripts', scriptController.scripts);
app.post('/node/scripts', scriptController.scripts);

//HTTP GET: /scripts
//HTTP GET: /node/scripts
app.get('/' + routeAlias + '/scripts', scriptController.scripts);
app.get('/node/' + routeAlias + '/scripts', scriptController.scripts);
app.get('/scripts', scriptController.scripts);
app.get('/node/scripts', scriptController.scripts);

//HTTP POST: /scheduledscripts
//HTTP POST: /node/scheduledscripts
app.post('/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.post('/node/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.post('/scheduledscripts', scheduleController.processRequest);
app.post('/node/scheduledscripts', scheduleController.processRequest);

//HTTP GET: /scheduledscripts
//HTTP GET: /node/scheduledscripts
app.get('/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.get('/node/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.get('/scheduledscripts', scheduleController.processRequest);
app.get('/node/scheduledscripts', scheduleController.processRequest);

//HTTP GET: /testscripts/scheduled/:name
//HTTP GET: /node/testscripts/scheduled/:name
app.get('/' + routeAlias + '/testscripts/scheduled/:name', testScheduledScriptsController.processRequest);
app.get('/node/' + routeAlias + '/testscripts/scheduled/:name', testScheduledScriptsController.processRequest);
app.get('/testscripts/scheduled/:name', testScheduledScriptsController.processRequest);
app.get('/node/testscripts/scheduled/:name', testScheduledScriptsController.processRequest);

//Start listening on configured port
http.createServer(app).listen(app.get('port'), function () {
    logger.info("Express server listening on port " + app.get('port'));
    console.log("Express server listening on port " + app.get('port'));
});
