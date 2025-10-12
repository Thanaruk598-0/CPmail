// routes/viewtemplates.js
const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const checkAdmin = require('../middleware/checkAdmin');

// ✅ ลบ mockUser ใช้ req.session.user แทน

// GET /allteplaetes (main list)
router.get("/", checkAdmin, async (req, res) => {
  try {
    // ✅ เพิ่ม: Filter สำหรับ admin (เช่น status=pending)
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    // ดึงข้อมูลฟอร์มตาม filter
    const forms = await Form.find(filter)
      .populate("submitter", "name email role avatarUrl")
      .populate("template", "title category")
      .populate("reviewers", "name email role avatarUrl")
      .sort({ submittedAt: -1 });

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const totalPages = Math.ceil(forms.length / limit);
    const paginatedForms = forms.slice((page - 1) * limit, page * limit);

    res.render("admin/AllForms/ViewAllForm", {
      forms: paginatedForms,
      query: req.query,
      page,
      totalPages,
      currentUser: req.session.user  // ✅ ใช้ session
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
      currentUser: req.session.user || null,  // ✅ ใช้ session
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