// import { doc } from "prettier";

// getting dom elements
var divSelectRoom = document.getElementById("selectRoom");
var divConsultingRoom = document.getElementById("consultingRoom");
var inputRoomNumber = document.getElementById("roomNumber");
var btnGoRoom = document.getElementById("goRoom");
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");
var divCantJoinMsg = document.getElementById("cantJoinMsg");

// get url parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const room = urlParams.get("room");
const user = urlParams.get("user");

// variables
var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;
var iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};
// var streamConstraints = { audio: true, video: { width: 640, height: 480 } };
var streamConstraints = { audio: true, video: true };
var isCaller;

// connect to socket io
var socket = io();

// the room is chosen and emits (create or join)
btnGoRoom.onclick = function() {
  // if (inputRoomNumber.value === "") {
  //   alert("Please type a room number");
  // } else {
  // roomNumber = inputRoomNumber.value;
  roomNumber = room + "-video"; //this separates this from the socket text chat rooms
  socket.emit("create or join", roomNumber); // emit (create or join)
  // divSelectRoom.style = "display: none;";
  // divConsultingRoom.style = "display: block;";
};

// tell the user the room is full
socket.on("full", () => {
  divCantJoinMsg.innerHTML = "";
  //create span message
  let span = document.createElement("span");
  span.textContent = "Sorry, the video chat room is full";
  //create icon
  let icon = document.createElement("i");
  icon.classList.add("material-icons");
  icon.textContent = "info_outline";
  
  divCantJoinMsg.append(icon);
  divCantJoinMsg.append(span);
})

// message handlers
// for the person who creates the room in this example referred to as the caller
socket.on("created", function(room) {
  divSelectRoom.style = "display: none;";
  divConsultingRoom.style = "display: block;";
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then(function(stream) {
      localStream = stream;
      localVideo.srcObject = stream;
      isCaller = true; // caller is the person who creates the room
    })
    .catch(function(err) {
      console.log("An error ocurred when accessing media devices", err);
    });
});

// event for those who enter the room
socket.on("joined", function(room) {
  divSelectRoom.style = "display: none;";
  divConsultingRoom.style = "display: block;";
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then(function(stream) {
      localStream = stream;
      localVideo.srcObject = stream;
      socket.emit("ready", roomNumber); // joiner
    })
    .catch(function(err) {
      console.log("An error ocurred when accessing media devices", err);
    });
});

// sets up candidates don't worry about this
socket.on("candidate", function(event) {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

// joiner has emitted ready
// this event is made for the person who created the room
socket.on("ready", function() {
  // joiner has emitted ready which sends it to here
  if (isCaller) {
    // if the caller
    rtcPeerConnection = new RTCPeerConnection(iceServers); // sets up caller RTCPeerConnection
    rtcPeerConnection.onicecandidate = onIceCandidate; // gets and sends ice candidates to the recipient
    rtcPeerConnection.ontrack = onAddStream; // This lets you connect the incoming media to an element to display it, for example.
    //rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection
      .createOffer()
      .then(async (sessionDescription) => {
        await rtcPeerConnection.setLocalDescription(sessionDescription);

        /*We know the description is valid, and has been set, when the promise returned by setLocalDescription() 
        is fulfilled. This is when we send our offer to the other peer by creating a new "video-offer" 
        message containing the local description (now the same as the offer), then 
        sending it through our signaling server to the callee. */
        socket.emit("offer", {
          type: "offer",
          sdp: sessionDescription,
          room: roomNumber,
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

// caller has sent data to callee to
socket.on("offer", function(event) {
  if (!isCaller) {
    // if callee
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate; // set up ice candidates
    rtcPeerConnection.ontrack = onAddStream; // callback to add stream of the callee. when a track is added to the connection. This lets you connect the incoming media to an element to display it, for example.
    //rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream); // adds either video or audio track
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream); // adds eiither video or audio track
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event)); // sets remote description of caller
    rtcPeerConnection
      .createAnswer()
      .then((sessionDescription) => {
        rtcPeerConnection.setLocalDescription(sessionDescription); // set local description
        socket.emit("answer", {
          type: "answer",
          sdp: sessionDescription,
          room: roomNumber,
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

// caller sets sdp description of the callee
socket.on("answer", function(event) {
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on("video user disconnected", function() {
  console.log("user left");
  if (!isCaller) {
    remoteVideo.pause();
    remoteVideo.removeAttribute("src"); // empty source
    remoteVideo.load();

    // remove and then add the video element back
    removeReplaceVideo();

    localVideo.pause();
    localVideo.removeAttribute("src"); // empty source
    localVideo.load();
    socket.emit("leave room"); // leave room
    // try to join room as the caller now
    socket.emit("create or join", roomNumber);
  } else {
    removeReplaceVideo();
  }
});

// handler functions

//
function onIceCandidate(event) {
  if (event.candidate) {
    console.log("sending ice candidate");
    socket.emit("candidate", {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      room: roomNumber,
    });
  }
}

function onAddStream(event) {
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.stream;
}

function removeReplaceVideo() {
  remoteVideo.remove();
  remoteVideo = document.createElement("video");
  remoteVideo.autoplay = true;
  remoteVideo.setAttribute("id", "remoteVideo");
  remoteVideo.classList.add("responsive-video");
  divConsultingRoom.append(remoteVideo);
}
