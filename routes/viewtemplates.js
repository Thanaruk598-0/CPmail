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
      .populate("template", "title category")
      .populate("reviewers", "name email role avatarUrl");

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

router.get("/view/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id)
      .populate("template")
      .populate("submitter")
      .populate("reviewers");
    if (!form) return res.status(404).send("Form not found");

    res.render("admin/Forms/viewform", {
      form,
      currentUser: req.user || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading form");
  }
});

// 👉 อนุมัติฟอร์ม
router.post("/:id/approve", async (req, res) => {
  try {
    const form = await Form.findByIdAndUpdate(
      req.params.id,
      { status: "approved", reviewedAt: new Date() },
      { new: true }
    );
    if (!form) return res.status(404).send("Form not found");
    res.redirect("/allteplaetes"); // กลับไปหน้ารวม
  } catch (err) {
    console.error(err);
    res.status(500).send("Error approving form");
  }
});

// 👉 ปฏิเสธฟอร์ม
router.post("/:id/reject", async (req, res) => {
  try {
    const form = await Form.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", reviewedAt: new Date() },
      { new: true }
    );
    if (!form) return res.status(404).send("Form not found");
    res.redirect("/allteplaetes"); // กลับไปหน้ารวม
  } catch (err) {
    console.error(err);
    res.status(500).send("Error rejecting form");
  }
});

module.exports = router;