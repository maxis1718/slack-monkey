var express = require('express');
var bodyParser = require('body-parser');
var beauty = require('./lib/beauty');

var app = express();
var port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) { res.status(200).send('Hello world!') });

app.post('/beauty', beauty);

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(400).send(err.message);
});
 
app.listen(port, function () {
  console.log('Slack bot listening on port ' + port);
});

