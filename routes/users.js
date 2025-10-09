const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require('../models/User'); 

router.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

// เพิ่มผู้ใช้งานใหม่
router.post("/add", async (req, res) => {
  try {
    const { name, email, phone, avatarUrl, studentId, role, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("register", { error: "รหัสผ่านไม่ตรงกัน", success: null });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      avatarUrl,
      universityId: studentId, 
      role: "student",
      passwordHash,
    });

    await user.save(); 

    res.render("register", { success: "เพิ่มผู้ใช้งานเรียบร้อยแล้ว", error: null });
  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.render("register", { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล", success: null });
  }
});

router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("profile", { user , activeMenu: "profile"});
  } catch (err) {
    console.error(err);
    res.status(500).send("เกิดข้อผิดพลาด");
  }
});

module.exports = router;

