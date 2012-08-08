var app = require('express').createServer();
var webRTC = require('webrtc.io').listen(8001);

var colors = {};


//When connectiong to nodejitsu
//app.listen(80);
//When using localhost
app.listen(8000);

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res) {
  res.sendfile(__dirname + '/style.css');
});

app.get('/webrtc.io.js', function(req, res) {
  res.sendfile(__dirname + '/webrtc.io.js');
});


webRTC.rtc.on('connection', function(rtc) {
  //Client connected
  console.log('connection');

  rtc.on('send_answer', function() {
    //answer sent
    console.log('send_answer');
  });

  rtc.on('disconnect', function() {
    console.log('disconnect');
  });
});
