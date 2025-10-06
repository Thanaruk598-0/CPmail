const User = require('../models/user');

const checkAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/user/login'); // ถ้าไม่ login ให้ไป login
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).render('error', { 
        message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 
        error: { status: 403, stack: '' } 
      });
    }

    req.user = user; // ให้ route ใช้ได้
    res.locals.currentUser = user; // ให้ view ใช้ได้
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
