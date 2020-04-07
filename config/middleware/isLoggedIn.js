// if user is already logged in they shouldn't be able to register another user nor go to login again
module.exports = function(req, res, next) {
  if (req.user) {
    return res.redirect("/");
  }

  return next();
}