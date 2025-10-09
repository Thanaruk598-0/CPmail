const express = require('express');
const router = express.Router();
const Form = require('../../models/Form');
const Course = require('../../models/Course');
const Section = require('../../models/Section');
const Notification = require('../../models/Notification');
const checkLecturer = require('../../middleware/checkLecturer'); // middleware ตรวจสิทธิ์อาจารย์

// GET /lecturer/dashboard
router.get('/dashboard', checkLecturer, async (req, res) => {
  try {
    const lecturerId = req.user._id;

    // ดึงแบบฟอร์มที่เกี่ยวข้องกับอาจารย์
    const forms = await Form.find({
      reviewers: lecturerId // อาจารย์เป็นผู้ตรวจ
    })
      .populate('submitter', 'name studentId')
      .populate('template', 'title')
      .populate('course', 'name courseId')
      .sort({ submittedAt: -1 });

    // สรุปสถิติ
    const totalForms = forms.length;
    const pending = forms.filter(f => f.status === 'pending').length;
    const approved = forms.filter(f => f.status === 'approved').length;
    const rejected = forms.filter(f => f.status === 'rejected').length;

    const totalReviewed = approved + rejected;
    const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;

    // Recent activity (5 ล่าสุด)
    const recentActivity = forms.slice(0, 5).map(f => ({
      student: f.submitter?.name || 'Unknown',
      formTitle: f.template?.title || 'Untitled Form',
      status: f.status,
      timeAgo: (() => {
        const diffMs = new Date() - f.submittedAt;
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
      })()
    }));

    // Notifications เฉพาะอาจารย์คนนั้น
    const unreadNotifications = await Notification.countDocuments({ read: false, user: lecturerId });
    const recentNotifications = await Notification.find({ user: lecturerId })
      .sort({ createdAt: -1 })
      .limit(3);

    const courses = await Course.find()
      .populate('lecturers', 'name') // อาจารย์ผู้สอน
      .populate('sections', 'name semester year room');

    res.render('lecturer/lectureDashboard', {
      currentUser: req.user,
      totalForms,
      pending,
      approved,
      rejected,
      approvalRate,
      recentActivity,
      unreadNotifications,
      recentNotifications,
      forms,
      courses,
      currentDate: new Date().toLocaleDateString('th-TH')
    });

  } catch (err) {
    console.error('Error loading lecturer dashboard:', err);
    res.status(500).render('error', {
      message: 'Error loading lecturer dashboard',
      error: { status: 500, stack: err.stack }
    });
  }
});

module.exports = router;
