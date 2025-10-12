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

// GET / (main list)
router.get('/', checkLecturer, async (req, res) => {
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

    // Filters from query params
    const statusFilter = req.query.status || 'All Statuses';
    const formTypeFilter = req.query.formType || 'All Types';
    const fromDate = req.query.fromDate || '';
    const toDate = req.query.toDate || '';
    const searchStudent = req.query.searchStudent ? req.query.searchStudent.trim() : '';

    // Base matchQuery: $or for pending in my sections OR reviewed by me
    let baseMatchQuery = {
      $or: [
        { section: { $in: sectionIds }, status: 'pending' },
        { reviewers: lecturerId }
      ]
    };

    let matchQuery = { ...baseMatchQuery };

    // Status filter (apply to both parts)
    if (statusFilter !== 'All Statuses') {
      const statusMap = {
        'Pending': 'pending',
        'Under Review': 'pending',
        'Approved': 'approved',
        'Rejected': 'rejected'
      };
      const targetStatus = statusMap[statusFilter];
      matchQuery.$or[0].status = targetStatus; // For pending part, only if pending
      matchQuery.$or[1].status = targetStatus; // For reviewed part
      if (targetStatus === 'pending') {
        delete matchQuery.$or[1]; // If pending, only show from sections (not reviewed)
      }
    }

    // Date filter
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate + 'T23:59:59.999Z');
      matchQuery.$or[0].createdAt = dateFilter;
      matchQuery.$or[1].createdAt = dateFilter;
    }

    // Student search filter
    if (searchStudent) {
      const students = await User.find({
        name: { $regex: searchStudent, $options: 'i' }
      }).select('_id');
      if (students.length > 0) {
        const submitterFilter = { $in: students.map(s => s._id) };
        matchQuery.$or[0].submitter = submitterFilter;
        matchQuery.$or[1].submitter = submitterFilter;
      } else {
        // No students match → empty results
        matchQuery.$or[0].submitter = { $in: [] };
        matchQuery.$or[1].submitter = { $in: [] };
      }
    }

    // Fetch forms with populate
    let forms = await Form.find(matchQuery)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('submitter', 'name universityId avatarUrl')
      .populate('template', 'title fields');

    // Client-side formType filter
    if (formTypeFilter !== 'All Types') {
      forms = forms.filter(form => form.template?.title === formTypeFilter);
    }

    // Stats: Adjusted for lecturer-specific (pending in sections + reviewed by me)
    const pendingMatch = { section: { $in: sectionIds }, status: 'pending' };
    const reviewedMatch = { reviewers: lecturerId };
    const totalForms = await Form.countDocuments({ $or: [pendingMatch, reviewedMatch] });
    const pendingReview = await Form.countDocuments(pendingMatch);
    const approved = await Form.countDocuments({ ...reviewedMatch, status: 'approved' });
    const rejected = await Form.countDocuments({ ...reviewedMatch, status: 'rejected' });

    // Unique form types (from forms in sections)
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

    // Mock priority if not set
    forms.forEach(form => {
      if (!form.priority) {
        form.priority = Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low';
      }
    });

    res.render('lecturer/formHistory', {
      forms,
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

// GET /forms/:id/view
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
    if (!form.priority) {
      form.priority = Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low';
    }
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
      $push: { reviewers: req.user._id }, // Use $push to add if not exists
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
      $push: { reviewers: req.user._id }, // Use $push to add if not exists
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