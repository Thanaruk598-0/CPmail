const mongoose = require('mongoose');
const User = require('./models/user'); // Adjust path to your models folder
const Course = require('./models/Course');
const Section = require('./models/Section');
const FormTemplate = require('./models/FormTemplate');
const Form = require('./models/Form');

// Lecturer ID (from your data)
const LECTURER_ID = new mongoose.Types.ObjectId('68e22bf2cc29a5143ed2e8c5');

// Connect to DB
mongoose.connect('mongodb://localhost:27017/CPmail')
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => console.error('Connection error:', err));

// Function to seed fresh data linked to this lecturer
async function seedFreshData() {
  try {
    console.log('Starting fresh seed for lecturer:', LECTURER_ID);

    // Clear existing related data (optional: comment out if you want to add without clearing)
    await Form.deleteMany({ section: { $in: await Section.find({ lecturers: LECTURER_ID }).select('_id') } });
    await FormTemplate.deleteMany({ title: { $in: ['Leave Request', 'Course Evaluation', 'Registration', 'Research Proposal', 'IT Support'] } });
    let course = await Course.findOne({ courseId: 'CS101' });
    if (course) {
      await Section.deleteMany({ course: course._id });
      await course.deleteOne();
    }
    await User.deleteMany({ role: 'student', universityId: { $in: ['S001', 'S002', 'S003', 'S004', 'S005'] } });

    // 1. Create fresh FormTemplates
    const templates = await FormTemplate.insertMany([
      {
        title: 'Leave Request',
        fields: [{ type: 'text', label: 'Reason' }, { type: 'date', label: 'Leave Date' }],
        allowedRoles: ['student']
      },
      {
        title: 'Course Evaluation',
        fields: [{ type: 'rating', label: 'Overall Rating' }, { type: 'textarea', label: 'Feedback' }],
        allowedRoles: ['student']
      },
      {
        title: 'Registration',
        fields: [{ type: 'select', label: 'Course Code', options: ['CS101', 'CS102'] }, { type: 'number', label: 'Credits' }],
        allowedRoles: ['student']
      },
      {
        title: 'Research Proposal',
        fields: [{ type: 'text', label: 'Proposal Title' }, { type: 'textarea', label: 'Abstract' }],
        allowedRoles: ['student']
      },
      {
        title: 'IT Support',
        fields: [{ type: 'text', label: 'Issue Title' }, { type: 'textarea', label: 'Description' }, { type: 'file', label: 'Screenshot' }],
        allowedRoles: ['student']
      }
    ]);
    console.log('Created', templates.length, 'fresh FormTemplates');

    // 2. Create fresh Students
    const newStudents = await User.insertMany([
      {
        name: 'Student One (CS1)',
        email: 's1@mail.com',
        phone: '0812345678',
        universityId: 'S001',
        yearOfStudy: 1,
        major: 'Computer Science',
        role: 'student',
        passwordHash: '$2b$10$YT19n2R2wxyGWFJxK5/mGed9hXumVxc28DMWqasLWl67/kyTFoRyq' // Same as lecturer for simplicity
      },
      {
        name: 'Student Two (CS2)',
        email: 's2@mail.com',
        phone: '0812345679',
        universityId: 'S002',
        yearOfStudy: 2,
        major: 'Computer Science',
        role: 'student',
        passwordHash: '$2b$10$YT19n2R2wxyGWFJxK5/mGed9hXumVxc28DMWqasLWl67/kyTFoRyq'
      },
      {
        name: 'Student Three (CS3)',
        email: 's3@mail.com',
        phone: '0812345680',
        universityId: 'S003',
        yearOfStudy: 3,
        major: 'Computer Science',
        role: 'student',
        passwordHash: '$2b$10$YT19n2R2wxyGWFJxK5/mGed9hXumVxc28DMWqasLWl67/kyTFoRyq'
      },
      {
        name: 'Student Four (CS4)',
        email: 's4@mail.com',
        phone: '0812345681',
        universityId: 'S004',
        yearOfStudy: 4,
        major: 'Computer Science',
        role: 'student',
        passwordHash: '$2b$10$YT19n2R2wxyGWFJxK5/mGed9hXumVxc28DMWqasLWl67/kyTFoRyq'
      },
      {
        name: 'Student Five (Grad)',
        email: 's5@mail.com',
        phone: '0812345682',
        universityId: 'S005',
        yearOfStudy: 5, // Graduate level
        major: 'Computer Science',
        role: 'student',
        passwordHash: '$2b$10$YT19n2R2wxyGWFJxK5/mGed9hXumVxc28DMWqasLWl67/kyTFoRyq'
      }
    ]);
    console.log('Created', newStudents.length, 'fresh Students');
    const studentIds = newStudents.map(s => s._id);

    // 3. Create fresh Course linked to lecturer
    course = new Course({
      courseId: 'CS101',
      name: 'Introduction to Computer Science',
      description: 'Fundamental concepts in CS, linked to lecturer "ครูเพ็นสรี"',
      credits: 3,
      semester: '1/2568',
      lecturers: [LECTURER_ID]
    });
    await course.save();
    console.log('Created fresh Course:', course.name);

    // Update lecturer's courses
    await User.findByIdAndUpdate(LECTURER_ID, {
      $set: { courses: [course._id] }
    });

    // 4. Create fresh Sections linked to course and lecturer
    const sections = await Section.insertMany([
      {
        name: 'Section A (CS Year 1)',
        course: course._id,
        students: [studentIds[0]._id, studentIds[1]._id],
        lecturers: [LECTURER_ID],
        semester: '1/2568',
        year: 2025,
        maxStudents: 50,
        schedule: 'Mon 13:00-15:00',
        room: 'CS-101A'
      },
      {
        name: 'Section B (CS Year 2)',
        course: course._id,
        students: [studentIds[2]._id, studentIds[3]._id],
        lecturers: [LECTURER_ID],
        semester: '1/2568',
        year: 2025,
        maxStudents: 50,
        schedule: 'Wed 14:00-16:00',
        room: 'CS-101B'
      },
      {
        name: 'Section C (CS Year 3)',
        course: course._id,
        students: [studentIds[4]._id],
        lecturers: [LECTURER_ID],
        semester: '1/2568',
        year: 2025,
        maxStudents: 50,
        schedule: 'Fri 09:00-11:00',
        room: 'CS-101C'
      }
    ]);

    // Update course sections and lecturer sections
    await course.updateOne({ $addToSet: { sections: { $each: sections.map(s => s._id) } } });
    await User.findByIdAndUpdate(LECTURER_ID, {
      $set: { sections: sections.map(s => s._id) }
    });
    console.log('Created', sections.length, 'fresh Sections');

    const sectionIds = sections.map(s => s._id);

    // 5. Create fresh Forms (45+ total, varied by type/status, recent dates, linked to lecturer's sections)
    const formsData = [];
    const formTypes = ['Leave Request', 'Course Evaluation', 'Registration', 'Research Proposal', 'IT Support'];
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'];
    const baseDate = new Date('2025-09-07'); // Start from early Sept for 30-day window

    // Generate ~45 forms distributed by type
    const formsPerType = { 'Leave Request': 12, 'Course Evaluation': 10, 'Registration': 9, 'Research Proposal': 8, 'IT Support': 6 };
    Object.entries(formsPerType).forEach(([type, count]) => {
      const template = templates.find(t => t.title === type);
      for (let i = 0; i < count; i++) {
        const formDate = new Date(baseDate.getTime() + (Math.random() * 30 * 24 * 60 * 60 * 1000));
        formsData.push({
          submitter: studentIds[Math.floor(Math.random() * studentIds.length)]._id,
          template: template._id,
          course: course._id,
          section: sectionIds[Math.floor(Math.random() * sectionIds.length)],
          data: { 
            title: `${type} Sample ${i + 1}`,
            details: `Sample data for ${type} from student in ${sections[Math.floor(Math.random() * sections.length)].name}`
          },
          status: statuses[Math.floor(Math.random() * statuses.length)],
          reviewers: LECTURER_ID, // Directly reviewed by this lecturer
          reviewComment: Math.random() > 0.4 ? `Lecturer comment on ${type}` : undefined,
          reviewedAt: Math.random() > 0.5 ? new Date(formDate.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)) : undefined,
          attachments: Math.random() > 0.6 ? [`/attachments/${type}-${i + 1}.pdf`] : [],
          reason: Math.random() > 0.7 ? `Reason for ${type.toLowerCase()}` : undefined,
          createdAt: formDate,
          updatedAt: new Date()
        });
      }
    });

    await Form.insertMany(formsData);
    console.log('Created', formsData.length, 'fresh Forms (total ~45, linked to lecturer sections)');

    // Verify links
    const linkedForms = await Form.countDocuments({ section: { $in: sectionIds } });
    console.log('Verification: Found', linkedForms, 'forms linked to lecturer\'s sections');

    console.log('Fresh seed completed! Now login as "ครูเพ็นสรี" and check /lecturer/reports to see real data.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedFreshData();