var express = require('express');
var hellobot = require('./hellobot');
var pttBeauty = require('./pttBeauty');
 
var app = express();
var port = process.env.PORT || 3000;
 
app.get('/', function (req, res) { res.status(200).send('Hello world!') });
 
app.post('/hello', hellobot);
app.post('/beauty', pttBeauty);

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(400).send(err.message);
});
 
app.listen(port, function () {
  console.log('Slack bot listening on port ' + port);
});

