var app = require('express').createServer();
var webRTC = require('webrtc.io').listen(8001);

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


webRTC.rtc.on('connect', function(rtc) {
  //Client connected
  console.log('connect');
});

webRTC.rtc.on('send answer', function(rtc) {
  //answer sent
  console.log('send answer');
});

webRTC.rtc.on('disconnect', function(rtc) {
  console.log('disconnect');
});

webRTC.rtc.on('chat_msg', function(data, socket) {
  var roomList = webRTC.rtc.rooms[data.room] || [];

  for (var i = 0; i < roomList.length; i++) {
    var socketId = roomList[i];

    if (socketId !== socket.id) {
      var soc = webRTC.rtc.getSocket(data.room, socketId);

      if (soc) {
        soc.send(JSON.stringify({
          "eventName": "receive_chat_msg",
          "messages": data.messages,
          "color": data.color
        }), function(error) {
          if (error) {
            console.log(error);
          }
        });
      }
    }
  }
});