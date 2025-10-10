const express = require("express");
const router = express.Router();
const FormTemplate = require("../models/FormTemplate");
const CATEGORY_LABELS_TH = require("./categoryLabels");
const checkAdmin = require("../middleware/checkAdmin"); 

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
router.get("/", checkAdmin, async (req, res) => {
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

    const categories = rawCategories.map(c => ({
      value: c,
      label: CATEGORY_LABELS_TH[c] || c,
    }));

    res.render("admin/FormTemplates/ManageFormTemplates", {
      templates,
      categories,
      query: req.query,
      currentUser: req.user || null,
      labels: CATEGORY_LABELS_TH,
      activeMenu: 'manageTemplates'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching templates");
  }
});

// 👉 create
router.get("/new", checkAdmin, async (req, res) => {
  const templates = await FormTemplate.find().sort({ updatedAt: -1 });
  res.render("admin/FormTemplates/CreateTemplates", {
    currentUser: req.user || null,
    template: null,
    templates,
    activeMenu: 'manageTemplates'
  });
});

router.post("/", checkAdmin, async (req, res) => {
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

// 👉 edit/update
router.get("/:id/edit", checkAdmin, async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).send("Template not found");

    res.render("admin/FormTemplates/CreateTemplates", {
      template,
      currentUser: req.user || null,
      activeMenu: 'manageTemplates'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading edit page");
  }
});

router.post("/:id/update", checkAdmin, async (req, res) => {
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

// 👉 view
router.get("/:id/view", checkAdmin, async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).send("Template not found");

    res.render("admin/FormTemplates/ViewTemplates", {
      template,
      currentUser: req.user || null,
      activeMenu: 'manageTemplates'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing template");
  }
});

// 👉 clone
router.post("/:id/clone", checkAdmin, async (req, res) => {
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
router.post("/:id/delete", checkAdmin, async (req, res) => {
  try {
    await FormTemplate.findByIdAndDelete(req.params.id);
    res.redirect("/form-templates");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting template");
  }
});

module.exports = router;
