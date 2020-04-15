const express = require("express");
const path = require("path");
const db = require("../models");
const passport = require("../config/passport");

// import user account middleware
const isAuthenticated = require("../config/middleware/isAuthenticated"); // if user isn't logged in redirect to login
const isLoggedIn = require("../config/middleware/isLoggedIn"); // if user is logged in redirect to home
const router = express.Router();

const uuid = require("uuid");

// get the index page
router.get("/", (req, res) => {
  // if the user just logged out
  if (req.query.msg == "logout") {
    res.render("index", { msg: "You are Successfully Logged Out" });
    return;
  }

  // if the user is logged in
  if (req.user) {
    res.render("index", { username: req.user.username, loggedIn: true });
    return;
  }

  // if no errors and the user is not logged in
  res.render("index", {});
});

// post request when user tries to join meeting
router.post("/", isAuthenticated, async (req, res) => {
  const name = uuid.v4();
  let room;
  // if user wants to create room
  if (req.body.createRoom) {
    try {
      room = await db.Room.create({ name: name });
      await db.User.update(
        { RoomId: room.id },
        {
          where: { username: req.user.username },
        }
      );
    } catch (error) {
      console.log(error);
      res.redirect("/");
      return;
    }
    req.session.room = room.name;
    req.session.save(() => {
      res.redirect(`/chat?room=${room.name}&user=${req.user.username}`);
    });
    return;
  }

  // if user wants to join already existing room
  if (req.body.roomName) {
    room = await db.Room.findOne({ where: { name: req.body.roomName } });
    // if the room exists
    if (room) {
      await db.User.update(
        { RoomId: room.id },
        {
          where: { username: req.user.username },
        }
      );
      req.session.room = room.name;
      req.session.save(() => {
        res.redirect(`/chat?room=${room.name}&user=${req.user.username}`);
      });
      return;
    } else {
      res.redirect("/");
      return;
    }
  }

  res.render("index");
});

//test route
router.get("/test", isAuthenticated, async (req, res) => {
  console.log(req.user.Room);
  res.render("index");
});

// get the login page
router.get("/login", isLoggedIn, (req, res) => {
  const obj = {};
  const queryString = req.query.error;
  if (queryString == "login-required") {
    obj.msg = "Login Required";
    obj.error = true;
  } else if (queryString == "invalid") {
    objmsg = "Invalid Login";
    obj.error = true;
  }
  res.render("login", obj);
});

router.post("/login", isLoggedIn, function(req, res, next) {
  passport.authenticate("local", function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.render("login", { msg: "Invalid Login", error: true });
    }
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      // must save session before redirecting. Many web browsers will redirect before they even finish receiving the response.
      req.session.save(() => res.redirect("/profile"));
    });
  })(req, res, next);
});

// get the register page
router.get("/register", isLoggedIn, (req, res) => {
  res.render("register");
});

// post route for registered user
router.post("/register", isLoggedIn, async (req, res) => {
  const { password, username, confirmPassword } = req.body;

  console.log(password + " " + username);
  // if username and password have a value and are not empty strings
  // will need to validate forms on the front end as well
  if (username && password && password === confirmPassword) {
    let user;
    try {
      user = await db.User.create({
        username: username,
        password: password,
      }); // password will be hashed inside model/user.js in the beforeCreate hook
    } catch (error) {
      console.log(error);
      // if error is validation error
      if (error.name === "SequelizeValidationError") {
        res.render("register", {
          msg: "Username must be between 4 and 14 characters",
        });
        return;
      }
      res.render("register", { msg: "User already exists", error: true });
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
    res.render("register", { msg: "Invalid Registration", error: true });
    return;
  }
});

// route to the chat area
router.get("/chat", isAuthenticated, async (req, res) => {
  if (!req.query.room || !req.query.user) {
    res.redirect("/");
    return;
  }

  // check if user matches user query parameter so they can't put false usernames
  if (req.user.username !== req.query.user) {
    return res.redirect("/");
  }

  // check if room is in database
  const room = await db.Room.findOne({ where: { name: req.query.room } });
  if (!room) {
    res.redirect("/");
    return;
  }

  // if user doens't have this in their session then kick them out
  if (req.session.room !== req.query.room) {
    //update user
    // const user = await db.User.update({RoomId: room.id}, {where: {id: req.user.id}});
    // req.session.room = room.name;
    // req.session.save(() => {return res.render("chat", {layout: false, loggedIn: true, username: req.user.username})});
    return redirect("/");
  }

  // if the user does have this in their session
  res.render("chat", {
    layout: false,
    loggedIn: true,
    username: req.user.username,
  });
});

// show logged in user profile
router.get("/profile", isAuthenticated, async (req, res) => {
  // const {username, createdAt, id} = req.user;
  // if user has been to or created room
  const user = await db.User.findOne({
    where: { id: req.user.id },
    include: db.Room,
  });
  if (req.user.RoomId) {
    const users = await db.User.findAll({ where: { RoomId: req.user.RoomId } });
    let share = users.map((elem) => elem.username); // handlebars doesn't play nice with collections of sequelize
    return res.render("profile", {
      loggedIn: true,
      username: req.user.username,
      username: user.username,
      createdAt: user.createdAt,
      share: share,
      room: user.Room.name,
    });
  }
  res.render("profile", {
    loggedIn: true,
    username: req.user.username,
    createdAt: user.createdAt,
  });
});

// route for logging user out
router.get("/logout", isAuthenticated, (req, res) => {
  req.logout(); // logout function exposed by passport js
  req.session.save(() => res.redirect("/?msg=logout"));
});

module.exports = router;
