const checkLecturer = (req, res, next) => {
  if (!req.user || req.user.role !== 'lecturer') {
    return res.status(403).redirect('/login'); // หรือ redirect ไปหน้าที่เหมาะสม เช่น /unauthorized
  }
  next();
};

module.exports = checkLecturer;