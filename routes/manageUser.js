const express = require("express");
const bcrypt = require("bcryptjs");
const User = require('../models/User'); 
const checkAdmin = require('../middleware/checkAdmin'); // เพิ่ม import นี้
const router = express.Router();


// GET /manageUser/list - แสดงรายชื่อ users พร้อม search/filter
// GET /manageUser/list - แสดงรายชื่อ users พร้อม search/filter และ stats
router.get('/list', checkAdmin, async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    // Search: ชื่อหรือ email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role && role !== 'all') {
      query.role = role;
    }

    // Filter by status
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    // Query Stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const lecturers = await User.countDocuments({ role: 'lecturer' });
    const pending = await User.countDocuments({ mustChangePassword: true });

    res.render('manageUser/list', { 
      users, 
      search, 
      role: role || 'all', 
      status: status || 'all',
      activeMenu: 'manageUser',
      currentUser: res.locals.currentUser,
      stats: { totalUsers, activeUsers, lecturers, pending } // ส่ง stats ไป view
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
  }
});

// GET /manageUser/add - หน้าเพิ่ม user
router.get('/add', checkAdmin, (req, res) => {
  res.render('manageUser/addUser', { activeMenu: 'manageUser', currentUser: res.locals.currentUser });
});

// POST /manageUser/add - บันทึก user ใหม่
router.post('/add', checkAdmin, async (req, res) => {
  try {
    const { name, email, phone, avatarUrl, studentId, role, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      avatarUrl,
      studentId,
      role,
      passwordHash,
      mustChangePassword: true, // Default สำหรับ user ใหม่
      settings: { dailyEmail: true, notificationsOn: true } // Default
    });

    await user.save();
    res.redirect('/manageUser/list');
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      res.status(400).send('Email หรือ Student ID ซ้ำ');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการบันทึก');
    }
  }
});

// GET /manageUser/edit/:id - หน้าแก้ไข user
router.get('/edit/:id', checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('ไม่พบผู้ใช้');
    }
    res.render('manageUser/editUser', { user, activeMenu: 'manageUser', currentUser: res.locals.currentUser });
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

// POST /manageUser/edit/:id - อัปเดต user
router.post('/edit/:id', checkAdmin, async (req, res) => {
  try {
    const { name, email, phone, avatarUrl, studentId, role, password, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('ไม่พบผู้ใช้');
    }

    // อัปเดต fields
    user.name = name;
    user.email = email;
    user.phone = phone;
    user.avatarUrl = avatarUrl;
    user.studentId = studentId;
    user.role = role;
    user.isActive = isActive === 'on'; // Checkbox

    // ถ้ามี password ใหม่ค่อย hash
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
      user.mustChangePassword = false; // ถ้า admin เปลี่ยนแล้ว ไม่ต้องเปลี่ยนอีก
    }

    await user.save();
    res.redirect('/manageUser/list');
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      res.status(400).send('Email หรือ Student ID ซ้ำ');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการอัปเดต');
    }
  }
});

// POST /manageUser/delete/:id - ลบ user
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