(function() {

var rtc = this.rtc = {};

// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00;
var URL = window.URL || window.webkitURL || window.msURL || window.oURL;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                   navigator.mozGetUserMedia || navigator.msGetUserMedia;

// Holds a connection to the server.
rtc._socket = null;

// Holds callbacks for certain events.
rtc._events = {};

// Holds the STUN server to use for PeerConnections.
rtc.SERVER = "STUN stun.l.google.com:19302";

// Reference to the lone PeerConnection instance.
rtc.peerConnections = {};

// Array of known peer socket ids
rtc.connections = [];
// Stream-related variables.
rtc.streams = [];
rtc.numStreams = 0;
rtc.initializedStreams = 0;

/**
 * Connects to the socket.io server.
 */
rtc.connect = function(server, room) {
  room = room || ''; // by default, join a room called the blank string
  rtc._socket = io.connect(server);
  rtc._socket.on('connect', function() {
    rtc._socket.emit('join room', room);
    rtc.fire('connect');
  });

  // TODO: Fix possible race condition if get peers is not emitted
  // before the "ready" event is fired.
  rtc._socket.on('get peers', function(data) {
    var peers = data.connections;
    rtc.connections = peers;

    // fire connections event and pass peers
    rtc.fire('connections', peers);
  });

  rtc._socket.on('receive ice candidate', function(data) {
    var candidate = new IceCandidate(data.label, data.candidate);
    rtc.peerConnections[data.socketId].processIceMessage(candidate);
    rtc.fire('receive ice candidate', candidate);
  });
  rtc._socket.on('new peer connected', function(data) {
    var pc = rtc.createPeerConnection(data.socketId);
    for (var i = 0; i < rtc.streams.length; i++) {
      var stream = rtc.streams[i];
      pc.addStream(stream);
    }
  });
  rtc._socket.on('remove peer connected', function(data) {
    console.log(data);
    //the actual onremovestream function is not yet supported. Here is a temporary workaround
    rtc.fire('disconnect stream', data.socketId);
    onClose(data.socketId);
    //rtc.peerConnections[data.socketId].close();
    delete rtc.peerConnections[data.socketId];
  });

  rtc._socket.on('receive offer', function(data) {
    rtc.receiveOffer(data.socketId, data.sdp);
    rtc.fire('receive offer', data);
  });

  rtc._socket.on('receive answer', function(data) {
    rtc.receiveAnswer(data.socketId, data.sdp);
    rtc.fire('receive answer', data);
  });
};

rtc.sendOffers = function() {
  for (var i = 0, len = rtc.connections.length; i < len; i++) {
    var socketId = rtc.connections[i];
    rtc.sendOffer(socketId);
  }
}

rtc.onClose = function(data) {
    rtc._socket.on('close stream', function() {
        rtc.fire('close stream', data);
    });
}

rtc.on = function(eventName, callback) {
  rtc._events[eventName] = rtc._events[eventName] || [];
  rtc._events[eventName].push(callback);
};

rtc.fire = function(eventName, _) {
  var events = rtc._events[eventName];
  var args   = Array.prototype.slice.call(arguments, 1);

  if (!events) {
    return;
  }

  for (var i = 0, len = events.length; i < len; i++) {
    events[i].apply(null, args);
  }
};
rtc.createPeerConnections = function() {
    for (var i = 0; i < rtc.connections.length; i++) {
        rtc.createPeerConnection(rtc.connections[i]);
    }
};

rtc.createPeerConnection = function(id) {
  var pc = rtc.peerConnections[id] = new PeerConnection(rtc.SERVER, function(candidate, moreToFollow) {
    if (candidate) {
      rtc._socket.emit('receive ice candidate', {
        label: candidate.label,
        candidate: candidate.toSdp(),
        socketId: id
      });
    }
    rtc.fire('ice candidate', candidate, moreToFollow);
  });

  pc.onopen = function() {
    // TODO: Finalize this API
    rtc.fire('peer connection opened');
  };

  pc.onaddstream = function(event) {
    // TODO: Finalize this API
    rtc.fire('add remote stream', event.stream, id);
  };
  return pc;
};

rtc.sendOffer = function(socketId) {
  var pc = rtc.peerConnections[socketId];
  // TODO: Abstract away video: true, audio: true for offers
  var offer = pc.createOffer({ video: true, audio: true });
  pc.setLocalDescription(pc.SDP_OFFER, offer);
  rtc._socket.emit('send offer', { socketId: socketId, sdp: offer.toSdp() });
  pc.startIce();
};

rtc.receiveOffer = function(socketId, sdp) {
  var pc = rtc.peerConnections[socketId];
  pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(sdp));
  rtc.sendAnswer(socketId);
};

rtc.sendAnswer = function(socketId) {
  var pc = rtc.peerConnections[socketId];
  var offer = pc.remoteDescription;
  // TODO: Abstract away video: true, audio: true for answers
  var answer = pc.createAnswer(offer.toSdp(), {video: true, audio: true});
  pc.setLocalDescription(pc.SDP_ANSWER, answer);
  rtc._socket.emit('send answer', { socketId: socketId, sdp: answer.toSdp() });
  pc.startIce();
};

rtc.receiveAnswer = function(socketId, sdp) {
  var pc = rtc.peerConnections[socketId];
  pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(sdp));
};

rtc.createStream = function(domId, onSuccess, onFail) {
  var el = document.getElementById(domId);
  var options;
  onSuccess = onSuccess || function() {};
  onFail = onFail || function() {};

  if (el.tagName.toLowerCase() === "audio") {
    options = { audio: true };
  } else {
    options = { video: true, audio: true };
  }

  if (getUserMedia)  {  
    rtc.numStreams++;
    getUserMedia.call(navigator, options, function(stream) {
      el.src = URL.createObjectURL(stream);
      rtc.streams.push(stream);
      rtc.initializedStreams++;
      onSuccess(stream);
      if (rtc.initializedStreams === rtc.numStreams) {
        rtc.fire('ready');
      }
    }, function() {
      alert("Could not connect stream.");
      onFail();
    });  
  } else {  
    alert('webRTC is not yet supported in this browser.');
  }  
}

rtc.addStreams = function() {
  for (var i = 0; i < rtc.streams.length; i++) {
    var stream = rtc.streams[i];
    for (var connection in rtc.peerConnections) {
        rtc.peerConnections[connection].addStream(stream);
    }
  }
};

rtc.attachStream = function(stream, domId) {
  document.getElementById(domId).src = URL.createObjectURL(stream);
};

rtc.on('ready', function() {
  rtc.createPeerConnections();
  rtc.addStreams();
  rtc.sendOffers();
});

}).call(this);
