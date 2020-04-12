const queryStringChat = window.location.search;
const urlParamsChat = new URLSearchParams(queryString);
const roomChat = urlParams.get("room");
const userChat = urlParams.get("user");

socket.emit('joined chat', {room: roomchat, user,userchat});