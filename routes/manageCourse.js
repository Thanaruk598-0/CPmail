const express = require("express");
const Course = require('../models/Course');
const Section = require('../models/Section');
const User = require('../models/User'); 
const checkAdmin = require('../middleware/checkAdmin');
const router = express.Router();

// Helper function เพื่อ process raw array from form (single string → array)
function processRawToArray(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === 'string') return [rawValue];
  return [];
}

// GET /manageCourse/list - แสดง tabs Courses/Sections พร้อม search/filter/stats
router.get('/list', checkAdmin, async (req, res) => {
  try {
    const { tab = 'courses', search, semester } = req.query;
    let query = {};

    // Search/Filter
    if (search) {
      if (tab === 'courses') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { courseId: { $regex: search, $options: 'i' } }
        ];
      } else {
        query.$or = [
          { name: { $regex: search, $options: 'i' } }
        ];
      }
    }
    if (semester && semester !== 'all') {
      query.semester = { $regex: '^' + semester + '/', $options: 'i' }; // e.g., "1/" for "1/2567"
    }

    let data;
    let stats;
    if (tab === 'courses') {
      data = await Course.find(query)
        .populate('lecturers', 'name') // สำหรับ count lecturers
        .sort({ createdAt: -1 });
      stats = {
        totalCourses: await Course.countDocuments(),
        totalSections: await Section.countDocuments()
      };
    } else {
      data = await Section.find(query)
        .populate('course', 'name courseId') // สำหรับแสดง course
        .populate('students', 'name') // สำหรับ count students
        .populate('lecturers', 'name') // สำหรับ count lecturers และชื่อ
        .sort({ createdAt: -1 });
      stats = {
        totalSections: await Section.countDocuments(),
        totalCourses: await Course.countDocuments()
      };
    }

    res.render('manageCourse/list', {
      tab,
      data,
      search,
      semester: semester || 'all',
      activeMenu: 'manageCourse',
      currentUser: res.locals.currentUser,
      stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
  }
});

// GET /manageCourse/add-course - Form เพิ่ม Course
router.get('/add-course', checkAdmin, (req, res) => {
  res.render('manageCourse/addCourse', { activeMenu: 'manageCourse', currentUser: res.locals.currentUser });
});

// POST /manageCourse/add-course - บันทึก Course ใหม่
router.post('/add-course', checkAdmin, async (req, res) => {
  try {
    const { courseId, name, description, credits, semester } = req.body;
    const course = new Course({ courseId, name, description, credits, semester });
    await course.save();
    res.redirect('/manageCourse/list?tab=courses');
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      res.status(400).send('Course ID ซ้ำ');
    } else {
      res.status(500).send('เกิดข้อผิดพลาด');
    }
  }
});

// GET /manageCourse/edit-course/:id - Form แก้ไข Course
router.get('/edit-course/:id', checkAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).send('ไม่พบ Course');
    res.render('manageCourse/editCourse', { course, activeMenu: 'manageCourse', currentUser: res.locals.currentUser });
  } catch (err) {
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

// POST /manageCourse/edit-course/:id - อัปเดต Course
router.post('/edit-course/:id', checkAdmin, async (req, res) => {
  try {
    const { courseId, name, description, credits, semester } = req.body;
    const course = await Course.findByIdAndUpdate(req.params.id, {
      courseId, name, description, credits, semester
    }, { new: true });
    if (!course) return res.status(404).send('ไม่พบ Course');
    res.redirect('/manageCourse/list?tab=courses');
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      res.status(400).send('Course ID ซ้ำ');
    } else {
      res.status(500).send('เกิดข้อผิดพลาด');
    }
  }
});

