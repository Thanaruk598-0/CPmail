const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const User = require('../models/user');
const Notification = require('../models/Notification');
const checkAdmin = require('../middleware/checkAdmin');
const FormTemplate = require('../models/FormTemplate');

// GET /Dashboard/dashboard
router.get('/dashboard', checkAdmin, async (req, res) => {
  try {
    // รวมสถิติ Forms
    const totalForms = await Form.countDocuments();
    const statusCounts = await Form.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const pending = statusCounts.find(s => s._id === 'pending')?.count || 0;
    const approved = statusCounts.find(s => s._id === 'approved')?.count || 0;
    const rejected = statusCounts.find(s => s._id === 'rejected')?.count || 0;
    const cancelled = statusCounts.find(s => s._id === 'cancelled')?.count || 0;

    const totalReviewed = approved + rejected;
    const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;
    const rejectionRate = totalReviewed > 0 ? Math.round((rejected / totalReviewed) * 100) : 0;

    // Growth จากเดือนนี้กับเดือนก่อน
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const formsThisMonth = await Form.countDocuments({ submittedAt: { $gte: startOfThisMonth } });
    const formsLastMonth = await Form.countDocuments({ submittedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } });

    let growthFromLastMonth = 0;
    if (formsLastMonth > 0) {
      growthFromLastMonth = Math.round(((formsThisMonth - formsLastMonth) / formsLastMonth) * 100);
    } else if (formsThisMonth > 0) {
      growthFromLastMonth = 100;
    }

    // Recent Activity (5 ล่าสุด)
    const recentForms = await Form.find()
      .sort({ submittedAt: -1 })
      .limit(5)
      .populate('submitter', 'name')
      .populate('template', 'title');

    const recentActivity = recentForms.map(form => {
      const action = form.status === 'approved' ? 'Form approved' : 'Form submitted';
      const by = form.submitter?.name || 'Unknown';
      const details = form.template?.title || 'Untitled Form';

      // คำนวณเวลา ago
      const diffMs = new Date() - form.submittedAt;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      let timeAgo = '';
      if (diffMins < 1) timeAgo = 'just now';
      else if (diffMins < 60) timeAgo = `${diffMins} minutes ago`;
      else if (diffHours < 24) timeAgo = `${diffHours} hours ago`;
      else timeAgo = `${diffDays} days ago`;

      return { action, by, details, timeAgo };
    });

    // Notifications (3 ล่าสุด)
    const unreadNotifications = await Notification.countDocuments({ read: false, user: req.user._id });

    const recentNotificationsData = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('user', 'name');

    const recentNotifications = recentNotificationsData.map(notif => {
      const diffMs = new Date() - notif.createdAt;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      let timeAgo = '';
      if (diffMins < 1) timeAgo = 'just now';
      else if (diffMins < 60) timeAgo = `${diffMins} minutes ago`;
      else if (diffHours < 24) timeAgo = `${diffHours} hours ago`;
      else timeAgo = `${diffDays} days ago`;

      return {
        message: notif.message,
        type: notif.type,
        link: notif.link || '#',
        user: notif.user?.name || 'System',
        timeAgo
      };
    });

    // Chart Data
    const totalStatus = totalForms > 0 ? [
      { label: 'Approved', value: Math.round((approved / totalForms) * 100), color: '#10B981' },
      { label: 'Pending', value: Math.round((pending / totalForms) * 100), color: '#F59E0B' },
      { label: 'Rejected', value: Math.round((rejected / totalForms) * 100), color: '#EF4444' },
      { label: 'Cancelled', value: Math.round((cancelled / totalForms) * 100), color: '#6B7280' }
    ].filter(s => s.value > 0) : [];

    const chartLabels = totalStatus.map(s => s.label);
    const chartValues = totalStatus.map(s => s.value);
    const chartColors = totalStatus.map(s => s.color);

    // System Health (mock)
    const systemHealth = {
      api: { status: 'healthy', color: 'green' },
      email: { status: 'slow', color: 'yellow' },
      storage: { used: 78, color: 'green' }
    };

    // Recent Users (5 ล่าสุด)
    const recentUsers = await User.find()
      .sort({ lastLogin: -1 })
      .limit(5)
      .select('name role lastLogin avatarUrl studentId');

    res.render('adminDashboard', {
      totalForms,
      pending,
      approved,
      rejected,
      approvalRate,
      rejectionRate,
      recentActivity,
      unreadNotifications,
      recentNotifications,
      growthFromLastMonth,
      chartLabels,
      chartValues,
      chartColors,
      systemHealth,
      recentUsers,
      currentDate: new Date().toLocaleDateString('th-TH'),
      currentUser: req.user
    });

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).render('error', { 
      message: 'Error loading admin dashboard', 
      error: { status: 500, stack: err.stack } 
    });
  }
});

module.exports = router;
