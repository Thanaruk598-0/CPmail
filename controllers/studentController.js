const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const {
  User,
  Form,
  FormTemplate,
  Notification,
  Announcement,
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

    const notifications = await Notification.find({ user: studentId })
      .sort({ createdAt: -1 })
      .limit(6)
      .select("_id message link read createdAt");

    const sectionIds = (student.sections || []).map((s) => s._id || s);
    const announcements = await Announcement.find({
      $or: [
        { "audience.role": "student" },
        { "audience.section": { $in: sectionIds } },
      ],
      expiresAt: { $gte: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("student/dashboard", {
      student,
      recentForms,
      notifications,
      announcements,
      renderServerData: true,
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
      error: null,
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

// ------------------------------
// Form History (GET)
// ------------------------------
const getFormHistory = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { q = "", status = "all", from = "", to = "", page = 1, limit = 10 } =
      req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    // ---- Summary (ไม่ติดฟิล्टर)
    const [totalAll, totalApproved, totalPending, totalRejected, totalCancelled] =
      await Promise.all([
        Form.countDocuments({ submitter: studentId }),
        Form.countDocuments({ submitter: studentId, status: "approved" }),
        Form.countDocuments({ submitter: studentId, status: "pending" }),
        Form.countDocuments({ submitter: studentId, status: "rejected" }),
        Form.countDocuments({ submitter: studentId, status: "cancelled" }),
      ]);

    // ---- Base filters
    const baseMatch = { submitter: studentId };
    if (status && status !== "all") baseMatch.status = status;

    // From Date = createdAt >= startOfDay(from)
    if (from) {
      const d = new Date(from);
      d.setHours(0, 0, 0, 0);
      baseMatch.createdAt = { ...(baseMatch.createdAt || {}), $gte: d };
    }

    // ✅ To Date = updatedAt เฉพาะ "วันนั้น" (startOfDay..endOfDay)
    if (to) {
      const start = new Date(to);
      start.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      baseMatch.updatedAt = { $gte: start, $lte: end };
    }

    // ---- Fetch
    let filteredTotal = 0;
    let rawItems = [];

    // ถ้าไม่มี q -> ใช้ find()+populate() (เร็วและเสถียร)
    if (!q || q.trim() === "") {
      filteredTotal = await Form.countDocuments(baseMatch);

      rawItems = await Form.find(baseMatch)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .populate({ path: "template", select: "title" }) // ใช้ title
        .populate({ path: "reviewers", select: "name email" })
        .populate({ path: "course", select: "name courseId" })
        .populate({ path: "section", select: "name" })
        .lean();
    } else {
      // มี q -> ใช้ aggregate เพื่อค้นข้ามคอลเลกชัน
      const FT = FormTemplate.collection.name;
      const U = User.collection.name;
      const C = Course.collection.name;
      const S = Section.collection.name;

      const regex = new RegExp(q.trim(), "i");
      const pipeline = [
        { $match: baseMatch },

        { $lookup: { from: FT, localField: "template", foreignField: "_id", as: "template" } },
        { $unwind: { path: "$template", preserveNullAndEmptyArrays: true } },

        // reviewers: ObjectId เดี่ยว -> วางลงฟิลด์ reviewer
        { $lookup: { from: U, localField: "reviewers", foreignField: "_id", as: "reviewer" } },
        { $unwind: { path: "$reviewer", preserveNullAndEmptyArrays: true } },

        { $lookup: { from: C, localField: "course", foreignField: "_id", as: "course" } },
        { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },

        { $lookup: { from: S, localField: "section", foreignField: "_id", as: "section" } },
        { $unwind: { path: "$section", preserveNullAndEmptyArrays: true } },

        // ✅ ค้นหา title (เดิม name ไม่ตรงสคีมา)
        {
          $match: {
            $or: [
              { "template.title": regex },
              { "course.name": regex },
              { "section.name": regex },
              { "reviewer.name": regex },
            ],
          },
        },
      ];

      const countRes = await Form.aggregate([...pipeline, { $count: "count" }]);
      filteredTotal = countRes.length ? countRes[0].count : 0;

      rawItems = await Form.aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: (pageNum - 1) * pageSize },
        { $limit: pageSize },
        {
          $project: {
            _id: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            reviewedAt: 1,
            reviewUpdatedAt: 1,
            reviewComment: 1,
            reason: 1,
            cancellationReason: 1,

            template: { _id: "$template._id", title: "$template.title" },
            course: { _id: "$course._id", name: "$course.name", courseId: "$course.courseId" },
            section: { _id: "$section._id", name: "$section.name" },
            reviewer: { _id: "$reviewer._id", name: "$reviewer.name", email: "$reviewer.email" },
          },
        },
      ]);
    }

    // ---- Normalize ให้ view ใช้ template.name ได้เสมอ
    const items = rawItems.map((doc) => {
      const created = doc.createdAt || null;
      const updated = doc.updatedAt || doc.reviewUpdatedAt || doc.reviewedAt || created || null;
      const template = doc.template || {};
      const name = template.name || template.title || "-";
      return {
        ...doc,
        template: { ...template, name }, // inject name จาก title
        reviewer: doc.reviewer || doc.reviewers || null,
        createdAt: created,
        updatedAt: updated,
      };
    });

    const filters = { q, status, from, to, page: pageNum, limit: pageSize };

    return res.render("student/formhistory", {
      totals: {
        all: totalAll,
        approved: totalApproved,
        pending: totalPending,
        rejected: totalRejected,
        cancelled: totalCancelled,
      },
      items,
      filteredTotal,
      pagination: {
        page: pageNum,
        pageSize,
        totalPages: Math.max(Math.ceil(filteredTotal / pageSize), 1),
      },
      filters,
      submitNewFormUrl: "/forms/submit",
    });
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
};
