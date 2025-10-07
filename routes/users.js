const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require('../models/User'); 

// หน้า Form Insert
router.get("/add", (req, res) => {
  res.render("addUser");
});

// บันทึกข้อมูล
router.post("/add", async (req, res) => {
  try {
    const { name, email, phone, avatarUrl, studentId, role, password } = req.body;

    // เข้ารหัสรหัสผ่าน
    const passwordHash = await bcrypt.hash(password, 10);

    // สร้าง User ใหม่
    const user = new User({
      name,
      email,
      phone,
      avatarUrl,
      studentId,
      role,
      passwordHash
    });

    await user.save();
    res.send("เพิ่มผู้ใช้งานเรียบร้อยแล้ว");
  } catch (err) {
    console.error(err);
    res.status(500).send("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
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

