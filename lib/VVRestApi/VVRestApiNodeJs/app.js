
var logger = require('./log');

var message = "Web site starting";
logger.info(message);

var routeAlias = 'vvnodeserver';

var express = require('express'),
    scriptController = require('./routes/scripts'),
    scheduleController = require('./routes/scheduledscripts'),
    http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path');

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('httpsPort', process.env.PORT || 3001);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(allowCors);
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(errorHandler);
});

//express error handler
function errorHandler (err, req, res, next) {
  
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

app.configure('development', function () {
    app.use(express.errorHandler());
});

//with IISNode
app.get('/' + routeAlias, scriptController.testsite);
app.get('/node/' + routeAlias, scriptController.testsite);

//without IISNode (remove the virtual directory name)
app.get('/', scriptController.testsite);
app.get('/node/', scriptController.testsite);


//with IISNode
app.get('/' + routeAlias + '/app.js', scriptController.testsite);
app.get('/node/' + routeAlias + '/app.js', scriptController.testsite);

//without IISNode (remove the virtual directory name)
app.get('/app.js', scriptController.testsite);
app.get('/node/app.js', scriptController.testsite);


//with IISNode
app.post('/' + routeAlias + '/scripts', scriptController.scripts);
app.post('/node/' + routeAlias + '/scripts', scriptController.scripts);

//without IISNode (remove the virtual directory name)
app.post('/scripts', scriptController.scripts);
app.post('/node/scripts', scriptController.scripts);


//with IISNode
app.get('/' + routeAlias + '/scripts', scriptController.scripts);
app.get('/node/' + routeAlias + '/scripts', scriptController.scripts);

//without IISNode (remove the virtual directory name)
app.get('/scripts', scriptController.scripts);
app.get('/node/scripts', scriptController.scripts);


//with IISNode
app.post('/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.post('/node/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);

//without IISNode (remove the virtual directory name)
app.post('/scheduledscripts', scheduleController.processRequest);
app.post('/node/scheduledscripts', scheduleController.processRequest);


//with IISNode
app.get('/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.get('/node/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);

//added two routes
//without IISNode (remove the virtual directory name)
app.get('/scheduledscripts', scheduleController.processRequest);
app.get('/node/scheduledscripts', scheduleController.processRequest);


http.createServer(app).listen(app.get('port'), function () {
    logger.info("Express server listening on port " + app.get('port'));
    console.log("Express server listening on port " + app.get('port'));
});

// https.createServer(httpsOptions, app).listen(app.get('httpsPort'), function () {
//     logger.info("Express server listening on port " + app.get('httpsPort'));
// });

