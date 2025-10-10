// routes/formTemplates.js
const express = require("express");
const router = express.Router();
const FormTemplate = require("../models/FormTemplate");
const CATEGORY_LABELS_TH = require("./categoryLabels");

// 👉 helper functions
function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function parseFields(fieldsRaw) {
  if (!fieldsRaw) return [];
  try {
    return JSON.parse(fieldsRaw);
  } catch {
    return [];
  }
}


// 👉 list + search/filter
router.get("/", async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (category) filter.category = category;
    if (status) filter.status = status;

    const templates = await FormTemplate.find(filter).sort({ updatedAt: -1 });
    const rawCategories = await FormTemplate.distinct("category");

    // ✅ แปลง categories เป็น {value,label}
    const categories = rawCategories.map(c => ({
      value: c,
      label: CATEGORY_LABELS_TH[c] || c,
    }));

    res.render("admin/FormTemplates/ManageFormTemplates", {
      templates,
      categories,
      query: req.query,
      currentUser: req.user || null,
      labels: CATEGORY_LABELS_TH,  // ✅ ส่ง mapping ไปด้วย
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching templates");
  }
});


// 👉 create
router.get("/new", async (req, res) => {
  const templates = await FormTemplate.find().sort({ updatedAt: -1 });
  res.render("admin/FormTemplates/CreateTemplates", {
    currentUser: req.user || null,
    template: null,   // ✅ เพิ่มบรรทัดนี้
    templates,
  });
});
router.post("/", async (req, res) => {
  try {
    const { title, description, category, status, allowedRoles, fields } = req.body;
    const newTemplate = new FormTemplate({
      title,
      description: description || "",
      category,
      status: status || "Draft",
      allowedRoles: toArray(allowedRoles),
      fields: parseFields(fields),
    });
    await newTemplate.save();
    res.redirect("/form-templates");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating template");
  }
});

// 👉 เปิดหน้าแก้ไข
// 👉 edit/update
router.get("/:id/edit", async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).send("Template not found");

    res.render("admin/FormTemplates/CreateTemplates", {
      template,                 // ✅ ส่ง template จริงไป
      currentUser: req.user || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading edit page");
  }
});
// 👉 update template
router.post("/:id/update", async (req, res) => {
  try {
    const { title, description, category, status, allowedRoles, fields } = req.body;
    await FormTemplate.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description: description || "",
        category,
        status,
        allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
        fields: JSON.parse(fields || "[]"),
      },
      { runValidators: true }
    );
    res.redirect("/form-templates");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating template");
  }
});


// 👉 view template
router.get("/:id/view", async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).send("Template not found");

    res.render("admin/FormTemplates/ViewTemplates", {
      template,
      currentUser: req.user || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing template");
  }
});


// 👉 clone
router.post("/:id/clone", async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).send("Template not found");

    const clone = new FormTemplate({
      title: template.title + " (Copy)",
      description: template.description,
      category: template.category,
      status: "Draft",
      allowedRoles: template.allowedRoles,
      fields: template.fields,
    });

    await clone.save();
    res.redirect("/form-templates");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cloning template");
  }
});

// 👉 delete
router.post("/:id/delete", async (req, res) => {
  try {
    await FormTemplate.findByIdAndDelete(req.params.id);
    res.redirect("/form-templates");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting template");
  }
});

module.exports = router;
