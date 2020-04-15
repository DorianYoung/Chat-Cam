const queryStringChat = window.location.search;
const urlParamsChat = new URLSearchParams(queryStringChat);
const roomChat = urlParamsChat.get("room");
const userChat = urlParamsChat.get("user");

// elements for chat
const chatTextarea = document.querySelector("#chatTextarea");
const chatWindow = document.querySelector("#chat-window");
const modalContent = document.querySelector(".modal-content");


// scroll top for chat window area
var scrollTop = chatWindow.scrollTop;
var scrollHeight = chatWindow.scrollHeight;
var hasScrolled = false;

// if user does enter+ shift down it will not submit the message from textarea
var shiftDown = false;


// this will be used for chat
var socketText = io();

// tells the server we have joined the chat
socketText.emit("join chat", {room: roomChat, user: userChat});

// recieves from server joined chat
socketText.on("joined chat", function(obj) {
  let div = document.createElement("div");
  div.classList.add("entered-chat");
  div.textContent = `${obj.user} entered the chat`; // using textContent sanitizes someone trying to use html tags to style it ie <h1>hello</h1>
  chatWindow.append(div);
  socketText.emit("get users", roomChat); // get the users in the room
})

// adds the participants to the modal area
socketText.on("users in room", function(arr) {
  console.log(`There are ${arr.length} users in the room`);
  console.log(arr);

  // remove all children from modal area
  modalContent.innerHTML = "";

  // add h5 to the modal 
  const h5 = document.createElement("h5");
  h5.textContent = "Users in Chat";
  modalContent.append(h5);

  // append each user that is sent
  arr.forEach(elem => {
    const p = document.createElement("p");
    p.classList.add("participant")
    p.textContent = elem;
    modalContent.append(p);
  })

})


// keydown event on textarea
chatTextarea.addEventListener("keydown", (e) => {
  if (e.key === "Shift") {
    shiftDown = true;
    return;
  }
  // if enter key is pressed and shift key is down then don't submit
  if (e.key === "Enter" && shiftDown) {
    return;
  } else if (e.key === "Enter" && !shiftDown) {
    e.preventDefault(); // don't let the enter key work
    addMessageToChat(); // adds user's message to chat window and emits to rest of the chat room
    return;
  }
  // todo: emit that user is typing
})



// if key up for shift then shiftDown is false;
chatTextarea.addEventListener("keyup", (e) => {
  if (e.key === "Shift") {
    shiftDown = false;
  }
})


// adds user's message to chat and emits to lobby
function addMessageToChat() {
  const msg = chatTextarea.value;
  if (msg.length < 1) {
    return;
  } 

  // clear textarea
  chatTextarea.value = "";

  let divMessage = document.createElement("div");
  divMessage.classList.add("message", "me"); 

  let messageName = document.createElement("div");
  messageName.classList.add("message-name-me");
  messageName.textContent = userChat;


  let messageText = document.createElement("div");
  messageText.classList.add("message-text", "text-me");
  messageText.textContent = msg;

  let timeSpan = document.createElement("span");
  let [time, utcDateString] = formatDate();
  timeSpan.textContent = time;

  messageText.append(timeSpan);

  divMessage.append(messageName);
  divMessage.append(messageText);
  chatWindow.append(divMessage);

  // send the message to those in the room
  socketText.emit("chat message", {room: roomChat, user: userChat, utc: utcDateString, msg: msg})
}


// message from someone else in the room
socketText.on("chat message", function(obj) {
  let {room, user, utc, msg} = obj; // object destructuring
  
  let divMessage = document.createElement("div");
  divMessage.classList.add("message"); 

  let messageName = document.createElement("div");
  messageName.classList.add("message-name");
  messageName.textContent = user;


  let messageText = document.createElement("div");
  messageText.classList.add("message-text");
  messageText.textContent = msg;

  let timeSpan = document.createElement("span");
  let time = formatDate(utc);
  timeSpan.textContent = time;

  messageText.append(timeSpan);

  divMessage.append(messageName);
  divMessage.append(messageText);
  chatWindow.append(divMessage);
})


// show that the user disconnected
socketText.on("user disconnected", function(obj) {
  let div = document.createElement("div");
  div.classList.add("entered-chat");
  div.textContent = `${obj.user} left the chat`; // using textContent sanitizes someone trying to use html tags to style it ie <h1>hello</h1>
  chatWindow.append(div);

});


// formats the date to give local time string 7:30 am and also the utc datestring for emitting to other sockets
function formatDate(date = null) {
  if (date) {
    // convert the utc date to local time (7:30am)
    return formatAMPM(date); // just get the formatted string
  } else {
    // no date is given get the local time and convert to string for appending 
    // also give the utc date string to emit to the server
    let dateTime = new Date();
    let utc = dateTime.toUTCString();
    let strTime = formatAMPM(utc); 
    return [strTime, utc];
  }
}

// https://stackoverflow.com/questions/8888491/how-do-you-display-javascript-datetime-in-12-hour-am-pm-format
// gets 
function formatAMPM(utcDateString) {
  const date = new Date(utcDateString); // utc date
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}
