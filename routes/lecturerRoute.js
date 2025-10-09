const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');

// Multer configuration
const AVATAR_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const uid = (req.session?.userId || req.user?.id || 'user').toString().replace(/[^a-zA-Z0-9-]/g, '');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uid}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const filetypes = ['.png', '.jpg', '.jpeg', '.webp'];
    const extname = filetypes.includes(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error('ชนิดไฟล์ไม่รองรับ (อนุญาต: png, jpg, jpeg, webp)'));
  }
});

// Middleware
const ensureAuthenticated = (req, res, next) => {
  if (!req.session?.userId && !res.locals?.currentUser?._id) {
    return res.redirect('/login');
  }
  next();
};

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const ensureString = (v) => (typeof v === 'string' ? v.trim() : '');

// GET /lecturer/profile
router.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.userId || res.locals?.currentUser?._id;
    const user = await User.findById(userId)
      .select('name email phone avatarUrl universityId dateOfBirth major address role')
      .lean();
    if (!user) return res.redirect('/login');

    res.render('lecturer/profile', {
      pageTitle: 'โปรไฟล์อาจารย์ - FormEase',
      activeMenu: 'profile',
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('lecturer/profile', {
      pageTitle: 'โปรไฟล์อาจารย์ - FormEase',
      activeMenu: 'profile',
      user: null,
      data: { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์' }
    });
  }
});

// POST /lecturer/profile/update
router.post('/profile/update', ensureAuthenticated, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.session?.userId || res.locals?.currentUser?._id;
    const { name, email, phone, universityId, dateOfBirth, major, address } = req.body;

    if (!name || !email || !universityId) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ, อีเมล, และรหัสประจำตัวมหาวิทยาลัย' });
    if (!isEmail(email)) return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });

    const user = await User.findById(userId).select('role');
    if ((user.role === 'student' || user.role === 'lecturer') && !major) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกสาขาวิชา' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.trim().toLowerCase() }, { universityId: universityId.trim() }],
      _id: { $ne: userId }
    });
    if (existingUser) return res.status(400).json({ success: false, message: 'อีเมลหรือรหัสประจำตัวมหาวิทยาลัยนี้มีอยู่แล้ว' });

    const updateData = {
      name: ensureString(name),
      email: ensureString(email).toLowerCase(),
      phone: ensureString(phone) || null,
      universityId: ensureString(universityId),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      major: ensureString(major) || null,
      address: ensureString(address) || null
    };

    if (req.file) updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true })
      .select('name email phone avatarUrl universityId dateOfBirth major address role');

    if (req.session) req.session.user = updatedUser;
    res.locals.currentUser = updatedUser;

    res.json({ success: true, message: 'บันทึกโปรไฟล์เรียบร้อย', avatarUrl: updatedUser.avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message || 'ไม่สามารถบันทึกโปรไฟล์ได้' });
  }
});

module.exports = router;
