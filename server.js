var app = require('express').createServer();
var io = require('./webrtc.io').listen(app);

var colors = {};

app.listen(80);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/example/index.html');
});

app.get('/style.css', function (req, res) {
  res.sendfile(__dirname + '/example/style.css');
});

app.get('/io.js', function (req, res) {
  res.sendfile(__dirname + '/lib/io.js');
});

io.sockets.on('connection', function(socket) {
  console.log("connection received");

  colors[socket.id] = Math.floor(Math.random()* 0xFFFFFF)
  socket.on('chat msg', function(msg) {
    console.log("chat received");
    
    socket.broadcast.emit('receive chat msg', {
      msg: msg,
      color: colors[socket.id]
    });
  });
});