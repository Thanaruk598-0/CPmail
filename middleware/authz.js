// ต้อง login
function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  return res.redirect("/login");
}

// ต้องมี role ตรงตามที่กำหนด (เช่น "admin" หรือ ["admin","lecturer"])
function requireRole(roles) {
  const allow = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!res.locals.userRole) return res.redirect("/login");
    if (allow.includes(res.locals.userRole)) return next();
    return res.status(403).send("Access denied");
  };
}

module.exports = { requireAuth, requireRole };
