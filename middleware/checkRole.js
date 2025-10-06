const User = require('../models/user');

const checkRole = async (req, res, next) => {
  try {
    // ถ้าไม่มี session = ยังไม่ login
    if (!req.session.userId) {
      return res.redirect('/user/login');
    }

    // ดึงข้อมูล user จากฐานข้อมูล
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.redirect('/user/login');
    }

    // เก็บ user ลงใน req เพื่อให้ route ใช้ต่อได้
    req.user = user;
    res.locals.currentUser = user;

    next(); // ผ่านไป route ถัดไป
  } catch (err) {
    console.error('checkRole error:', err);
    res.status(500).render('error', { 
      message: 'เกิดข้อผิดพลาด', 
      error: { status: 500, stack: err.stack } 
    });
  }
};

module.exports = checkRole;
