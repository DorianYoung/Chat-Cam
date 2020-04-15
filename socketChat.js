const db = require("./models");

module.exports = function(io) {
  io.on("connection", function (socket) {
    console.log("a user connected");

    
    socket.on("create or join", function (room) {
      console.log("create or join to room ", room);
      socket.room = room;

      var myRoom = io.sockets.adapter.rooms[room] || { length: 0 }; // gets number or clients in room or sents lenght to 0 if that room is just being created
      var numClients = myRoom.length;

      console.log(room, " has ", numClients, " clients");

      if (numClients == 0) {
        socket.join(room);
        socket.videoParticipant = true; // this socket has a session 
        socket.emit("created", room); // emits created room
      } else if (numClients == 1) {
        socket.join(room);
        socket.videoParticipant = true; // this socket has a session 
        socket.emit("joined", room);
      } else {
        socket.emit("full", room);
      }
    });
    /////// end create or join

    socket.on("ready", function (room) {
      socket.broadcast.to(room).emit("ready");
    });

    socket.on("candidate", function (event) {
      socket.broadcast.to(event.room).emit("candidate", event);
    });

    socket.on("offer", function (event) {
      socket.broadcast.to(event.room).emit("offer", event.sdp);
    });

    socket.on("answer", function (event) {
      socket.broadcast.to(event.room).emit("answer", event.sdp);
    });

    socket.on("leave room", function() {
      socket.leave(socket.room);
    })

    // socket.on("disconnect", function() {
    //   console.log("user disconnected");
    //   console.log(socket.room);
    //   socket.to(socket.room).broadcast.emit("video user disconnected");
    // })

    
    // for the text using different socket in client ot handle these events
    ////////////////////////////////////////////////////////////////////////
    
    
    // join text chat
    socket.on("join chat", async function(obj) {
      socket.join(obj.room); // join the room
      console.log(`\n\n${obj.user} joined the chat channel in room ${obj.room}`);
      const user = await db.Chat.findAll({where: {room: obj.room, user: obj.user}}); // this means the user just updated the page checking if the user just updated the page
      if (user.length <= 0){
        await db.Chat.create({room: obj.room, user: obj.user});
      }
      socket.user = obj.user; // save username to this socket's session
      socket.room = obj.room; // save the room to this socket's session
      console.log(`${socket.user} joined chat channel`)

      // tell them that user joined chat
      io.to(obj.room).emit("joined chat", {user: obj.user}) // allows the client to add "username has entered the chat"
    })

    // get the users in the current chat room
    socket.on("get users", async function(room) {
      const users = await db.Chat.findAll({attributes: ['user']}, {where: {room: room}});
      console.log("\n\n users in the room " + JSON.stringify(users));
      // get an array of the connected users
      const connected = users.map(elem => elem.user)

      io.to(room).emit("users in room", connected); // send to everyone when user joins
    });
  
    // someone sends chat message
    socket.on("chat message", function(obj) {
      // send to all clients except sender
      socket.to(obj.room).broadcast.emit("chat message", obj); //sends object
    })
  
    
    // accounts for both the sockets used in the text chat and the video call
    socket.on("disconnect", async () => {
      // otherwise it will say undefined disconnected
      if (!socket.user && !socket.videoParticipant) {
        return;
      }

      // if one of the 2 video participants leave
      if (socket.videoParticipant) {
        console.log("user disconnected");
        console.log(socket.room);
        socket.to(socket.room).broadcast.emit("video user disconnected");
        return;
      }
      // remove user from array
      await db.Chat.destroy({
        where: {
          user: socket.user
        }
      });

      const users = await db.Chat.findAll({attributes: ['user']}, {where: {room: socket.room}});
      console.log(JSON.stringify(users));
      const connected = users.map(elem => elem.user)
      io.to(socket.room).emit("users in room", connected);
      console.log(`${socket.user} disconnected`);
      socket.to(socket.room).broadcast.emit("user disconnected", {user: socket.user}); // sends string
    })
  });
  // end io.on(connection)
}
// end exported function