const checkStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).redirect('/'); // หรือ redirect ไปหน้าที่เหมาะสม เช่น /unauthorized
  }
  next();
};

module.exports = checkStudent;