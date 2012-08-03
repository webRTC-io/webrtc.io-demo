var app = require('express').createServer();
var io = require('webrtc.io').listen(app);

var colors = {};
var servers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];



//When connectiong to nodejitsu
//app.listen(80);

//When using localhost
app.listen(8000);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/style.css', function (req, res) {
  res.sendfile(__dirname + '/style.css');
});

function selectRoom(socket) {
    for (var room in servers) {
        console.log('***' + room);
        if (io.sockets.clients(room).length < 4){
            socket.emit('send', room);
        }
        console.log(io.sockets.clients('' + room));
    }
}
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
