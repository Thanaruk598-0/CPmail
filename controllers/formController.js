const mongoose = require("mongoose");
const { User, Course, Section, FormTemplate, Form } = require("../models");

// ฟังก์ชันฝั่งนักศึกษา: สร้างฟอร์ม 3 ขั้นตอน (Select Template -> Fill Details -> Preview & Submit)

// ------------------------------
// Helper ทั่วไป
// ------------------------------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const toId = (v) => new mongoose.Types.ObjectId(v);

// ดึง info นักศึกษาเต็ม ๆ (วิชา/เซคชัน)
async function loadStudentFull(userId) {
    return await User.findById(userId)
        .populate({ path: "courses", select: "name courseId lecturers sections", populate: { path: "sections" } })
        .populate({ path: "sections", select: "name course lecturers" });
}

// เลือก reviewer จาก targetRoles ของ template
async function getReviewerFor(tpl, courseDoc, sectionDoc) {
    const targets = tpl?.targetRoles || [];

    // รวมแอดมินทั้งหมด
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    const adminIds = admins.map(a => a._id);

    // หาอาจารย์จาก section ก่อน ถ้าไม่มีค่อยดูที่ course
    let lecturerIds = [];
    if (sectionDoc?.lecturers?.length) {
        lecturerIds = sectionDoc.lecturers.map(x => x._id ? x._id : x);
    } else if (courseDoc?.lecturers?.length) {
        lecturerIds = courseDoc.lecturers.map(x => x._id ? x._id : x);
    }

    // สร้างพูลผู้รับตาม targetRoles
    let pool = [];
    if (targets.includes("lecturer")) pool = pool.concat(lecturerIds);
    if (targets.includes("admin")) pool = pool.concat(adminIds);

    // ถ้าไม่มี targetRoles หรือไม่มีผู้รับในพูลเลย ให้ fallback = แอดมิน + อาจารย์ทั้งหมด
    if (pool.length === 0) {
        const allLecturers = await User.find({ role: "lecturer" }).select("_id").lean();
        pool = adminIds.concat(allLecturers.map(l => l._id));
    }

    return pool.length ? pick(pool) : null;
}

// ตรวจ role/สถานะของเทมเพลตก่อนใช้งาน
function canUseTemplate(tpl, userRole = "student") {
    if (!tpl) return false;
    if (tpl.status !== "Active") return false;
    if (Array.isArray(tpl.allowedRoles) && tpl.allowedRoles.length > 0) {
        return tpl.allowedRoles.includes(userRole);
    }
    return true; // ถ้าไม่กำหนด allowedRoles ถือว่าใครก็ยื่นได้ (ตามสิทธิ์ระบบ)
}

// ------------------------------
// STEP 1: Select Template (GET)
// - แสดง dropdown ประเภท (category)
// - เมื่อเลือกแล้ว แสดง dropdown ชื่อฟอร์ม (title) ตาม category
// - เมื่อเลือก templateId แล้ว -> กด ถัดไป ไป STEP 2
// ------------------------------
async function getSubmitStep1(req, res) {
    try {
        const categories = await FormTemplate.distinct("category", { status: "Active" });
        const selCategory = (req.query.category || "").trim();
        const selTemplateId = (req.query.templateId || "").trim();

        // ดึงลิสต์ฟอร์มตามหมวดหมู่ (Active เท่านั้น)
        let templates = [];
        if (selCategory) {
            templates = await FormTemplate.find({ category: selCategory, status: "Active" })
                .select("_id title description fields category targetRoles allowedRoles")
                .lean();
        }

        // template ที่เลือก (เพื่อโชว์รายละเอียด + เอกสารที่ต้องใช้: field type=file)
        let selectedTemplate = null;
        let requiredDocs = [];
        if (selTemplateId) {
            selectedTemplate = await FormTemplate.findById(selTemplateId).lean();
            if (selectedTemplate) {
                const files = (selectedTemplate.fields || []).filter(f => f?.type === "file");
                requiredDocs = files.map(f => ({
                    label: f?.label || "ไฟล์แนบ",
                    required: !!f?.required
                }));
            }
        }

        return res.render("student/selectform", {
            categories,
            selCategory,
            templates,
            selTemplateId,
            selectedTemplate,
            requiredDocs,
            activeMenu: "submit",
        });
    } catch (err) {
        console.error(err);
        return res.status(500).render("error", { message: "Server Error", error: err });
    }
}

