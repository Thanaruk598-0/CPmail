const express = require("express");
const router = express.Router();

// แสดงหน้า contact
router.get("/feature", (req, res) => {
  res.render("feature");
});

module.exports = router;