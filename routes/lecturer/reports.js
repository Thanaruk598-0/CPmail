const express = require('express');
const router = express.Router();
const { Form, Section, FormTemplate, Course } = require('../../models');  // ✅ เพิ่ม Course
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
router.get('/', checkLecturer, async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const sections = await getLecturerSections(lecturerId);
    console.log(`Debug: Sections found: ${sections.length}`);  // Debug

    // Filters from query params (default last 30 days)
    const fromDate = req.query.fromDate
      ? new Date(req.query.fromDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = req.query.toDate ? new Date(req.query.toDate) : new Date();
    const studentGroup = req.query.studentGroup || 'All';

    // Base match: reviewers + date
    let matchQuery = {
      reviewers: lecturerId,
      submittedAt: { $gte: fromDate, $lte: toDate },
    };

    // Optional section filter (for studentGroup)
    let sectionMatch = null;
    if (studentGroup !== 'All') {
      const targetSection = sections.find(s => s.name === studentGroup);
      if (targetSection) {
        matchQuery.section = targetSection._id;
        console.log(`Debug: Filtering by section: ${targetSection.name}`);
      }
    }

    console.log(`Debug: Match query:`, matchQuery);  // Debug

    // Total submissions
    const totalSubmissions = await Form.countDocuments(matchQuery);
    console.log(`Debug: Total submissions: ${totalSubmissions}`);

    // Pending review
    const pendingReview = await Form.countDocuments({ ...matchQuery, status: 'pending' });

    // Overall status counts
    const statusCounts = await Form.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const approvedCount = statusCounts.find(s => s._id === 'approved')?.count || 0;
    const rejectedCount = statusCounts.find(s => s._id === 'rejected')?.count || 0;
    const cancelledCount = statusCounts.find(s => s._id === 'cancelled')?.count || 0;
    const overallApprovalRate = calculateApprovalRate(approvedCount, rejectedCount);

    // Active students
    const activeStudentsResult = await Form.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$submitter' } },
      { $count: 'uniqueSubmitters' },
    ]);
    const activeStudents = activeStudentsResult[0]?.uniqueSubmitters || 0;

    // Detailed stats by form type
    const formStats = await Form.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'formtemplates',
          localField: 'template',
          foreignField: '_id',
          as: 'templateInfo',
        },
      },
      { $unwind: { path: '$templateInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$templateInfo.title', 'Untitled Form'] },
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      {
        $project: {
          title: '$_id',
          _id: 0,
          total: 1,
          approved: 1,
          pending: 1,
          rejected: 1,
          cancelled: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);
    const detailedStats = formStats.length
      ? formStats.map(stat => ({
          ...stat,
          approvalRate: calculateApprovalRate(stat.approved, stat.rejected),
        }))
      : [
          {
            title: 'ไม่มีข้อมูล',
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            cancelled: 0,
            approvalRate: 0,
          },
        ];

    // Pie charts
    const typeTotals = detailedStats.reduce((acc, stat) => acc + stat.total, 0);
    const submissionsByType = detailedStats
      .filter(stat => stat.total > 0)  // ✅ Filter >0
      .map((stat, index) => ({
        label: stat.title,
        value: typeTotals > 0 ? Math.round((stat.total / typeTotals) * 100) : 0,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5],
      }));
    if (submissionsByType.length === 0) {
      submissionsByType.push({ label: 'ไม่มีข้อมูล', value: 100, color: '#d1d5db' });  // ✅ Single slice if 0
    }

    const submissionsByStatus = totalSubmissions
      ? [
          { label: 'Approved', value: Math.round((approvedCount / totalSubmissions) * 100), color: '#10B981' },
          { label: 'Pending', value: Math.round((pendingReview / totalSubmissions) * 100), color: '#F59E0B' },
          { label: 'Rejected', value: Math.round((rejectedCount / totalSubmissions) * 100), color: '#EF4444' },
          { label: 'Cancelled', value: Math.round((cancelledCount / totalSubmissions) * 100), color: '#6B7280' },
        ].filter(s => s.value > 0)
      : [{ label: 'ไม่มีข้อมูล', value: 100, color: '#d1d5db' }];

    // Trend by day
    const trendsByDay = await Form.aggregate([
      { $match: matchQuery },
      { $addFields: { dayOfWeek: { $dayOfWeek: '$submittedAt' } } },
      { $group: { _id: '$dayOfWeek', count: { $sum: 1 } } },
      { $project: { day: '$_id', count: 1, _id: 0 } },
      { $sort: { day: 1 } },
    ]);
    const trendLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendData = new Array(7).fill(0);
    trendsByDay.forEach(t => {
      trendData[t.day - 1] = t.count;
    });

    // Performance by course (group by course via section)
    const groupStats = await Form.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'sections', localField: 'section', foreignField: '_id', as: 'sectionDoc' } },
      { $unwind: { path: '$sectionDoc', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'courses', localField: 'sectionDoc.course', foreignField: '_id', as: 'courseDoc' } },
      { $unwind: { path: '$courseDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$courseDoc.name', 'Unknown Course'] },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },  // ✅ เพิ่ม
        },
      },
      { $project: { label: '$_id', _id: 0, approved: 1, pending: 1, rejected: 1, cancelled: 1 } },
      { $sort: { approved: -1 } },
    ]);
    const groupData = groupStats.length
      ? groupStats
      : [{ label: 'ไม่มีข้อมูล', approved: 0, pending: 0, rejected: 0, cancelled: 0 }];

    // Render view
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
      sections,
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      studentGroup,
      activeMenu: 'reports',
      currentUser: req.user,
    });
  } catch (err) {
    console.error('Error fetching reports data:', err);
    res.status(500).render('error', { message: 'Error loading reports', error: { status: 500 } });
  }
});

module.exports = router;