// ------------------------------
// STEP 2: Form Details (GET/POST)
// - Auto-fill ข้อมูลส่วนตัวจาก User
// - เลือกรายวิชา (เฉพาะที่ลงทะเบียนไว้เท่านั้น)
// - เมื่อเลือกรายวิชาแล้ว โชว์ Section + รายชื่ออาจารย์ (ไม่ต้องให้เลือก)
// - แสดง field ตาม template.fields ให้กรอก
// - ปุ่ม: กลับไป STEP1 / ถัดไป -> STEP3 (Preview)
// ------------------------------
async function getSubmitStep2(req, res) {
    try {
        const studentId = req.user._id;
        const templateId = (req.query.templateId || req.body.templateId || "").trim();
        if (!templateId) return res.status(400).render("error", { message: "ขาด templateId", error: null });

        const tpl = await FormTemplate.findById(templateId).lean();
        if (!canUseTemplate(tpl, req.user.role)) {
            return res.status(403).render("error", { message: "Template นี้ไม่พร้อมใช้งานหรือสิทธิ์ไม่พอ", error: null });
        }

        const student = await loadStudentFull(studentId);

        // รายวิชาที่นักศึกษาลง (ไว้ทำ dropdown)
        const enrolledCourses = (student.courses || []).map(c => ({
            _id: c._id,
            name: c.name,
            courseId: c.courseId
        }));

        // อาจารย์/เซคชันจากวิชาที่เลือก (ถ้าเลือกมาแล้ว)
        const selCourseId = (req.query.courseId || req.body.courseId || "").trim();
        let selectedCourse = null;
        let selectedSection = null;
        let lecturers = [];

        if (selCourseId) {
            // หาว่านศ.คนนี้ลง section ไหนในวิชานี้
            selectedCourse = await Course.findById(selCourseId).select("_id name courseId lecturers").lean();
            const ownedSection = await Section.findOne({
                _id: { $in: (student.sections || []) },
                course: selCourseId
            }).select("_id name lecturers").lean();

            selectedSection = ownedSection || null;

            // เตรียมรายการอาจารย์ (จาก section ก่อน ถ้าไม่มีค่อย fallback ที่ course)
            if (selectedSection?.lecturers?.length) {
                lecturers = await User.find({ _id: { $in: selectedSection.lecturers } }).select("_id name email").lean();
            } else if (selectedCourse?.lecturers?.length) {
                lecturers = await User.find({ _id: { $in: selectedCourse.lecturers } }).select("_id name email").lean();
            }
        }

        // เตรียมฟิลด์ให้กรอก (เฉพาะฟิลด์ที่ type != 'readonly' หรือ locked !== true)
        const fields = Array.isArray(tpl.fields) ? tpl.fields : [];
        const inputFields = fields.filter(f => !f?.locked);

        return res.render("student/submitdetail", {
            template: tpl,
            student,
            enrolledCourses,
            selCourseId,
            selectedCourse,
            selectedSection,
            lecturers,
            inputFields,
            activeMenu: "submit",
        });
    } catch (err) {
        console.error(err);
        return res.status(500).render("error", { message: "Server Error", error: err });
    }
}

