const User = require('../models/User');

const detectUser = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-password');
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      } else {
        // ถ้า user หาย ล้าง session
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
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