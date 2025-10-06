const User = require('../models/user');

const detectUser = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-password'); // เอา password ออก
      if (user) {
        req.user = user;            // ให้ router ใช้ได้
        res.locals.currentUser = user; // ให้ view ใช้ได้
      } else {
        req.user = null;
        res.locals.currentUser = null;
      }
    } catch (err) {
      console.error('detectUser error:', err);
      req.user = null;
      res.locals.currentUser = null;
    }
  } else {
    req.user = null;
    res.locals.currentUser = null;
  }
  next();
};

module.exports = detectUser;

