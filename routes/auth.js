const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Announcement = require("../models/Announcement");
const User = require("../models/User");

const router = express.Router();

const { requireAuth, requireRole } = require("../middleware/authz");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,   // Gmail ของคุณ
    pass: process.env.EMAIL_PASS    // App password
  }
});

//register
// Register GET
router.get("/register", (req, res) => {
  res.render("register"); 
});
// Register POST
router.post("/register", async (req, res) => {
  try {
    const {
      universityId,
      name,
      email,
      dateOfBirth,
      yearOfStudy,
      major,
      password,
      confirmPassword
    } = req.body;

    if (password !== confirmPassword) {
      return res.send("❌ รหัสผ่านไม่ตรงกัน กรุณาลองอีกครั้ง");
    }
    if (!email.endsWith("@kkumail.com")) {
      return res.send("❌ อีเมลต้องลงท้ายด้วย @kkumail.com");
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.send("❌ อีเมลนี้ถูกใช้งานแล้ว");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      universityId,
      name,
      email,
      dateOfBirth,
      yearOfStudy,
      major,
      passwordHash,
      role: "student"   // ✅ กำหนดค่า role ทุกคนเป็น student
    });
    await newUser.save();

    res.redirect("/user/login");
  } catch (err) {
    console.error(err);
    res.send("❌ เกิดข้อผิดพลาดในการสมัคร โปรดลองอีกครั้ง");
  }
});

//login
// Login GET
router.get("/login", (req, res) => {
  res.render("login");
});
// Login POST
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.send("❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.send("❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    // login success → เก็บ session
    req.session.userId = user._id;
    req.session.userRole = user.role;

    console.log("Login Success:", email, "Role:", user.role);

    // ✅ Redirect ตาม role
    if (user.role === "admin") {
      return res.redirect("/profile/:id");
    } else if (user.role === "lecturer") {
      return res.redirect("/lecturer");
    } else {
      return res.redirect("/dashboard");
    }

  } catch (err) {
    console.error(err);
    res.send("❌ เกิดข้อผิดพลาดในการ Login");
  }
});
// Middleware ตรวจสอบการ login
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
}



router.get("/dashboard", requireAuth, async (req, res) => {
  const user = res.locals.currentUser;
  const now = new Date();

  const audienceOr = [
    { audience: { $exists: false } },
    { audience: { $size: 0 } },
    { audience: { $elemMatch: { type: "role", role: user.role } } },
  ];
  if (user.sections && user.sections.length) {
    audienceOr.push({
      audience: {
        $elemMatch: { type: "section", section: { $in: user.sections } },
      },
    });
  }

  const announcements = await Announcement.find({
    $and: [
      { $or: audienceOr },
    ],
  });

  res.render("dashboard", {
    user,
    notiCount: announcements.length,
  });
});





// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.send("ไม่สามารถออกจากระบบได้");
    }
    res.redirect("/home");
  });
});

// Forgot password GET
router.get("/forgot-password", (req, res) => {
  res.render("forgotpassword");
});

// Forgot password POST
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.send("❌ ไม่พบอีเมลนี้ในระบบ");

    // สร้าง token
    const token = crypto.randomBytes(20).toString("hex");

    // บันทึกลง DB
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 ชั่วโมง
    await user.save();

    // สร้างลิงก์ reset
    const resetUrl = `http://localhost:3000/reset-password/${token}`;

    // ส่งอีเมล
    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "CPmail - Reset Password",
      text: `คลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน: ${resetUrl}`
    });

    res.send("✅ ส่งลิงก์ reset password ไปที่อีเมลของคุณแล้ว");
  } catch (err) {
    console.error(err);
    res.send("❌ เกิดข้อผิดพลาด");
  }
});

// Reset password GET
router.get("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.send("❌ ลิงก์หมดอายุหรือไม่ถูกต้อง");

    res.render("resetpassword", { token: req.params.token });
  } catch (err) {
    console.error(err);
    res.send("❌ เกิดข้อผิดพลาด");
  }
});

// Reset password POST
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.send("❌ ลิงก์หมดอายุหรือไม่ถูกต้อง");

    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.send("❌ รหัสผ่านไม่ตรงกัน");
    }

    // hash password ใหม่
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send("✅ รีเซ็ตรหัสผ่านสำเร็จ! <a href='/login'>ไปที่ Login</a>");
  } catch (err) {
    console.error(err);
    res.send("❌ เกิดข้อผิดพลาด");
  }
});


router.get("/admin", requireRole("admin"), (req, res) => {
  res.render("admin");
});

router.get("/lecturer", requireRole(["lecturer", "admin"]), (req, res) => {
  res.render("lecturer");
});

module.exports = router;
