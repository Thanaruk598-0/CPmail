const express = require('express');
const router = express.Router();
const Form = require('../../models/Form');
const User = require('../../models/User');
const Section = require('../../models/Section');
const Course = require('../../models/Course');
const FormTemplate = require('../../models/FormTemplate');
const checkLecturer = require('../../middleware/checkLecturer');

// Helper function to get lecturer's sections with courses
async function getLecturerSections(lecturerId) {
  const sections = await Section.find({ lecturers: lecturerId })
    .populate('course', 'name courseId')
    .select('_id name course');
  return sections;
}

// Helper to calculate approval rate
function calculateApprovalRate(approved, rejected) {
  const totalReviewed = approved + rejected;
  return totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;
}

// GET /lecturer/reports
router.get('/reports', checkLecturer, async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const sections = await getLecturerSections(lecturerId);
    const sectionIds = sections.map(s => s._id);

    if (sectionIds.length === 0) {
      return res.render('lecturer/reports', { 
        totalSubmissions: 0,
        pendingReview: 0,
        overallApprovalRate: 0,
        activeStudents: 0,
        detailedStats: [],
        submissionsByType: [],
        submissionsByStatus: [],
        trendLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        trendData: new Array(7).fill(0),
        groupData: [],
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        studentGroup: 'All',
        activeMenu: 'reports',
        currentUser: req.user 
      });
    }

    // Filters from query params (default last 30 days)
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = req.query.toDate ? new Date(req.query.toDate) : new Date();
    const studentGroup = req.query.studentGroup || 'All'; // For now, 'All' or specific section name

    let matchQuery = {
      section: { $in: sectionIds },
      createdAt: { $gte: fromDate, $lte: toDate }  // Use createdAt from timestamps
    };

    // If studentGroup is specific section, filter by section name
    if (studentGroup !== 'All') {
      const targetSection = sections.find(s => s.name === studentGroup);
      if (targetSection) {
        matchQuery.section = targetSection._id;
      }
    }

    // Total submissions
    const totalSubmissions = await Form.countDocuments(matchQuery);

    // Pending review
    const pendingReview = await Form.countDocuments({ ...matchQuery, status: 'pending' });

    // Overall status counts
    const statusCounts = await Form.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const approvedCount = statusCounts.find(s => s._id === 'approved')?.count || 0;
    const rejectedCount = statusCounts.find(s => s._id === 'rejected')?.count || 0;
    const cancelledCount = statusCounts.find(s => s._id === 'cancelled')?.count || 0;
    const overallApprovalRate = calculateApprovalRate(approvedCount, rejectedCount);

    // Active students: unique submitters this period
    const activeStudentsResult = await Form.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$submitter' } },
      { $count: 'uniqueSubmitters' }
    ]);
    const activeStudents = activeStudentsResult[0]?.uniqueSubmitters || 0;

    // Detailed statistics by form type (real data)
    const formStats = await Form.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'formtemplates',
          localField: 'template',
          foreignField: '_id',
          as: 'templateInfo'
        }
      },
      { $unwind: { path: '$templateInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$templateInfo.title', 'Untitled Form'] },
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      },
      { $project: { title: '$_id', _id: 0, total: 1, approved: 1, pending: 1, rejected: 1, cancelled: 1 } },
      { $sort: { total: -1 } }
    ]);

    const detailedStats = formStats.map(stat => ({
      ...stat,
      approvalRate: calculateApprovalRate(stat.approved, stat.rejected)
    }));

    // Submissions by type for pie chart (percentages, real)
    const typeTotals = detailedStats.reduce((acc, stat) => acc + stat.total, 0);
    const submissionsByType = detailedStats
      .filter(stat => stat.total > 0)
      .map((stat, index) => ({
        label: stat.title,
        value: typeTotals > 0 ? Math.round((stat.total / typeTotals) * 100) : 0,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5] || '#6B7280'
      }));

    // Submissions by status for pie chart (real)
    const statusTotals = totalSubmissions;
    const submissionsByStatus = [
      { label: 'Approved', value: statusTotals > 0 ? Math.round((approvedCount / statusTotals) * 100) : 0, color: '#10B981' },
      { label: 'Pending', value: statusTotals > 0 ? Math.round((pendingReview / statusTotals) * 100) : 0, color: '#F59E0B' },
      { label: 'Rejected', value: statusTotals > 0 ? Math.round((rejectedCount / statusTotals) * 100) : 0, color: '#EF4444' },
      { label: 'Cancelled', value: statusTotals > 0 ? Math.round((cancelledCount / statusTotals) * 100) : 0, color: '#6B7280' }
    ].filter(s => s.value > 0);

    // Submission trends by day of week (real, last 30 days, using createdAt)
    const trendsByDay = await Form.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$createdAt' }  // 1=Sun, 2=Mon, ..., 7=Sat
        }
      },
      {
        $group: {
          _id: '$dayOfWeek',
          count: { $sum: 1 }
        }
      },
      { $project: { day: '$_id', count: 1, _id: 0 } },
      { $sort: { day: 1 } }
    ]);
    const trendLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendData = new Array(7).fill(0);
    trendsByDay.forEach(trend => {
      trendData[trend.day - 1] = trend.count;  // Adjust for 1-based to 0-indexed
    });

    // Performance by student group (by course, stacked by status, real)
    const groupStats = await Form.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'sections',
          localField: 'section',
          foreignField: '_id',
          as: 'sectionDoc'
        }
      },
      { $unwind: { path: '$sectionDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'courses',
          localField: 'sectionDoc.course',
          foreignField: '_id',
          as: 'courseDoc'
        }
      },
      { $unwind: { path: '$courseDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$courseDoc.name', 'Unknown Course'] },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      },
      { $project: { label: '$_id', _id: 0, approved: 1, pending: 1, rejected: 1, cancelled: 1 } },
      { $sort: { approved: -1 } }
    ]);

    const groupData = groupStats;

    res.render('lecturer/reports', {
      totalSubmissions,
      pendingReview,
      overallApprovalRate,
      activeStudents,
      detailedStats,
      submissionsByType,
      submissionsByStatus,
      trendLabels,
      trendData,
      groupData,
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      studentGroup,
      activeMenu: 'reports',
      currentUser: req.user
    });

  } catch (err) {
    console.error('Error fetching reports data:', err);
    res.status(500).render('error', { message: 'Error loading reports', error: { status: 500 } });
  }
});

module.exports = router;