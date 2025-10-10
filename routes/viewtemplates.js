// routes/viewtemplates.js
const express = require("express");
const router = express.Router();
const Form = require("../models/Form");

// Mock currentUser (ถ้ายังไม่มีระบบ login จริง)
const mockUser = {
  name: "Admin User",
  email: "admin@example.com",
  role: "admin",
  avatarUrl: "https://via.placeholder.com/32"
};

// GET /viewtemplates
router.get("/", async (req, res) => {
  try {
    // ดึงข้อมูลฟอร์มทั้งหมด
    const forms = await Form.find()
      .populate("submitter", "name email role avatarUrl")
      .populate("template", "title category");

    res.render("admin/AllForms/ViewAllForm", {
      forms,
      query: req.query,
      page: req.query.page || 1,
      totalPages: 1,
      currentUser: req.session.user || mockUser  // ✅ mock user ไว้ใช้
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
