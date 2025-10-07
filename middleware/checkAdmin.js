const User = require('../models/User');

const checkAdmin = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/user/login');
  }

  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user || user.role !== 'admin') {
      return res.status(403).render('error', { 
        message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 
        error: { status: 403, stack: '' } 
      });
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    console.error('checkAdmin error:', err);
    res.status(500).render('error', { 
      message: 'เกิดข้อผิดพลาด', 
      error: { status: 500, stack: err.stack } 
    });
  }
};

module.exports = checkAdmin;