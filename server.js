// Requiring necessary npm packages
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var session = require("express-session");
// Requiring passport as we've configured it
var passport = require("./config/passport");
const exphbs = require("express-handlebars");

// Setting up port and requiring models for syncing
var PORT = process.env.PORT || 8080;
var db = require("./models");


app.use(express.static("public"));

// what persistent memory we are going to store our session in. by default express-session uses its own implementation using local memory not good for production and can cause memory leaks
// you need to connect database to express session middleware. there are stores for most database implementations
var SequelizeStore = require("connect-session-sequelize")(session.Store);
var myStore = new SequelizeStore({
  db: db.sequelize
})

// We need to use sessions to keep track of our user's login status
app.use(session({ 
  secret: "keyboard cat", 
  store: myStore, // session store object is using 
  resave: true, 
  saveUninitialized: true,
  cookie: { 
    // setting httpOnly: true and secure: true will help avoid session hijacking
    httpOnly: true, // this is the defualt value
    secure: false // this should be true if there is going to be an https connection // the cookie will not be sent if secure: true and the site is accessed over http not https 
  } 
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

//setup express handlebars
app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("view engine", "handlebars");


// Requiring our routes
const htmlRoutes = require("./routes/html-routes");
app.use(htmlRoutes);



//////////////////////////////////////////////
/////////////// socket.io/////////////////////
io.on("connection", function (socket) {
  console.log("a user connected");

  // webrtc 2 people functionality
  socket.on("create or join", function (room) {
    console.log("create or join to room ", room);

    var myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
    var numClients = myRoom.length;

    console.log(room, " has ", numClients, " clients");

    if (numClients == 0) {
      socket.join(room);
      socket.emit("created", room);
    } else if (numClients == 1) {
      socket.join(room);
      socket.emit("joined", room);
    } else {
      socket.emit("full", room);
    }
  });

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

  socket.on("disconnect",function(event) {
    console.log("user left");
  })
});
// webrtc 2 people functionality


//////////////////////////////////////////////
/////////////// socket.io/////////////////////


// Syncing our database and logging a message to the user upon success
// handling socket.io
db.sequelize.sync({force: true}).then(function() {
  http.listen(PORT, function() {
    console.log("==> 🌎  Listening on port %s. Visit http://localhost:%s/ in your browser.", PORT, PORT);
  });
});
