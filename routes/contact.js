const express = require("express");
const router = express.Router();

// แสดงหน้า contact
router.get("/contact", (req, res) => {
  res.render("contact");
});

module.exports = router;