// ------------------------------
// STEP 3: Preview & Submit (POST->GET)
// - รับข้อมูลจาก STEP2 มาสรุป (ไม่บันทึก DB ยัง)
// - แสดงสรุป + ปุ่ม กลับ/ยกเลิก/ยืนยันส่ง
// ------------------------------
async function postPreview(req, res) {
    try {
        const studentId = req.user._id;

        const {
            templateId,
            courseId,
            // ฟิลด์ไดนามิกทั้งหมดจาก templates ส่งมาเป็น object: data[<key>] = value
        } = req.body;

        if (!templateId || !courseId) {
            return res.status(400).render("error", { message: "ข้อมูลไม่ครบ (templateId/courseId)", error: null });
        }

        const tpl = await FormTemplate.findById(templateId).lean();
        if (!canUseTemplate(tpl, req.user.role)) {
            return res.status(403).render("error", { message: "Template นี้ไม่พร้อมใช้งานหรือสิทธิ์ไม่พอ", error: null });
        }

        const student = await User.findById(studentId).select("name email universityId major").lean();
        const course = await Course.findById(courseId).select("name courseId lecturers").lean();
        const section = await Section.findOne({ _id: { $in: (req.user.sections || []) }, course: courseId }).select("_id name lecturers").lean();

        const reason = (req.body.reason || "").trim();

        // สกัด data จาก body โดยอ่านตาม label ของฟิลด์
        const fields = Array.isArray(tpl.fields) ? tpl.fields : [];
        const formData = {};
        for (const f of fields) {
            if (f?.locked) continue;
            const key = f?.name || f?.key || f?.label; // รองรับหลายเคสตั้งชื่อ
            if (!key) continue;
            formData[key] = req.body[`data_${key}`] ?? ""; // input ที่มาจาก name="data_<key>"
        }

        // เก็บไว้ render preview (ไม่พึ่ง session เพื่อความตรงไปตรงมา)
        return res.render("student/submitpreview", {
            template: tpl,
            student,
            course,
            section,
            formData,
            reason,
            activeMenu: "submit",
            // embed ไว้ใน form (hidden) สำหรับกดยืนยัน submit
            hidden: {
                templateId,
                courseId,
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).render("error", { message: "Server Error", error: err });
    }
}

// ------------------------------
// FINAL: Create (POST)
// - ยืนยันส่ง -> เข้าฐานข้อมูล Form (status: pending)
// - auto reviewers ตาม targetRoles
// - เสร็จแล้ว redirect กลับ Dashboard พร้อมข้อความสำเร็จ
// ------------------------------
async function postCreate(req, res) {
    try {
        const studentId = req.user._id;
        const { templateId, courseId } = req.body;

        if (!templateId || !courseId) {
            return res.status(400).render("error", { message: "ข้อมูลไม่ครบ (templateId/courseId)", error: null });
        }

        const tpl = await FormTemplate.findById(templateId).lean();
        if (!canUseTemplate(tpl, req.user.role)) {
            return res.status(403).render("error", { message: "Template นี้ไม่พร้อมใช้งานหรือสิทธิ์ไม่พอ", error: null });
        }

        const student = await loadStudentFull(studentId);
        const course = await Course.findById(courseId).select("_id name courseId lecturers").lean();
        const section = await Section.findOne({ _id: { $in: (student.sections || []) }, course: courseId })
            .select("_id name lecturers").lean();

        if (!course) {
            return res.status(400).render("error", { message: "ไม่พบรายวิชาที่เลือก", error: null });
        }
        if (!section) {
            return res.status(400).render("error", { message: "คุณยังไม่ได้ลงทะเบียนเซคชันในวิชานี้", error: null });
        }

        const reason = (req.body.reason || "").trim();

        // รวบรวม data จากฟอร์มอีกครั้ง (กันกรณีเรียก endpoint นี้ตรง ๆ)
        const fields = Array.isArray(tpl.fields) ? tpl.fields : [];
        const dataObj = {};
        for (const f of fields) {
            if (f?.locked) continue;
            const key = f?.name || f?.key || f?.label;
            if (!key) continue;
            dataObj[key] = req.body[`data_${key}`] ?? "";
        }

        // เลือก reviewer ตาม targetRoles
        const reviewerId = await getReviewerFor(tpl, course, section);

        // บันทึกลง collection Form
        await Form.create({
            submitter: studentId,
            template: tpl._id,
            course: course._id,
            section: section._id,
            data: dataObj,
            reason,
            status: "pending",
            reviewers: reviewerId || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // กลับหน้า Dashboard พร้อม query แจ้งสำเร็จ (ให้หน้า dashboard แสดง toast ได้)
        return res.redirect("/student?submitted=1");
    } catch (err) {
        console.error(err);
        return res.status(500).render("error", { message: "Server Error", error: err });
    }
}

module.exports = {
    getSubmitStep1,
    getSubmitStep2,
    postPreview,
    postCreate,
};
