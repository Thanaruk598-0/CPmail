const express = require("express");
const { requireRole } = require("../middleware/authz");
const router = express.Router();

// เฉพาะ lecturer และ admin เข้าได้
router.get("/lecturer", requireRole(["lecturer", "admin"]), (req, res) => {
  res.render("lecturer", { currentUser: res.locals.currentUser });
});

module.exports = router;