// POST /manageCourse/delete-course/:id - ลบ Course
router.post('/delete-course/:id', checkAdmin, async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.redirect('/manageCourse/list?tab=courses');
  } catch (err) {
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

// GET /manageCourse/add-section - Form เพิ่ม Section
router.get('/add-section', checkAdmin, async (req, res) => {
  const courses = await Course.find().select('courseId name');
  const lecturers = await User.find({ role: 'lecturer' }).select('name email _id');
  res.render('manageCourse/addSection', { courses, lecturers, activeMenu: 'manageCourse', currentUser: res.locals.currentUser });
});

// POST /manageCourse/add-section - บันทึก Section ใหม่
router.post('/add-section', checkAdmin, async (req, res) => {
  try {
    console.log('Req body add-section:', req.body); // Debug

    const { name, course, semester, maxStudents, room, 'lecturers[]': lecturersRaw, 'scheduleDay[]': scheduleDayRaw, 'scheduleStart[]': scheduleStartRaw, 'scheduleEnd[]': scheduleEndRaw } = req.body;
    let parsedYear = parseInt(semester.split('/')[1]) || new Date().getFullYear();
    let lecturers = processRawToArray(lecturersRaw);
    let scheduleDay = processRawToArray(scheduleDayRaw);
    let scheduleStart = processRawToArray(scheduleStartRaw);
    let scheduleEnd = processRawToArray(scheduleEndRaw);
    let scheduleString = '';
    if (scheduleDay.length > 0 && scheduleStart.length > 0 && scheduleEnd.length > 0) {
      for (let i = 0; i < scheduleDay.length; i++) {
        if (scheduleDay[i] && scheduleStart[i] && scheduleEnd[i]) {
          // Filter invalid time
          if (scheduleStart[i] && scheduleEnd[i]) {
            scheduleString += `${scheduleDay[i]} ${scheduleStart[i]}-${scheduleEnd[i]}, `;
          }
        }
      }
      scheduleString = scheduleString.slice(0, -2);
    }

    const section = new Section({ 
      name, 
      course, 
      semester, 
      year: parsedYear, 
      maxStudents: parseInt(maxStudents) || 50,
      lecturers, // Array of string IDs – Mongoose converts to ObjectId
      schedule: scheduleString,
      room 
    });

    section.markModified('lecturers'); // Force detect array changes

    await section.save();

    // Validate lecturers
    const validLecturers = await User.find({ _id: { $in: section.lecturers }, role: 'lecturer' });
    if (validLecturers.length !== section.lecturers.length) {
      return res.status(400).send('อาจารย์ที่เลือกไม่ถูกต้อง');
    }

    console.log('Saved section add:', section); // Debug
    res.redirect('/manageCourse/list?tab=sections');
  } catch (err) {
    console.error('Error in add-section:', err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

// GET /manageCourse/edit-section/:id - Form แก้ไข Section
router.get('/edit-section/:id', checkAdmin, async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate('course', 'courseId name')
      .populate('lecturers', '_id name');
    const courses = await Course.find().select('courseId name');
    const lecturers = await User.find({ role: 'lecturer' }).select('name email _id');
    if (!section) return res.status(404).send('ไม่พบ Section');

    // Parse existing schedule to array for pre-fill slots
    let existingSchedules = [];
    if (section.schedule) {
      const slots = section.schedule.split(', ');
      existingSchedules = slots.map(slot => {
        const parts = slot.split(' ');
        const day = parts[0];
        const timeRange = parts.slice(1).join(' '); // Handle if timeRange has spaces
        const [start, end] = timeRange ? timeRange.split('-') : ['', ''];
        return { day, start, end };
      }).filter(slot => slot.day); // Filter invalid slots
    }

    res.render('manageCourse/editSection', { 
      section, 
      courses, 
      lecturers, 
      existingSchedules, // ส่ง array สำหรับ pre-fill slots
      activeMenu: 'manageCourse', 
      currentUser: res.locals.currentUser 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

// POST /manageCourse/edit-section/:id - อัปเดต Section
router.post('/edit-section/:id', checkAdmin, async (req, res) => {
  try {
    console.log('Req body edit-section:', req.body); // Debug

    const { name, course, semester, maxStudents, room, 'lecturers[]': lecturersRaw, 'scheduleDay[]': scheduleDayRaw, 'scheduleStart[]': scheduleStartRaw, 'scheduleEnd[]': scheduleEndRaw } = req.body;
    let parsedYear = parseInt(semester.split('/')[1]) || new Date().getFullYear();
    let lecturers = processRawToArray(lecturersRaw);
    let scheduleDay = processRawToArray(scheduleDayRaw);
    let scheduleStart = processRawToArray(scheduleStartRaw);
    let scheduleEnd = processRawToArray(scheduleEndRaw);
    let scheduleString = '';
    if (scheduleDay.length > 0 && scheduleStart.length > 0 && scheduleEnd.length > 0) {
      for (let i = 0; i < scheduleDay.length; i++) {
        if (scheduleDay[i] && scheduleStart[i] && scheduleEnd[i]) {
          if (scheduleStart[i] && scheduleEnd[i]) {
            scheduleString += `${scheduleDay[i]} ${scheduleStart[i]}-${scheduleEnd[i]}, `;
          }
        }
      }
      scheduleString = scheduleString.slice(0, -2);
    }

    // Load document instance for better tracking
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).send('ไม่พบ Section');

    // Update fields
    section.name = name;
    section.course = course;
    section.semester = semester;
    section.year = parsedYear;
    section.maxStudents = parseInt(maxStudents) || 50;
    section.lecturers = lecturers; // Assign array
    section.schedule = scheduleString;
    section.room = room;

    section.markModified('lecturers'); // Force detect array changes

    await section.save();

    // Validate lecturers
    const validLecturers = await User.find({ _id: { $in: section.lecturers }, role: 'lecturer' });
    if (validLecturers.length !== section.lecturers.length) {
      return res.status(400).send('อาจารย์ที่เลือกไม่ถูกต้อง');
    }

    console.log('Updated section edit:', section); // Debug
    res.redirect('/manageCourse/list?tab=sections');
  } catch (err) {
    console.error('Error in edit-section:', err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

// POST /manageCourse/delete-section/:id - ลบ Section
router.post('/delete-section/:id', checkAdmin, async (req, res) => {
  try {
    await Section.findByIdAndDelete(req.params.id);
    res.redirect('/manageCourse/list?tab=sections');
  } catch (err) {
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

module.exports = router;