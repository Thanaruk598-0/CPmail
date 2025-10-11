const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { User } = require("../models");

// Login page
router.get("/user/login", (req, res) => {
  const { changed } = req.query; // จะเป็น '1' ถ้ามาจาก /login?changed=1
  res.render("login", { changed }); // ส่งไปให้ EJS
});

// Login submit
router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, "i") },
    });

    if (!user) return res.status(400).send("User not found");

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).send("Invalid password");

    req.session.user = user;

    if (user.role === "student") return res.redirect("/student");
    if (user.role === "lecturer") return res.redirect("/lecturer");
    if (user.role === "admin") return res.redirect("/admin");

    res.send("Role not recognized");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Logout
router.get("/user/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/user/login");
});

module.exports = router;
