const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const router = express.Router();

// GET /user/login
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST /user/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.render('login', { error: "ไม่พบผู้ใช้นี้" });
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return res.render('login', { error: "รหัสผ่านผิด" });
  }
  req.session.userId = user._id;
    res.redirect(`/users/profile/${user._id}`);
});

// GET /user/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/user/login'));
});

// เพิ่ม user admin ชั่วคราว
router.get('/add-admin', async (req, res) => {
  const exists = await User.findOne({ email: "admin@email.com" });
  if (exists) return res.send("admin exists! <a href='/user/login'>Login</a>");
  await User.create({
    name: "Admin User",
    email: "admin@email.com",
    role: "admin",
    avatarUrl: "https://randomuser.me/api/portraits/lego/1.jpg",
    passwordHash: await bcrypt.hash("12345678", 10)
  });
  res.send("Added admin! <a href='/user/login'>Login here</a> (Email: admin@email.com, PASSWORD: 12345678)");
});

module.exports = router;