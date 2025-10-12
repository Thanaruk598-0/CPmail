// routes/review.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Form = require('../../models/Form');
const FormTemplate = require('../../models/FormTemplate'); 
require('../../models/User');     
require('../../models/Course');
require('../../models/Section');
const Notification = require('../../models/Notification');  // ✅ สำหรับแจ้งเตือน
const checkLecturer = require('../../middleware/checkLecturer');  // เพิ่ม middleware ถ้ามี

/* ---------- helpers ---------- */
const isObjId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
const asThaiYear = (v) => (Number.isFinite(+v) ? `ชั้นปีที่ ${+v}` : (v || ''));
const pickRequestText = (data = {}) =>
  data?.requestText || data?.reason || data?.message || data?.description || '';

/** แปลงเอกสาร Form จาก DB → โครงที่ review-form.ejs ใช้ */
function toViewModel(doc) {
  const stu = doc.submitter || {};
  const c = doc.course || {};
  const s = doc.section || {};
  const tmpl = doc.template || {};  // มี title / category / status อยู่ในนี้

  const student = {
    name: stu.name || '-',
    email: stu.email || '-',
    studentId: stu.universityId || '-',  // ✅ universityId
    program: stu.major || '-',
    year: asThaiYear(stu.yearOfStudy),
  };

  const course = {
    code: c.courseId || '-',  // ✅ courseId
    name: c.name || '-',
    section: s.name || '-',
    credits: c.credits || '-',
  };

  const submittedAt = doc.submittedAt || doc.createdAt || new Date();
  const reviewerName =
    (Array.isArray(doc.reviewers) && doc.reviewers[0]?.name) || 'ผู้ตรวจ';

  // แก้: Fallback assignedAt เป็น submittedAt ถ้าไม่มี
  const assignedAt = doc.assignedAt || submittedAt;

  const timeline = [
    { label: 'ส่งคำร้องแล้ว', by: student.name || 'นักศึกษา', time: submittedAt.toLocaleString('th-TH') },
    { label: 'มอบหมายให้ตรวจ', by: reviewerName, time: new Date(assignedAt).toLocaleString('th-TH') },
    {
      label:
        doc.status === 'approved' ? 'อนุมัติแล้ว' :
          doc.status === 'rejected' ? 'ไม่อนุมัติ' :
            doc.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'อยู่ระหว่างตรวจสอบ',
      by: 'สถานะปัจจุบัน',
      time: (doc.updatedAt ? new Date(doc.updatedAt) : new Date()).toLocaleString('th-TH'),
      active: !['approved', 'rejected', 'cancelled'].includes(doc.status),
    },
  ];

  // ส่งก้อน template ให้ .ejs ใช้งานได้สะดวก
  const template = {
    title: tmpl.title || '-',
    description: translateDescription(tmpl.description) || '-',
    category: translateCategory(tmpl.category) || '-',
    status: tmpl.status || '-',  // ✅ status ตัวเล็ก
  };

  return {
    id: String(doc._id),
    student,
    course,
    submittedAt,
    formType: template.title,
    template,
    requestText: pickRequestText(doc.data) || doc.reason || '-',
    timeline,
    status:
      (doc.status === 'pending' && 'รอตรวจ') ||
      (doc.status === 'approved' && 'อนุมัติแล้ว') ||
      (doc.status === 'rejected' && 'ไม่อนุมัติ') ||
      (doc.status === 'cancelled' && 'ยกเลิกแล้ว') ||
      'กำลังตรวจสอบ',
  };
}

/* ---------- core query ---------- */
async function fetchFormById(id) {
  return Form.findById(id)
    .populate('submitter', 'name email universityId major yearOfStudy')  // ✅ universityId
    .populate('template', 'title description category status')  // ✅ status ตัวเล็ก
    .populate('course', 'courseId name credits')  // ✅ courseId
    .populate('section', 'name')
    .populate('reviewers', 'name')
    .lean();
}

function translateCategory(category) {
  if (!category) return '';

  const map = {
    'Administrative': 'งานธุรการ',
    'Request': 'คำร้อง',
    'Academic': 'วิชาการ',
    'Leave': 'การลา',
    'Other': 'อื่น ๆ'
  };

  return map[category] || category;
}

function translateDescription(desc) {
  if (!desc) return '';
  // ✅ ใส่ mapping ได้เลย ถ้ามีหลายแบบก็ขยายเพิ่ม
  if (desc === 'Request to resign/withdraw from course or activity.') {
    return 'คำร้องขอลาออก/ถอนรายวิชา หรือกิจกรรม';
  }
  return desc;
}

