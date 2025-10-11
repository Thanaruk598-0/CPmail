const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const {
  User,
  Form,
  FormTemplate,
  Course,
  Section,
} = require("../models");

// ------------------------------
// Helper
// ------------------------------
const loadStudentFull = (id) => {
  return User.findById(id)
    .populate({ path: "courses", populate: { path: "sections" } })
    .populate("sections");
};

// ------------------------------
// Dashboard
// ------------------------------
const getDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;

    const student = await User.findById(studentId)
      .populate("courses", "name courseId")
      .populate("sections", "name");

    // ✅ ใช้ createdAt และ populate title ให้ตรงสคีมา
    const recentForms = await Form.find({ submitter: studentId })
      .sort({ createdAt: -1 })
      .populate({ path: "template", select: "title" }) // <- FormTemplate.title
      .populate({ path: "course", select: "name" })
      .populate({ path: "section", select: "name" })
      .populate({ path: "reviewers", select: "name" }); // reviewers เป็น ObjectId เดี่ยว

    res.render("student/dashboard", {
      student,
      recentForms,
      activeMenu: "student"
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Server Error", error: err });
  }
};

// ------------------------------
// Profile (GET)
// ------------------------------
const getProfile = async (req, res) => {
  try {
    const student = await loadStudentFull(req.user._id);
    const allCourses = await Course.find().populate("sections");
    const canRegister = !(student.courses && student.courses.length > 0);

    res.render("student/profile", {
      student,
      allCourses,
      canRegister,
      message: null,
      error: null,
      activeMenu: "profile"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// ------------------------------
// อัปโหลดรูปโปรไฟล์ (POST)
// ------------------------------
const updateAvatar = async (req, res) => {
  try {
    const student = await User.findById(req.user._id);

    if (req.file) {
      const oldAvatar = student.avatarUrl;
      student.avatarUrl = `/uploads/${req.file.filename}`;

      if (oldAvatar && oldAvatar !== "/uploads/default.jpg") {
        const oldPath = path.join(
          __dirname,
          "..",
          "public",
          oldAvatar.replace(/^\//, "")
        );
        fs.unlink(oldPath, (err) => {
          if (err) console.log("⚠️ Failed to delete old avatar:", err);
        });
      }
      await student.save();
    }

    const studentFull = await loadStudentFull(req.user._id);
    const allCourses = await Course.find().populate("sections");
    const canRegister = !(studentFull.courses && studentFull.courses.length > 0);

    res.render("student/profile", {
      student: studentFull,
      allCourses,
      canRegister,
      message: "✅ Avatar updated successfully!",
      activeMenu: "profile",
      
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Failed to update avatar");
  }
};

// ------------------------------
// อัปเดตข้อมูลส่วนตัว (POST)
// ------------------------------
const updatePersonalInfo = async (req, res) => {
  try {
    const { name, email, phone, dateOfBirth, address } = req.body;
    const student = await User.findById(req.user._id);

    student.name = name?.trim();
    student.email = email?.trim().toLowerCase();
    student.phone = phone?.trim();
    student.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    student.address = address;

    await student.save();

    const studentFull = await loadStudentFull(req.user._id);
    const allCourses = await Course.find().populate("sections");
    const canRegister = !(studentFull.courses && studentFull.courses.length > 0);

    return res.render("student/profile", {
      student: studentFull,
      allCourses,
      canRegister,
      activeMenu: "profile",
      message: "Personal info updated!",
      error: null,
    });
  } catch (err) {
    console.error(err);
    const studentFull = await loadStudentFull(req.user._id);
    const allCourses = await Course.find().populate("sections");
    const canRegister = !(studentFull.courses && studentFull.courses.length > 0);

    let errorMsg = "Failed to update personal info";
    if (err?.code === 11000 && err?.keyPattern?.email) {
      errorMsg = "This email is already in use.";
    }
    return res.status(400).render("student/profile", {
      student: studentFull,
      allCourses,
      canRegister,
      message: null,
      error: errorMsg,
    });
  }
};

// ------------------------------
// อัปเดต Course & Section (ลงครั้งเดียวสำหรับ student)
// ------------------------------
const updateCourses = async (req, res) => {
  try {
    const student = await User.findById(req.user._id);

    if (
      student.role === "student" &&
      Array.isArray(student.courses) &&
      student.courses.length > 0
    ) {
      const studentFull = await loadStudentFull(student._id);
      const allCourses = await Course.find().populate("sections");
      return res.status(403).render("student/profile", {
        student: studentFull,
        allCourses,
        canRegister: false,
        activeMenu: "profile",
        message: null,
        error:
          "คุณได้ลงทะเบียนรายวิชาแล้ว หากต้องการแก้ไขโปรดติดต่อผู้ดูแลระบบ (Admin).",
      });
    }

    const { selectedCourses } = req.body;
    if (!selectedCourses) {
      const studentFull = await loadStudentFull(req.user._id);
      const allCourses = await Course.find().populate("sections");
      return res.status(400).render("student/profile", {
        student: studentFull,
        allCourses,
        canRegister: true,
        message: null,
        error: "กรุณาเลือกอย่างน้อย 1 รายวิชา",
      });
    }

    const courseIds = (
      Array.isArray(selectedCourses) ? selectedCourses : [selectedCourses]
    )
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    const rawSectionIds = [];
    for (const cId of courseIds) {
      const secId = req.body[`selectedSections_${cId.toString()}`];
      if (secId) rawSectionIds.push(new mongoose.Types.ObjectId(secId));
    }

    let sectionIds = [];
    if (rawSectionIds.length > 0) {
      const sections = await Section.find({
        _id: { $in: rawSectionIds },
      }).select("_id course");
      const courseIdStrs = courseIds.map((c) => c.toString());
      sectionIds = sections
        .filter(
          (sec) => sec.course && courseIdStrs.includes(sec.course.toString())
        )
        .map((sec) => sec._id);
    }

    student.courses = courseIds;
    student.sections = sectionIds;
    await student.save();

    if (sectionIds.length > 0) {
      await Section.updateMany(
        { _id: { $in: sectionIds } },
        { $addToSet: { students: student._id } }
      );
    }

    const studentWithCourses = await loadStudentFull(req.user._id);
    const allCoursesWithSections = await Course.find().populate("sections");

    return res.render("student/profile", {
      student: studentWithCourses,
      allCourses: allCoursesWithSections,
      canRegister: false,
      message: "ลงทะเบียนสำเร็จ! หากต้องการแก้ไขโปรดติดต่อผู้ดูแลระบบ (Admin).",
      activeMenu: "profile",
      error: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("❌ Failed to update courses & sections");
  }
};

// ------------------------------
// เปลี่ยนรหัสผ่าน (POST)
// ------------------------------
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user._id;

    const student = await User.findById(userId).select("+passwordHash");
    if (!student) throw new Error("User not found");

    const okOld = await bcrypt.compare(oldPassword, student.passwordHash || "");
    if (!okOld) throw new Error("Old password incorrect");
    if (newPassword !== confirmPassword)
      throw new Error("Passwords do not match");

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(newPassword)) {
      throw new Error(
        "Password must be at least 8 characters, include uppercase, lowercase, and a number"
      );
    }

    const sameAsOld = await bcrypt.compare(newPassword, student.passwordHash);
    if (sameAsOld)
      throw new Error("New password must be different from current password");

    const newHash = await bcrypt.hash(newPassword, 10);
    const updateResult = await User.updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash: newHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount !== 1)
      throw new Error("Password update not applied");

    if (typeof req.logout === "function") {
      try {
        await new Promise((resolve, reject) =>
          req.logout((err) => (err ? reject(err) : resolve()))
        );
      } catch (e) {
        console.error("Passport logout error:", e);
      }
    }

    req.session.destroy((err) => {
      if (err) console.error("Session destroy error:", err);
      res.clearCookie(process.env.SESSION_NAME || "connect.sid", { path: "/" });
      return res.redirect("/login?changed=1");
    });
  } catch (err) {
    console.error(err);

    const studentFullErr = await loadStudentFull(req.user._id);
    const allCourses = await Course.find().populate("sections");

    const fieldErrors = {};
    if (err.message === "Old password incorrect") {
      fieldErrors.oldPassword = "Current password incorrect";
    } else if (err.message === "Passwords do not match") {
      fieldErrors.confirmPassword = "Passwords do not match";
    } else if (err.message.startsWith("Password must be")) {
      fieldErrors.newPassword = err.message;
    } else if (
      err.message === "New password must be different from current password"
    ) {
      fieldErrors.newPassword = err.message;
    } else {
      fieldErrors.confirmPassword = "Something went wrong. Please try again.";
    }

    return res.status(400).render("student/profile", {
      student: studentFullErr,
      allCourses,
      canRegister: !(
        studentFullErr.courses && studentFullErr.courses.length > 0
      ),
      message: null,
      error: null,
      fieldErrors,
    });
  }
};

// ⛔ ใช้ 10 รายการต่อหน้าเสมอ
const PAGE_SIZE = 10;

// ------------------------------
// (แก้) Core ที่ใช้ทั้งหน้า EJS และ JSON
// ------------------------------
const buildFormHistoryData = async (studentId, query) => {
  const {
    q = "",
    status = "all",
    category = "all",
    from = "",
    to = "",
    page = 1,
    // limit = 10,   // ไม่ใช้แล้ว เราคุมด้วย PAGE_SIZE
  } = query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const pageSize = PAGE_SIZE; // ✅ ตายตัว 10

  // Summary
  const [totalAll, totalApproved, totalPending, totalRejected, totalCancelled] =
    await Promise.all([
      Form.countDocuments({ submitter: studentId }),
      Form.countDocuments({ submitter: studentId, status: "approved" }),
      Form.countDocuments({ submitter: studentId, status: "pending" }),
      Form.countDocuments({ submitter: studentId, status: "rejected" }),
      Form.countDocuments({ submitter: studentId, status: "cancelled" }),
    ]);

  const allCategories = await FormTemplate.distinct("category");

  // Base filters
  const baseMatch = { submitter: studentId };
  if (status && status !== "all") baseMatch.status = status;

  if (from) {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    baseMatch.createdAt = { ...(baseMatch.createdAt || {}), $gte: d };
  }
  if (to) {
    const start = new Date(to);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    baseMatch.updatedAt = { $gte: start, $lte: end };
  }

  if (category && category !== "all") {
    const tIds = await FormTemplate.find({ category }).select("_id").lean();
    const list = tIds.map((t) => t._id);
    if (list.length === 0) {
      return {
        totals: { all: totalAll, approved: totalApproved, pending: totalPending, rejected: totalRejected, cancelled: totalCancelled },
        items: [],
        filteredTotal: 0,
        pagination: { page: 1, pageSize, totalPages: 1 },
        filters: { q, status, category, from, to, page: 1, limit: pageSize },
        allCategories,
      };
    }
    baseMatch.template = { $in: list };
  }

  // tokenize
  const extractTokens = (text) =>
    (String(text || "").match(/[\p{L}\p{N}]+/gu) || []).map(s => s.trim()).filter(Boolean);
  const makeRegex = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const tokens = extractTokens(q);

  // Pre-query ids
  let extraOr = [];
  if (tokens.length > 0) {
    const andTitle = tokens.map(tk => ({ title: makeRegex(tk) }));
    const andName = tokens.map(tk => ({ name: makeRegex(tk) }));

    const matchedTemplates = await FormTemplate.find({ $and: andTitle }).select("_id").lean();
    if (matchedTemplates.length) extraOr.push({ template: { $in: matchedTemplates.map(d => d._id) } });

    const matchedUsers = await User.find({ $and: andName }).select("_id").lean();
    if (matchedUsers.length) extraOr.push({ reviewers: { $in: matchedUsers.map(d => d._id) } });

    const matchedCourses = await Course.find({ $and: andName }).select("_id").lean();
    if (matchedCourses.length) extraOr.push({ course: { $in: matchedCourses.map(d => d._id) } });

    const matchedSections = await Section.find({ $and: andName }).select("_id").lean();
    if (matchedSections.length) extraOr.push({ section: { $in: matchedSections.map(d => d._id) } });

    if (extraOr.length === 0) {
      return {
        totals: { all: totalAll, approved: totalApproved, pending: totalPending, rejected: totalRejected, cancelled: totalCancelled },
        items: [],
        filteredTotal: 0,
        pagination: { page: 1, pageSize, totalPages: 1 },
        filters: { q, status, category, from, to, page: 1, limit: pageSize },
        allCategories,
      };
    }
  }

  const finalMatch = { ...baseMatch };
  if (extraOr.length > 0) finalMatch.$or = extraOr;

  const [filteredTotal, rawItems] = await Promise.all([
    Form.countDocuments(finalMatch),
    Form.find(finalMatch)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .populate({ path: "template", select: "title category" })
      .populate({ path: "reviewers", select: "name email" })
      .populate({ path: "course", select: "name courseId" })
      .populate({ path: "section", select: "name" })
      .lean(),
  ]);

  const items = rawItems.map((doc) => {
    const created = doc.createdAt || null;
    const updated = doc.updatedAt || doc.reviewUpdatedAt || doc.reviewedAt || created || null;
    const template = doc.template || {};
    const name = template.name || template.title || "-";
    return {
      ...doc,
      template: { ...template, name },
      reviewer: doc.reviewer || doc.reviewers || null,
      createdAt: created,
      updatedAt: updated,
    };
  });

  return {
    totals: { all: totalAll, approved: totalApproved, pending: totalPending, rejected: totalRejected, cancelled: totalCancelled },
    items,
    filteredTotal,
    pagination: { page: pageNum, pageSize, totalPages: Math.max(Math.ceil(filteredTotal / pageSize), 1) },
    filters: { q, status, category, from, to, page: pageNum, limit: pageSize },
    allCategories,
  };
};

// หน้าเต็มครั้งแรก
const getFormHistory = async (req, res) => {
  try {
    const data = await buildFormHistoryData(req.user._id, req.query);
    return res.render("student/formhistory", {
      ...data,
      submitNewFormUrl: "/forms/submit",
      activeMenu: "formhistory"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).render("error", { message: "Server Error", error: err });
  }
};

// JSON สำหรับ realtime
const getFormHistoryData = async (req, res) => {
  try {
    const data = await buildFormHistoryData(req.user._id, req.query);
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
};

// ------------------------------
// ✅ หน้า “รายละเอียดฟอร์ม” (GET)
// ------------------------------
const getFormDetail = async (req, res) => {
  try {
    const studentId = req.user._id;
    const formId = req.query.id; // ดึงจาก query

    if (!formId) {
      return res.status(400).render("error", { message: "Missing form id", error: null });
    }

    const form = await Form.findOne({ _id: formId, submitter: studentId })
      .populate({ path: "template", select: "title category description fields" })
      .populate({ path: "reviewers", select: "name email" })
      .populate({ path: "course", select: "name courseId description credits semester" })
      .populate({ path: "section", select: "name" })
      .populate({ path: "submitter", select: "name email avatarUrl universityId major yearOfStudy" })
      .lean();

    if (!form) {
      return res.status(404).render("error", { message: "Form not found", error: null });
    }

    return res.render("student/formdetail", { form, useCleanPath: true, activeMenu: "formhistory" }); // flag ไว้
  } catch (err) {
    console.error(err);
    return res.status(500).render("error", { message: "Server Error", error: err });
  }
};

// ------------------------------
// ✅ อัปเดตข้อมูลฟอร์ม (บาง field เท่านั้น) (POST)
// อนุญาตแก้เฉพาะ field ใน template.fields ที่ locked !== true
// และเหตุผล (reason) ของผู้ยื่น
// ------------------------------
const postUpdateForm = async (req, res) => {
  try {
    const studentId = req.user._id;
    const formId = req.body.id;

    if (!formId) return res.status(400).render("error", { message: "Missing form id", error: null });

    const form = await Form.findOne({ _id: formId, submitter: studentId })
      .populate({ path: "template", select: "fields" });

    if (!form) {
      return res.status(404).render("error", { message: "Form not found", error: null });
    }

    const incomingData = req.body.data || {};
    const incomingReason = (req.body.reason || "").trim();

    const fields = Array.isArray(form.template?.fields) ? form.template.fields : [];
    const editableKeys = new Set(
      fields.filter(f => !f?.locked)
        .map(f => String(f?.name || f?.key || "").trim())
        .filter(Boolean)
    );

    const nextData = { ...(form.data || {}) };
    Object.keys(incomingData).forEach(k => {
      if (editableKeys.has(k)) nextData[k] = incomingData[k];
    });

    form.data = nextData;
    form.reason = incomingReason;
    await form.save();

    // กลับไป path สั้น + ทำ replaceState ในหน้า EJS
    return res.redirect(303, `/student/forms?id=${formId}&updated=1`);
  } catch (err) {
    console.error(err);
    return res.status(500).render("error", { message: "Server Error", error: err });
  }
};

// ------------------------------
// ✅ ยกเลิกฟอร์ม (POST) -> อัปเดต status = cancelled
// ------------------------------
const postCancelForm = async (req, res) => {
  try {
    const studentId = req.user._id;
    const formId = req.body.id;
    const cancelReason = (req.body.cancellationReason || "").trim();

    if (!formId) return res.status(400).render("error", { message: "Missing form id", error: null });

    const form = await Form.findOne({ _id: formId, submitter: studentId });
    if (!form) {
      return res.status(404).render("error", { message: "Form not found", error: null });
    }

    form.status = "cancelled";
    form.cancellationReason = cancelReason || form.cancellationReason || "Cancelled by submitter";
    form.reviewUpdatedAt = new Date();
    await form.save();

    return res.redirect(303, `/student/forms?id=${formId}&cancelled=1`);
  } catch (err) {
    console.error(err);
    return res.status(500).render("error", { message: "Server Error", error: err });
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateAvatar,
  updatePersonalInfo,
  updateCourses,
  changePassword,
  getFormHistory,
  getFormHistoryData,
  getFormDetail,            // ✅
  postUpdateForm,     // ✅
  postCancelForm,           // ✅
};
