const express = require('express');
const path = require("path");
const db = require("../models");
const passport = require("../config/passport");

// import user account middleware
const isAuthenticated = require("../config/middleware/isAuthenticated"); // if user isn't logged in redirect to login
const isLoggedIn = require("../config/middleware/isLoggedIn"); // if user is logged in redirect to home
const router = express.Router();

const uuid = require('uuid');



// get the index page
router.get("/", (req,res) => {
  let obj = {};
  if (req.query.msg == "logout") {
    obj.msg = "You are successfully logged out";
  } else if (req.query.msg == "logged-in") {
    obj.msg = "You are logged in";
  }
  res.render("index", obj);
})

// post request when user tries to join meeting
router.post("/", isAuthenticated, async (req,res) => {
  const name = uuid.v4();
  let room;
  // if user wants to create room
  if (req.body.createRoom) { 
    try {
      room = await db.Room.create({name: name});
      await db.User.update({RoomId: room.id}, {
        where: {username: req.user.username}
      });
    } catch (error) {
      console.log(error);
      res.redirect("/");
      return;
    }
    req.session.room = room.name;
    req.session.save(() => {res.redirect(`/chat?room=${room.name}`)});
    return;
  }
  
  // if user wants to join already existing room
  if(req.body.roomName) {
    room = await db.Room.findOne({where: {name: req.body.roomName}});
    // if the room exists
    if (room) {
      await db.User.update({RoomId: room.id}, {
        where: {username: req.user.username}
      });
      req.session.room = room.name;
      req.session.save(() => {res.redirect(`/chat?room=${room.name}`)});
      return;
    } else {
      res.redirect("/");
      return;
    }
  }
  
  res.render("index");
})

router.get("/test", isAuthenticated, async (req,res) => {
  console.log(req.user.Room);
  res.render("index");
})


// get the login page
router.get("/login", isLoggedIn, (req,res) => {
  const queryString = req.query.error;
  let msg = "";
  if (queryString == "login-required") {
    msg = "Login Required";
  } else if (queryString == "invalid") {
    msg = "Invalid Login";
  }
  res.render("login", {layout: false, msg: msg});
});



router.post('/login', isLoggedIn, function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      // must save session before redirecting. Many web browsers will redirect before they even finish receiving the response.
      req.session.save(() => res.redirect('/profile'));
    });
  })(req, res, next);
});


// get the register page
router.get("/register", isLoggedIn, (req,res) => {
  res.render("register", {layout: false});
})


// post route for registered user
router.post("/register", isLoggedIn, async (req,res) => {
  const {password, username, confirmPassword} = req.body;

  console.log(password + " " + username );
  // if username and password have a value and are not empty strings
  // will need to validate forms on the front end as well
  if (username && password && password === confirmPassword) {
    let user;
    try {
      user = await db.User.create({
        username: username,
        password: password
      }); // password will be hashed inside model/user.js in the beforeCreate hook
    } catch (error) {
      console.log(error);
      // if error is validation error
      if (error.name === "SequelizeValidationError") {
        res.render("register", {layout:false, msg: "Username must be between 4 and 14 characters"});
        return
      }
      res.render("register", {layout: false});
      return;
    }
  
    // login user
    req.login(user, function(err) {
      if (!err) {
        req.session.save(() => res.redirect("/profile"));
      } else {
        console.log(err);
      }
    });
    
  } else {
    res.render("register", {layout: false});
    return;
  }
  
})


// route to the chat area
router.get("/chat", isAuthenticated, (req,res) => {
  // if user doesn't have this room saved then kick them out
  const roomId = req.query.room;
  if (req.session.room !== roomId) {
    res.redirect("/"); // todo: send message access denied
    return;
  }
  res.render("chat", {layout: false});
})

// show logged in user profile
router.get("/profile", isAuthenticated, (req,res) => {
  const {username, createdAt} = req.user;
  res.render("profile", {username: username, createdAt: createdAt});
})

// route for logging user out
router.get("/logout", isAuthenticated, (req,res) => {
  req.logout(); // logout function exposed by passport js
  req.session.save(() => res.redirect('/?msg=logout'));
})



module.exports = router;