router.get('/forms/:id/review', checkLecturer, async (req, res, next) => {  // เพิ่ม middleware
  try {
    const { id } = req.params;
    if (!isObjId(id)) return res.status(400).send('รหัสคำร้องไม่ถูกต้อง');

    const doc = await fetchFormById(id);
    if (!doc) return res.status(404).send('ไม่พบคำร้องในระบบ');

    return res.render('lecturer/review-form', { 
      form: toViewModel(doc),
      activeMenu: 'formHistory',  // สำหรับ navbar
      currentUser: req.user  // สำหรับ navbar
    });
  } catch (err) { next(err); }
});

/* ========== /lecturer/review ==========
   รองรับ 3 โหมด: ... (ไม่เปลี่ยน)
========================================= */
router.get('/', checkLecturer, async (req, res, next) => {  // เปลี่ยนจาก '/review' เป็น '/' เพื่อ match mount
  try {
    const { id, category, tstatus } = req.query;

    // 1) ระบุ formId โดยตรง
    if (id) {
      if (!isObjId(id)) return res.status(400).send('รหัสคำร้องไม่ถูกต้อง');
      const doc = await fetchFormById(id);
      if (!doc) return res.status(404).send('ไม่พบคำร้องในระบบ');
      return res.render('lecturer/review-form', { 
        form: toViewModel(doc),
        activeMenu: 'formHistory',
        currentUser: req.user
      });
    }

    // 2) มีตัวกรองเทมเพลต → หา template ids ก่อน แล้วค่อยหา form ล่าสุดที่ใช้ template เหล่านั้น
    let formFilter = {};
    if (category || tstatus) {
      const tmplFilter = {};
      if (category) tmplFilter.category = category;
      if (tstatus) tmplFilter.status = tstatus;  // ✅ status ตัวเล็ก
      const tmplIds = await FormTemplate.find(tmplFilter).select('_id').lean();
      if (!tmplIds.length) {
        return res.status(404).send(`ไม่พบเทมเพลตที่ตรงกับ category="${category || '-'}" และ status="${tstatus || '-'}"`);
      }
      formFilter.template = { $in: tmplIds.map(t => t._id) };
    }

    // หาเอกสาร "ล่าสุด" ตาม filter (หรือทั้งหมดถ้าไม่กรอง)
    const latest = await Form.findOne(formFilter).sort({ submittedAt: -1, createdAt: -1 }).lean();
    if (!latest) return res.status(404).send('ยังไม่มีคำร้องในระบบ');

    const doc = await fetchFormById(latest._id);
    return res.render('lecturer/review-form', { 
      form: toViewModel(doc),
      activeMenu: 'formHistory',
      currentUser: req.user
    });
  } catch (err) {
    next(err);
  }
});

/* ====== [APPEND] Review actions: approve / reject / save feedback ====== */

// หยิบผู้รีวิวปัจจุบัน (จาก res.locals.currentUser ถ้าไม่มีให้ใส่ชื่อทั่วไป)
function currentReviewer(req, res) {
  const u = res.locals?.currentUser || req.user || {};
  return {
    _id: u._id || null,
    name: u.name || u.fullName || u.username || 'ผู้ตรวจ',
    email: u.email || null,
  };
}

// utility: สร้าง payload feedback
function buildFeedbackPayload(body, reviewer) {
  const type = (body.feedbackType || body.type || 'general').toString();
  const text = (body.comments || body.comment || body.note || '').toString().trim();
  const notify = !!(body.notify === true || body.notify === 'true' || body.notify === 'on');
  const followUp = !!(body.followUp === true || body.followUp === 'true' || body.followUp === 'on');

  return {
    type,
    text,
    notify,
    followUp,
    by: { id: reviewer._id, name: reviewer.name, email: reviewer.email || null },
    at: new Date()
  };
}

// เขียน feedback และอัปเดตสถานะ (ถ้าส่งมา)
async function writeReviewAction({ formId, status, feedback }) {
  const update = {
    $set: {
      updatedAt: new Date(),
    },
  };

  // บันทึกความคิดเห็นล่าสุด
  if (feedback?.text) {
    update.$set.reviewComment = feedback.text;
    update.$set.lastFeedback = { ...feedback }; // optional สำหรับแสดงใน list/summary
  }

  // เปลี่ยนสถานะถ้ามีการส่งเข้ามา
  if (status === 'approved' || status === 'rejected') {
    update.$set.status = status;
    update.$set.reviewedAt = new Date();
  }

  // อัปเดตเอกสาร
  const doc = await Form.findByIdAndUpdate(formId, update, { new: true });
  if (!doc) throw new Error('ไม่พบคำร้องในระบบ'); // ป้องกัน HTTP 404
  return doc;
}

