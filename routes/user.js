const express = require("express");
const router = express.Router();
//ตรวจสอบ dashboard

// middleware ตรวจสอบ login
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}
// Dashboard
router.get("/dashboard", isAuthenticated, (req, res) => {
  res.render("dashboard", { user: req.session.user });
});
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.send("ไม่สามารถออกจากระบบได้");
    }
    res.redirect("/login");
  });
});

module.exports = router;