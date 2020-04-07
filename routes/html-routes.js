const express = require('express');
const path = require("path");
const db = require("../models");
const passport = require("../config/passport");

// import user account middleware
const isAuthenticated = require("../config/middleware/isAuthenticated"); // if user isn't logged in redirect to login
const isLoggedIn = require("../config/middleware/isLoggedIn"); // if user is logged in redirect to home
const router = express.Router();

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
router.post("/", isAuthenticated, (req,res) => {
  res.render("index");
})


// get the login page
router.get("/login", isLoggedIn, (req,res) => {
  const queryString = req.query.error;
  let obj = {};
  if (queryString == "login-required") {
    obj.msg = "Login Required";
  } else if (queryString == "invalid") {
    obj.msg = "Invalid Login";
  }
  res.render("login", obj);
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
  res.render("register");
})


// post route for registered user
router.post("/register", isLoggedIn, async (req,res) => {
  const {password, username} = req.body;
  // if username and password have a value and are not empty strings
  // will need to validate forms on the front end as well
  if (username && password) {
    //create user
    try {
      await db.User.create({
        username: username,
        password: password
      }); // password will be hashed inside model/user.js in the beforeCreate hook
    } catch (error) {
      console.log(error);
      // if error is validation error
      if (error.name === "SequelizeValidationError") {
        res.render("register", {msg: "Username must be between 4 and 14 characters"});
        return
      }
      res.render("register");
      return;
    }
  
    // authenticate the user after they register
    passport.authenticate('local')(req, res, function() {
      req.session.save(() => res.redirect('/?msg=logged-in'));
    }) (req, res, next);

    // req.session.save(() => res.redirect("/login"));
  } else {
    res.render("register");
    return;
  }
  
})


// route to the chat area
router.get("/chat", isAuthenticated, (req,res) => {
  res.render("chat");
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