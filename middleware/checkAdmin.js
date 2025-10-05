const User = require('../models/user');

const checkAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/user/login');
  }
  const user = await User.findById(req.session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).render('error', { message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' }); // หรือ redirect ไป dashboard
  }
  res.locals.currentUser = user; // Set currentUser ถ้ายังไม่มี (supplement detectUser)
  next();
};

module.exports = checkAdmin;