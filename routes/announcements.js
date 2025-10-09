const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const Section = require('../models/Section');

const checkLecturer = require('../middleware/checkLecturer');

// helpers
const asStr = v => (typeof v === 'string' ? v.trim() : '');
const asArray = v => (Array.isArray(v) ? v : (v ? [v] : []));
const aw = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ================== PAGE: GET /lecturer/announcements ================== */
router.get('/announcements', checkLecturer, aw(async (req, res) => {
  try {
    const userId = res.locals.currentUser?._id;
    if (!userId) {
      console.log('No user logged in');
      return res.render('lecturer/announcements', {
        pageTitle: 'ประกาศ',
        activeMenu: 'announcements',
        user: null,
        data: {
          stats: { totalAll: 0, thisMonth: 0, pinnedCount: 0, expiringSoon: 0 },
          recent: [],
          courses: [],
          error: 'กรุณาล็อกอินเพื่อดูรายวิชา'
        }
      });
    }

    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // สถิติประกาศ
    const [totalAll, thisMonth, pinnedCount, expiringSoon, recent] = await Promise.all([
      Announcement.countDocuments({ lecturer: userId }), // เฉพาะประกาศของอาจารย์
      Announcement.countDocuments({ lecturer: userId, createdAt: { $gte: startMonth } }),
      Announcement.countDocuments({ lecturer: userId, pinned: true }),
      Announcement.countDocuments({ lecturer: userId, expiresAt: { $gte: now, $lte: soon } }),
      Announcement.find({ lecturer: userId }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    // ดึงรายวิชาของอาจารย์
    const courseFilter = {
      lecturers: userId // ปรับให้ตรงกับ Schema (สมมติว่าใช้ lecturers เป็น Array of ObjectId)
    };

    const rawCourses = await Course.find(courseFilter)
      .select('_id code courseId cid name title description credits semester groups._id groups.name sections lecturers')
      .sort({ name: 1, title: 1, code: 1, courseId: 1 })
      .lean();

    console.log('Courses found for user', userId, ':', rawCourses.length);

    const courses = rawCourses.map(c => ({
      _id: c._id,
      code: c.code || c.courseId || c.cid || '',
      name: c.name || c.title || c.courseName || '',
      description: c.description || '',
      credits: c.credits ?? null,
      semester: c.semester || '',
      groups: (Array.isArray(c.groups) && c.groups.length ? c.groups : (c.sections || [])).map(g => ({
        _id: g._id || g.id || g.sectionId,
        name: g.name || g.title || g.sectionName || 'กลุ่ม',
      })),
    }));

    res.render('lecturer/announcements', {
      pageTitle: 'ประกาศ',
      activeMenu: 'announcements',
      user: res.locals.currentUser,
      data: {
        stats: { totalAll, thisMonth, pinnedCount, expiringSoon },
        recent,
        courses,
        error: courses.length === 0 ? 'ไม่พบรายวิชาที่คุณสอน' : null
      }
    });
  } catch (err) {
    console.error('Error in /lecturer/announcements:', err);
    res.status(500).render('lecturer/announcements', {
      pageTitle: 'ประกาศ',
      activeMenu: 'announcements',
      user: res.locals.currentUser || null,
      data: {
        stats: { totalAll: 0, thisMonth: 0, pinnedCount: 0, expiringSoon: 0 },
        recent: [],
        courses: [],
        error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      }
    });
  }
}));

/* ========== API: รายวิชาทั้งหมด (รองรับ q, lecturerId) ========== */
router.get('/api/courses', checkLecturer, aw(async (req, res) => {
  const user = res.locals.currentUser;
  if (!user) {
    console.log('Unauthorized access to /api/courses');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const q = asStr(req.query.q || '');
  const lecturerId = user._id; // ใช้ user._id เฉพาะผู้ที่ล็อกอิน

  const searchOr = [];
  if (q) {
    const re = new RegExp(q, 'i');
    searchOr.push({ name: re }, { title: re }, { code: re }, { courseId: re }, { cid: re }, { description: re });
  }

  const courseFilter = {
    lecturers: lecturerId // เฉพาะรายวิชาของอาจารย์ที่ล็อกอิน
  };

  if (searchOr.length) {
    courseFilter.$and = [{ $or: searchOr }];
  }

  const raw = await Course.find(courseFilter)
    .select('_id code name title courseId cid groups._id groups.name sections')
    .sort({ name: 1, title: 1 })
    .limit(50)
    .lean();

  console.log('Courses found for user', lecturerId, ':', raw.length);

  const items = raw.map(c => ({
    _id: c._id,
    code: c.code || c.courseId || c.cid || '',
    name: c.name || c.title || c.courseName || '',
    groups: (Array.isArray(c.groups) && c.groups.length ? c.groups : (c.sections || [])).map(g => ({
      _id: g._id || g.id || g.sectionId,
      name: g.name || g.title || g.sectionName || 'กลุ่ม',
    })),
  }));

  res.json({ success: true, items });
}));

/* ========== Helper: หา sections ให้คอร์ส ========== */
async function findSectionsForCourse(courseId, lecturerId) {
  // ตรวจสอบว่ารายวิชานี้เป็นของอาจารย์ที่ล็อกอิน
  const course = await Course.findOne({ _id: courseId, lecturers: lecturerId })
    .select('groups._id groups.name sections')
    .lean();

  if (!course) {
    console.log('Course', courseId, 'not found or not authorized for lecturer', lecturerId);
    return [];
  }

  const fromSectionCol = await Section
    .find({ course: courseId }, '_id name course')
    .sort({ name: 1 })
    .lean();

  if (fromSectionCol.length) return fromSectionCol;

  const groups = (Array.isArray(course.groups) && course.groups.length ? course.groups : (course.sections || [])).map(g => ({
    _id: g._id || g.id || g.sectionId,
    name: g.name || g.title || g.sectionName || 'กลุ่ม',
    course: courseId
  }));

  return groups;
}

/* ========== API: กลุ่มเรียนตามรายวิชา (query) ========== */
router.get('/api/sections', checkLecturer, aw(async (req, res) => {
  const { courseId } = req.query || {};
  if (!courseId) return res.json({ success: true, items: [] });
  const userId = res.locals.currentUser?._id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const items = await findSectionsForCourse(courseId, userId);
  res.json({ success: true, items });
}));

/* ========== API: กลุ่มเรียนตามรายวิชา (RESTful) ========== */
router.get('/api/courses/:courseId/sections', checkLecturer, aw(async (req, res) => {
  const userId = res.locals.currentUser?._id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const items = await findSectionsForCourse(req.params.courseId, userId);
  res.json({ success: true, items });
}));

/* ========== API: บันทึกประกาศใหม่ ========== */
router.post('/announcements/api', checkLecturer, aw(async (req, res) => {
  const userId = res.locals.currentUser?._id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const {
    title = '', content = '', link = '',
    pinned = false, expiresAt = null,
    courseId = '', sectionId = '',
    audienceRoles = [], audienceSectionIds = []
  } = req.body || {};

  const t = asStr(title);
  const c = asStr(content);
  if (!t) return res.status(400).json({ success: false, message: 'กรุณากรอกหัวข้อประกาศ' });
  if (!c) return res.status(400).json({ success: false, message: 'กรุณากรอกเนื้อหาประกาศ' });

  const course = asStr(courseId) || null;
  const section = asStr(sectionId) || null;

  if (section && !course) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกรายวิชาก่อนเลือกกลุ่มเรียน' });
  }
  if (section && course) {
    const okPair = await Section.exists({ _id: section, course });
    if (!okPair) return res.status(400).json({ success: false, message: 'กลุ่มเรียนนี้ไม่อยู่ในรายวิชาที่เลือก' });
    // ตรวจสอบว่ารายวิชาเป็นของอาจารย์
    const courseValid = await Course.exists({ _id: course, lecturers: userId });
    if (!courseValid) return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ในรายวิชานี้' });
  }

  const exp = expiresAt ? new Date(expiresAt) : null;
  if (exp && isNaN(exp.getTime())) {
    return res.status(400).json({ success: false, message: 'รูปแบบวันหมดอายุไม่ถูกต้อง' });
  }

  const roles = asArray(audienceRoles).filter(Boolean);
  const secIds = asArray(audienceSectionIds).filter(Boolean);
  const audience = [
    ...roles.map(r => ({ type: 'role', role: r })),
    ...secIds.map(s => ({ type: 'section', section: s }))
  ];

  const doc = await Announcement.create({
    lecturer: userId,
    course,
    section,
    title: t,
    content: c,
    pinned: !!(pinned === true || pinned === 'true' || pinned === 'on'),
    expiresAt: exp,
    audience,
    link: asStr(link)
  });

  res.json({ success: true, message: 'บันทึกประกาศเรียบร้อย', id: doc._id });
}));

/* ========== API: สถิติ/กิจกรรมล่าสุด (dashboard) ========== */
router.get('/announcements/api/stats', checkLecturer, aw(async (req, res) => {
  const userId = res.locals.currentUser?._id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalAll, thisMonth, pinnedCount, expiringSoon, recent] = await Promise.all([
    Announcement.countDocuments({ lecturer: userId }),
    Announcement.countDocuments({ lecturer: userId, createdAt: { $gte: startMonth } }),
    Announcement.countDocuments({ lecturer: userId, pinned: true }),
    Announcement.countDocuments({ lecturer: userId, expiresAt: { $gte: now, $lte: soon } }),
    Announcement.find({ lecturer: userId }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  res.json({ success: true, stats: { totalAll, thisMonth, pinnedCount, expiringSoon }, recent });
}));

module.exports = router;