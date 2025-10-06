const express = require("express");
const router = express.Router();

router.get("/home", (req, res) => {
  // ถ้ามี user ใน session → ส่งไป render dashboard
  if (req.session.user) {
    return res.render("home", { user: req.session.user });
  }
  // ถ้าไม่มี user → render home แบบ public
  res.render("home", { user: null });
});

module.exports = router;
