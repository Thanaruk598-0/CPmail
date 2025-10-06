const express = require("express");
const router = express.Router();

// หน้าแรก (Home)
router.get("/", (req, res) => {
  const user = req.session.user || null;
  res.render("home", { user });  // ✅ render หน้า home.ejs
});

module.exports = router;
