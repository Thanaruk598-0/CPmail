const User = require("../models/User");

module.exports = async function(req, res, next) {
  if (req.session.userId) {
    res.locals.currentUser = await User.findById(req.session.userId);
  } else {
    res.locals.currentUser = null;
  }
  next();
};