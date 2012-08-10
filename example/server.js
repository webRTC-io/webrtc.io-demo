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
  console.log('connection');

  rtc.on('send answer', function() {
    //answer sent
    console.log('send answer');
  });

  rtc.on('disconnect', function() {
    console.log('disconnect');
  });

  rtc.on('chat_msg', function(data, socket) {
    var roomList = rtc.rooms[data.room] || [];
    console.log(roomList);

    for (var i = 0; i<roomList.length; i++) {
      
      var socketId = roomList[i];

      console.log(socketId);

      if (socketId == socket.id) {
        continue;
      }
      else {
        var soc = rtc.getSocket(data.room, socketId);

        if (soc) {
          console.log('chat_msg send');
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
});