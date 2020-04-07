const express = require('express');
const path = require("path");
const db = require("../models");
const passport = require("../config/passport");

// import isAuthenicated middleware
const isAuthenticated = require("../config/middleware/isAuthenticated");
const router = express.Router();

router.get("/", (req,res) => {
  //console.log(req.user);
  res.render("index", {layout: false});
})

// 
router.post("/", isAuthenticated, (req,res) => {
  res.render("index");
})


router.get("/login", (req,res) => {
  res.render("login");
})

router.post("/login", passport.authenticate("local"), (req,res) => {
  res.render("index", {msg: "logged in"});
})

router.get("/register", (req,res) => {
  res.render("register");
})

router.post("/register", async (req,res) => {
  const {password, username} = req.body;
  
  try {
    const newUser = await db.User.create({
      username: username,
      password: password
    }); // password will be hashed inside model/user.js in the beforeCreate hook
  } catch (error) {
    console.log(error);
    res.status(500).end();
    return;
  }

  // authenticate the user after they register
  passport.authenticate('local')(req, res, function() {
    res.render('index', {msg: "logged in"});
  });
})

router.get("/chat", isAuthenticated, (req,res) => {
  res.render("chat");
})


module.exports = router;