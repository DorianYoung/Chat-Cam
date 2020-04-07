var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

var db = require("../models");

// Telling passport we want to use a Local Strategy. In other words, we want login with a username/email and password
passport.use(new LocalStrategy(
  // Our user will sign in using an email, rather than a "username"
  {
    usernameField: "username",
    passwordField: "password"
  },
  function(username, password, done) {
    // When a user tries to sign in this code runs
    db.User.findOne({
      where: {
        username: username
      }
    }).then(function(dbUser) {
      // If there's no user with the given email
      if (!dbUser) {
        return done(null, false, {
          message: "Incorrect username."
        });
      }
      // If there is a user with the given email, but the password the user gives us is incorrect
      else if (!dbUser.validPassword(password)) {
        return done(null, false, {
          message: "Incorrect password."
        });
      }
      // If none of the above, return the user
      return done(null, dbUser);
    }).catch(err => {
      return done(err);
    })
  }
));

// In order to help keep authentication state across HTTP requests,
// Sequelize needs to serialize and deserialize the user
// Just consider this part boilerplate needed to make it all work
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  let user;
  try {
    user = await db.User.findOne({where: {id: id}}); // if we just return id (done(null, id) )
  } catch (error) {
    done(error);
  }
  
  done(null, user);
});

// Exporting our configured passport
module.exports = passport;
