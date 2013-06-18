/* Copyright 2013 Auersoft */

var message = "Web site starting";
console.log(message);


var express = require('express')
    , scriptController = require('./routes/scripts')
    , scheduleController = require('./routes/scheduledscripts')
    , http = require('http')
    , path = require('path');

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});

app.get('/vvnodeserver', scriptController.testsite);
app.get('/node/vvnodeserver', scriptController.testsite);

app.get('/vvnodeserver/app.js', scriptController.testsite);
app.get('/node/vvnodeserver/app.js', scriptController.testsite);

app.post('/vvnodeserver/scripts', scriptController.scripts);
app.post('/node/vvnodeserver/scripts', scriptController.scripts);

app.get('/vvnodeserver/scripts', scriptController.scripts);
app.get('/node/vvnodeserver/scripts', scriptController.scripts);

app.post('/vvnodeserver/scheduledscripts', scheduleController.processRequest);
app.post('/node/vvnodeserver/scheduledscripts', scheduleController.processRequest);

app.get('/vvnodeserver/scheduledscripts', scheduleController.processRequest);
app.get('/node/vvnodeserver/scheduledscripts', scheduleController.processRequest);


http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});

