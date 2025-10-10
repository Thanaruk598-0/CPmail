const express = require("express");
const router = express.Router();
const FormTemplate = require("../models/FormTemplate");

// แสดงหน้า Create
router.get("/", (req, res) => {
  res.render("admin/FormTemplates/CreateTemplates", { currentUser: req.user || null });
});

// บันทึก Template
router.post("/", async (req, res) => {
  try {
    const { title, description, category, status, allowedRoles, fields } = req.body;

    const newTemplate = new FormTemplate({
      title,
      description,
      category,
      status,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
      fields: fields ? JSON.parse(fields) : []
    });

    await newTemplate.save();
    res.redirect("/form-templates");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating template");
  }
});

module.exports = router;
