


var message = "Web site starting";
console.log(message);

var routeAlias = 'vvnodeserver';

var express = require('express'),
    scriptController = require('./routes/scripts'),
    scheduleController = require('./routes/scheduledscripts'),
    http = require('http'),
    path = require('path');

var app = express();


app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
//app.use(express.logger('dev'));

var bodyParser = require('body-parser');
app.use(bodyParser());

//app.use(express.bodyParser());
//app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

//app.use(express.errorHandler());

app.get('/' + routeAlias, scriptController.testsite);
app.get('/node/' + routeAlias, scriptController.testsite);

app.get('/' + routeAlias + '/app.js', scriptController.testsite);
app.get('/node/' + routeAlias + '/app.js', scriptController.testsite);

app.post('/' + routeAlias + '/scripts', scriptController.scripts);
app.post('/node/' + routeAlias + '/scripts', scriptController.scripts);

app.get('/' + routeAlias + '/scripts', scriptController.scripts);
app.get('/node/' + routeAlias + '/scripts', scriptController.scripts);

app.post('/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.post('/node/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);

app.get('/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);
app.get('/node/' + routeAlias + '/scheduledscripts', scheduleController.processRequest);

http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});

