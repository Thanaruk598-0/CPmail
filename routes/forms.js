// routes/forms.js
const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const FormTemplate = require("../models/FormTemplate");

// 👉 helper: date range filter
function getDateRange(range) {
  const now = new Date();
  let start, end;
  switch (range) {
    case "today":
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      return { $gte: start, $lte: end };
    case "thisWeek":
      start = new Date();
      start.setDate(start.getDate() - start.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setDate(start.getDate() + 6); // Saturday
      end.setHours(23, 59, 59, 999);
      return { $gte: start, $lte: end };
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { $gte: start, $lte: end };
    case "thisYear":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { $gte: start, $lte: end };
    default:
      return null;
  }
}

// 👉 View All Forms (with search + filter)
router.get("/", async (req, res) => {
  try {
    const { search, status, type, priority, dateRange } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { reason: { $regex: search, $options: "i" } },
        { "data.name": { $regex: search, $options: "i" } }, // เผื่อมี field name
      ];
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (dateRange && dateRange !== "all") {
      const dr = getDateRange(dateRange);
      if (dr) filter.submittedAt = dr;
    }

    const forms = await Form.find(filter)
      .populate("template")
      .populate("submitter")
      .sort({ submittedAt: -1 });

    res.render("admin/AllForms/ViewAllForm", {
      forms,
      currentUser: req.user || null,
      query: req.query,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching forms");
  }
});

// 👉 Student ดู Template ที่ Available
router.get("/available", async (req, res) => {
  try {
    const templates = await FormTemplate.find({ status: "Active" });
    res.render("admin/Forms/ListTemplates", {
      templates,
      currentUser: req.user || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching form templates");
  }
});

// 👉 Student กดเลือก template เพื่อกรอกฟอร์ม
router.get("/new/:templateId", async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.templateId);
    if (!template) return res.status(404).send("Template not found");

    res.render("admin/Forms/SubmitForm", {
      template,
      currentUser: req.user || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading form page");
  }
});

// 👉 Student ส่งฟอร์ม
router.post("/", async (req, res) => {
  try {
    const { templateId, data, reason, priority } = req.body;

    const form = await Form.create({
      submitter: req.user?._id || req.body.submitterId,
      template: templateId,
      data: typeof data === "string" ? JSON.parse(data) : data,
      reason: reason || "",
      priority: priority || "medium",
      status: "pending",
    });

    res.redirect(`/forms/view/${form._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting form");
  }
});

// 👉 View ฟอร์มที่ส่งไปแล้ว
router.get("/view/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id)
      .populate("template")
      .populate("submitter");
    if (!form) return res.status(404).send("Form not found");

    res.render("admin/Forms/ViewForm", {
      form,
      currentUser: req.user || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading form");
  }
});

// 👉 ลบหลายฟอร์มพร้อมกัน (Bulk Delete)
router.post("/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
      return res.redirect("/forms");
    }
    await Form.deleteMany({ _id: { $in: ids } });
    res.redirect("/forms");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting forms");
  }
});

module.exports = router;
