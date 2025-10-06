const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authz");

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

    res.send("✅ สมัครสมาชิกสำเร็จ! <a href='/login'>ไปที่ Login</a>");
  } catch (err) {
    console.error(err);
    res.send("❌ เกิดข้อผิดพลาดในการสมัคร โปรดลองอีกครั้ง");
  }
});


// Login GET
router.get("/login", (req, res) => {
  res.render("login");
});

// Login POST
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
      return res.redirect("/admin");
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
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// Dashboard
router.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.render("dashboard", { user: res.locals.currentUser });
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
router.get("/forgotpassword", (req, res) => {
  res.render("forgotpassword");
});

// Forgot password POST (mock)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.send("❌ ไม่พบอีเมลนี้ในระบบ");
    }

    // TODO: ทำระบบส่งลิงก์ reset password จริง
    console.log(`Password reset link sent to: ${email}`);
    res.send("✅ ระบบได้ส่งลิงก์ reset password ไปที่อีเมลของคุณแล้ว");
  } catch (err) {
    console.error(err);
    res.send("❌ เกิดข้อผิดพลาด");
  }
});

router.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard"); // มี res.locals.currentUser พร้อมใช้
});

router.get("/admin", requireRole("admin"), (req, res) => {
  res.render("admin");
});

router.get("/lecturer", requireRole(["lecturer", "admin"]), (req, res) => {
  res.render("lecturer");
});

module.exports = router;
