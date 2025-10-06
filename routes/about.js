const express = require("express");
const router = express.Router();

// แสดงหน้า contact
router.get("/about", (req, res) => {
  res.render("about");
});

module.exports = router;