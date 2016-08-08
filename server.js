//DEPENDENCIES
const express = require('express');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const app = express();

var exphbs = require('express-handlebars');
var sequelize = require('sequelize');

var models = require('./models');

require('dotenv').config();

var winston = require('winston');
winston.add(winston.transports.File, { filename: 'error.log' });

var http = require('http').Server(app);
var io = require('socket.io')(http);

//OAUTH2
var oauth2 = require('simple-oauth2')({
	clientID: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
	site: 'https://github.com/login',
	tokenPath: '/oauth/access_token',
	authorizationPath: '/oauth/authorize'
});

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
	redirect_uri: 'http://coding-partners.herokuapp.com/callback',
	scope: 'notifications',
	state: '3(#0/!~'
});

// Initial page redirecting to Github
app.get('/auth', function (req, res) {
	res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
	var code = req.query.code;

	oauth2.authCode.getToken({
		code: code,
		redirect_uri: 'http://coding-partners.herokuapp.com/callback'
	}, saveToken);

	function saveToken(error, result) {
		if (error) { winston.log('Access Token Error', error.message); }
		winston.log(JSON.stringify(result));
		token = oauth2.accessToken.create(result);
		winston.log(JSON.stringify(token));
	}
});

app.get('/', function (req, res) {
	res.send('Hello<br><a href="/auth">Log in with Github</a>');
});

//serve up public folder and all content as static files to server.
app.use(express.static('public'));
//use bodyParser, do not encode url
app.use(bodyParser.urlencoded({
  extended: false
}));
// override with POST having ?_method=DELETE
app.use(methodOverride('_method'));
//use handlebars engine as template engine, use 'main' as our base file
app.engine('handlebars', exphbs({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

//link to main controller, set as default page"/"
var routes = require('./controllers/main_controller.js');
app.use('/', routes);

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

//listen on port, if undefined, use 3000

http.listen(process.env.PORT || 3000,function(){
	process.env.PORT == undefined? console.log("App listening on PORT 3000"):console.log("App listening on PORT" + process.env.PORT);
});

