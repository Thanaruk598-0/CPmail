const express = require("express");
const { requireRole } = require("../middleware/authz"); // middleware ที่ทำไปก่อนหน้า
const router = express.Router();

router.get("/admin", requireRole("admin"), (req, res) => {
  res.render("admin"); // render admin.ejs
});

module.exports = router;
