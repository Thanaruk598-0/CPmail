const express = require("express");
const bcrypt = require("bcryptjs");
const User = require('../models/User');
const checkAdmin = require('../middleware/checkAdmin');
const router = express.Router();

// GET /manageUser/list
router.get('/list', checkAdmin, async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role && role !== 'all') query.role = role;

    // Filter by status
    if (status && status !== 'all') query.isActive = status === 'active';

    const users = await User.find(query).sort({ createdAt: -1 });

    // Stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const studentCount = await User.countDocuments({ role: 'student' });
    const lecturerCount = await User.countDocuments({ role: 'lecturer' });
    const adminCount = await User.countDocuments({ role: 'admin' });
    const pending = await User.countDocuments({ mustChangePassword: true });

    res.render('manageUser/list', {
      users,
      search,
      role: role || 'all',
      status: status || 'all',
      activeMenu: 'manageUser',
      currentUser: res.locals.currentUser,
      stats: { totalUsers, activeUsers, studentCount, lecturerCount, adminCount, pending }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
  }
});

// GET /manageUser/add
router.get('/add', checkAdmin, (req, res) => {
  res.render('manageUser/addUser', { activeMenu: 'manageUser', currentUser: res.locals.currentUser });
});

// POST /manageUser/add
router.post('/add', checkAdmin, async (req, res) => {
  try {
    const { name, email, phone, avatarUrl, universityId, role, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      avatarUrl,
      universityId,
      role,
      passwordHash,
      mustChangePassword: true,
      settings: { dailyEmail: true, notificationsOn: true }
    });

    await user.save();
    res.redirect('/manageUser/list');
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      res.status(400).send('Email หรือ University ID ซ้ำ');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการบันทึก');
    }
  }
});

// GET /manageUser/edit/:id
router.get('/edit/:id', checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('ไม่พบผู้ใช้');
    res.render('manageUser/editUser', { user, activeMenu: 'manageUser', currentUser: res.locals.currentUser });
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

// POST /manageUser/edit/:id
router.post('/edit/:id', checkAdmin, async (req, res) => {
  try {
    const { name, email, phone, avatarUrl, universityId, role, password, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('ไม่พบผู้ใช้');

    user.name = name;
    user.email = email;
    user.phone = phone;
    user.avatarUrl = avatarUrl;
    user.universityId = universityId;
    user.role = role;
    user.isActive = isActive === 'on';

    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
      user.mustChangePassword = false;
    }

    await user.save();
    res.redirect('/manageUser/list');
  } catch (err) {
    console.error(err);
    if (err.code === 11000) res.status(400).send('Email หรือ University ID ซ้ำ');
    else res.status(500).send('เกิดข้อผิดพลาดในการอัปเดต');
  }
});

// POST /manageUser/delete/:id
router.post('/delete/:id', checkAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/manageUser/list');
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดในการลบ');
  }
});

module.exports = router;
