// routes/lecturer/formHistory.js (โค้ดใหม่ทั้งหมด – แก้ filter, clear, populate, และ route view)
const express = require('express');
const router = express.Router();
const Form = require('../../models/Form');
const User = require('../../models/User');
const Section = require('../../models/Section');
const FormTemplate = require('../../models/FormTemplate');
const checkLecturer = require('../../middleware/checkLecturer');

// Helper to get lecturer's sections
async function getLecturerSections(lecturerId) {
  const sections = await Section.find({ lecturers: lecturerId }).select('_id');
  return sections.map(s => s._id);
}

// GET /history (main list)
router.get('/history', checkLecturer, async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const sectionIds = await getLecturerSections(lecturerId);

    if (sectionIds.length === 0) {
      return res.render('lecturer/formHistory', {
        forms: [],
        totalForms: 0,
        pendingReview: 0,
        approved: 0,
        rejected: 0,
        statusFilter: 'All Statuses',
        formTypeFilter: 'All Types',
        fromDate: '',
        toDate: '',
        searchStudent: '',
        uniqueFormTypes: ['All Types'],
        activeMenu: 'formHistory',
        currentUser: req.user
      });
    }

    // Filters from query params (default empty for all)
    const statusFilter = req.query.status || 'All Statuses';
    const formTypeFilter = req.query.formType || 'All Types';
    const fromDate = req.query.fromDate || '';
    const toDate = req.query.toDate || '';
    const searchStudent = req.query.searchStudent || '';

    let matchQuery = { section: { $in: sectionIds } };

    // Status filter
    if (statusFilter !== 'All Statuses') {
      const statusMap = {
        'Pending': 'pending',
        'Under Review': 'pending', // Assume same as pending
        'Approved': 'approved',
        'Rejected': 'rejected'
      };
      matchQuery.status = statusMap[statusFilter];
    }

    // Date filter
    if (fromDate) {
      if (!matchQuery.createdAt) matchQuery.createdAt = {};
      matchQuery.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      if (!matchQuery.createdAt) matchQuery.createdAt = {};
      matchQuery.createdAt.$lte = new Date(toDate);
    }

    // Fetch forms with populate
    const forms = await Form.find(matchQuery)
      .sort({ createdAt: -1 })
      .limit(50) // Basic limit for pagination
      .populate('submitter', 'name universityId avatarUrl')
      .populate('template', 'title fields');

    // Apply client-side filters if needed (for form type and student search)
    let filteredForms = forms;
    if (formTypeFilter !== 'All Types') {
      filteredForms = filteredForms.filter(form => form.template?.title === formTypeFilter);
    }
    if (searchStudent) {
      filteredForms = filteredForms.filter(form => 
        form.submitter?.name.toLowerCase().includes(searchStudent.toLowerCase())
      );
    }

    // Stats (overall, not filtered)
    const totalForms = await Form.countDocuments({ section: { $in: sectionIds } });
    const pendingReview = await Form.countDocuments({ section: { $in: sectionIds }, status: 'pending' });
    const approved = await Form.countDocuments({ section: { $in: sectionIds }, status: 'approved' });
    const rejected = await Form.countDocuments({ section: { $in: sectionIds }, status: 'rejected' });

    // Unique form types
    const uniqueFormTypes = await FormTemplate.aggregate([
      {
        $lookup: {
          from: 'forms',
          localField: '_id',
          foreignField: 'template',
          pipeline: [{ $match: { section: { $in: sectionIds } } }],
          as: 'usedForms'
        }
      },
      { $match: { usedForms: { $ne: [] } } },
      { $group: { _id: '$title' } },
      { $project: { title: '$_id', _id: 0 } },
      { $sort: { title: 1 } }
    ]);
    const formTypesList = ['All Types', ...uniqueFormTypes.map(t => t.title)];

    // Mock priority (add to model if needed)
    filteredForms.forEach(form => {
      form.priority = Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low';
    });

    res.render('lecturer/formHistory', {
      forms: filteredForms,
      totalForms,
      pendingReview,
      approved,
      rejected,
      statusFilter,
      formTypeFilter,
      fromDate,
      toDate,
      searchStudent,
      uniqueFormTypes: formTypesList,
      activeMenu: 'formHistory',
      currentUser: req.user
    });

  } catch (err) {
    console.error('Error fetching form history:', err);
    res.status(500).render('error', { message: 'Error loading form history', error: { status: 500 } });
  }
});

// GET /forms/:id/view (view single form)
router.get('/forms/:id/view', checkLecturer, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id)
      .populate('submitter', 'name universityId avatarUrl')
      .populate('template', 'title fields')
      .populate('section', 'name course')
      .populate('course', 'name');
    if (!form) {
      return res.status(404).render('error', { message: 'Form not found' });
    }
    form.priority = Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low';
    res.render('lecturer/formView', { 
      form, 
      activeMenu: 'formHistory', 
      currentUser: req.user 
    });
  } catch (err) {
    console.error('Error viewing form:', err);
    res.status(500).render('error', { message: 'Error loading form details' });
  }
});

// POST /:id/approve
router.post('/:id/approve', checkLecturer, async (req, res) => {
  try {
    await Form.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      reviewers: req.user._id,
      reviewComment: req.body.comment || 'Approved by lecturer',
      reviewedAt: new Date()
    });
    res.redirect('/lecturer/history');
  } catch (err) {
    console.error('Error approving form:', err);
    res.status(500).send('Error approving form');
  }
});

// POST /:id/reject
router.post('/:id/reject', checkLecturer, async (req, res) => {
  try {
    await Form.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      reviewers: req.user._id,
      reviewComment: req.body.comment || 'Rejected by lecturer',
      reviewedAt: new Date()
    });
    res.redirect('/lecturer/history');
  } catch (err) {
    console.error('Error rejecting form:', err);
    res.status(500).send('Error rejecting form');
  }
});

module.exports = router;