/* ---- POST /forms/:id/feedback (เปลี่ยน path, เพิ่ม checkLecturer) ---- */
router.post('/forms/:id/feedback', checkLecturer, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjId(id)) return res.status(400).json({ success: false, message: 'รหัสคำร้องไม่ถูกต้อง' });

    const base = await Form.findById(id).select('_id').lean();
    if (!base) return res.status(404).json({ success: false, message: 'ไม่พบคำร้องในระบบ' });

    const reviewer = currentReviewer(req, res);
    const feedback = buildFeedbackPayload(req.body || {}, reviewer);
    const saved = await writeReviewAction({ formId: id, status: null, feedback });

    return res.json({ success: true, message: 'บันทึกความเห็นเรียบร้อย', formId: id, status: saved.status });
  } catch (err) { next(err); }
});

/* ---- POST /forms/:id/approve (เปลี่ยน path, เพิ่ม populate template, checkLecturer) ---- */
router.post('/forms/:id/approve', checkLecturer, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjId(id)) return res.status(400).json({ success: false, message: 'รหัสคำร้องไม่ถูกต้อง' });

    // เพิ่ม populate สำหรับ template.title
    const base = await Form.findById(id)
      .select('_id status submitter')
      .populate('template', 'title')
      .populate('submitter', '_id')  // สำหรับ notification
      .lean();
    if (!base) return res.status(404).json({ success: false, message: 'ไม่พบคำร้องในระบบ' });

    const reviewer = currentReviewer(req, res);
    const feedback = buildFeedbackPayload(req.body || {}, reviewer);
    const saved = await writeReviewAction({ formId: id, status: 'approved', feedback });

    // ✅ เพิ่ม: ส่ง notification
    await Notification.create({
      user: base.submitter._id,
      type: 'form',
      message: `ฟอร์มของคุณ "${base.template?.title}" ถูกอนุมัติแล้ว`,
      read: false,
      link: `/student/forms/${id}`
    });

    return res.json({ success: true, message: 'อนุมัติคำร้องเรียบร้อย', formId: id, status: saved.status });
  } catch (err) { next(err); }
});

router.post('/forms/:id/reject', checkLecturer, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjId(id)) return res.status(400).json({ success: false, message: 'รหัสคำร้องไม่ถูกต้อง' });

    // เพิ่ม populate สำหรับ template.title
    const base = await Form.findById(id)
      .select('_id status submitter')
      .populate('template', 'title')
      .populate('submitter', '_id')  // สำหรับ notification
      .lean();
    if (!base) return res.status(404).json({ success: false, message: 'ไม่พบคำร้องในระบบ' });

    const reviewer = currentReviewer(req, res);
    const feedback = buildFeedbackPayload(req.body || {}, reviewer);
    const saved = await writeReviewAction({ formId: id, status: 'rejected', feedback });

    // ✅ เพิ่ม: ส่ง notification
    await Notification.create({
      user: base.submitter._id,
      type: 'form',
      message: `ฟอร์มของคุณ "${base.template?.title}" ถูกปฏิเสธแล้ว`,
      read: false,
      link: `/student/forms/${id}`
    });

    return res.json({ success: true, message: 'บันทึกสถานะไม่อนุมัติเรียบร้อย', formId: id, status: saved.status });
  } catch (err) { next(err); }
});

/* ====== [APPEND] ดึงรายการเทมเพลตเฉพาะฟิลด์ (ภาษาไทย) ====== 
   (ไม่เปลี่ยน)
=============================================================== */
router.get('/form-templates/summary', async (req, res, next) => {
  try {
    // รองรับตัวกรองเพิ่มเติมแบบ optional: ?category=...&status=active
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;  // ✅ status ตัวเล็ก

    // ดึงเฉพาะ 3 ฟิลด์จาก MongoDB
    const rows = await FormTemplate
      .find(filter)
      .select('title description category')
      .lean();

    // map ชื่อกุญแจให้ออกเป็นภาษาไทยตามที่ต้องการ
    const templates = rows.map(t => ({
      'หัวข้อ': t.title || '-',
      'คำอธิบาย': t.description || '-',
      'หมวดหมู่': t.category || '-',
    }));

    return res.json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;