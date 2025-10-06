const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const {
  User,
  Course,
  Section,
  FormTemplate,
  Form,
  Announcement,
  Notification,
} = require("./models");

const dbURI = "mongodb://127.0.0.1:27017/CPmail_DB";

async function main() {
  try {
    await mongoose.connect(dbURI);
    console.log("MongoDB connected");

    // ลบข้อมูลเก่า
    await User.deleteMany({});
    await Course.deleteMany({});
    await Section.deleteMany({});
    await FormTemplate.deleteMany({});
    await Form.deleteMany({});
    await Announcement.deleteMany({});
    await Notification.deleteMany({});

    // 🔹 Admin
    const adminPass = await bcrypt.hash("admin123", 10);
    const admin = await new User({
      name: "System Admin",
      email: "admin@cp-mail.com",
      universityId: "000000001",
      role: "admin",
      passwordHash: adminPass,
    }).save();

    // 🔹 Lecturer
    const lecturerPass = await bcrypt.hash("lect1234", 10);
    const lecturer = await new User({
      name: "Prof. Alice",
      email: "alice@cp-mail.com",
      universityId: "111111111",
      role: "lecturer",
      passwordHash: lecturerPass,
      mustChangePassword: true,
    }).save();

    // 🔹 Courses
    const coursesData = [
      {
        courseId: "CS101",
        name: "Introduction to CS",
        description: "Basic CS course",
        credits: 3,
        semester: "1/2025",
      },
      {
        courseId: "MA101",
        name: "Calculus I",
        description: "Basic Math course",
        credits: 3,
        semester: "1/2025",
      },
    ];

    const courses = [];
    for (let c of coursesData) {
      const course = new Course({
        ...c,
        sections: [],
        lecturers: [lecturer._id],
      });
      await course.save();
      courses.push(course);
    }

    // 🔹 Sections
const allSections = [];
for (let course of courses) {
  for (let i = 1; i <= 2; i++) {
    const section = new Section({
      name: `Section ${i}`,   // ✅ ใช้ backtick ครอบ
      course: course._id,
      students: [],
      lecturers: [lecturer._id],
      semester: course.semester,
      year: 2025,
      maxStudents: 50,
    });
    await section.save();
    allSections.push(section);
    course.sections.push(section._id);
    await course.save();
  }
}

    // 🔹 Students
    const studentsData = [
      {
        name: "BabyShark",
        email: "babyshark@kkumail.com",
        universityId: "663380598-0",
        password: "12345678",
      },
      {
        name: "LittleMermaid",
        email: "littlemermaid@kkumail.com",
        universityId: "663380599-0",
        password: "87654321",
      },
    ];

    const students = [];
    for (let s of studentsData) {
      const passwordHash = await bcrypt.hash(s.password, 10);
      const student = new User({
        name: s.name,
        email: s.email,
        universityId: s.universityId,
        role: "student",
        passwordHash,
        courses: courses.map((c) => c._id),
        sections: allSections.map((sec) => sec._id),
        mustChangePassword: true,
      });
      await student.save();

      // เพิ่มนักเรียนเข้า Sections
      for (let sec of allSections) {
        sec.students.push(student._id);
        await sec.save();
      }
      students.push(student);
    }

    // 🔹 FormTemplates (4 อัน)
    const formTemplates = [];
    formTemplates.push(
      await new FormTemplate({
        title: "Leave Request - Sick",
        fields: [
          { label: "Reason", type: "text" },
          { label: "Date", type: "date" },
          { label: "Medical Certificate", type: "file" },
        ],
        allowedRoles: ["student"],
      }).save()
    );

    formTemplates.push(
      await new FormTemplate({
        title: "Leave Request - Personal",
        fields: [
          { label: "Reason", type: "textarea" },
          { label: "Date", type: "date" },
        ],
        allowedRoles: ["student"],
      }).save()
    );

    formTemplates.push(
      await new FormTemplate({
        title: "Vacation Request",
        fields: [
          { label: "Start Date", type: "date" },
          { label: "End Date", type: "date" },
          { label: "Destination", type: "text" },
        ],
        allowedRoles: ["student"],
      }).save()
    );

    formTemplates.push(
      await new FormTemplate({
        title: "Resignation Request",
        fields: [
          { label: "Reason for Resignation", type: "textarea" },
          { label: "Effective Date", type: "date" },
        ],
        allowedRoles: ["student"],
      }).save()
    );

    // 🔹 Forms (BabyShark ส่ง 5 อัน)
    await Form.insertMany([
      {
        submitter: students[0]._id,
        template: formTemplates[0]._id, // Sick
        course: courses[0]._id,
        section: allSections[0]._id,
        data: { Reason: "Fever", Date: "2025-10-10" },
        status: "cancelled",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[1]._id, // Personal
        course: courses[1]._id,
        section: allSections[1]._id,
        data: { Reason: "Family event", Date: "2025-10-12" },
        status: "pending",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[2]._id, // Vacation
        course: courses[0]._id,
        section: allSections[0]._id,
        data: {
          "Start Date": "2025-10-15",
          "End Date": "2025-10-20",
          Destination: "Phuket",
        },
        status: "approved",
        reviewers: [admin._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[3]._id, // Resignation
        course: courses[1]._id,
        section: allSections[1]._id,
        data: {
          "Reason for Resignation": "Health issues",
          "Effective Date": "2025-11-01",
        },
        status: "pending",
        reviewers: [admin._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[0]._id, // อีกครั้ง Sick
        course: courses[0]._id,
        section: allSections[0]._id,
        data: { Reason: "Migraine", Date: "2025-10-22" },
        status: "rejected",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[0]._id, // Sick
        course: courses[0]._id,
        section: allSections[0]._id,
        data: { Reason: "Fever", Date: "2025-10-10" },
        status: "cancelled",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[1]._id, // Personal
        course: courses[1]._id,
        section: allSections[1]._id,
        data: { Reason: "Family event", Date: "2025-10-12" },
        status: "pending",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[2]._id, // Vacation
        course: courses[0]._id,
        section: allSections[0]._id,
        data: {
          "Start Date": "2025-10-15",
          "End Date": "2025-10-20",
          Destination: "Phuket",
        },
        status: "approved",
        reviewers: [admin._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[3]._id, // Resignation
        course: courses[1]._id,
        section: allSections[1]._id,
        data: {
          "Reason for Resignation": "Health issues",
          "Effective Date": "2025-11-01",
        },
        status: "pending",
        reviewers: [admin._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[0]._id, // อีกครั้ง Sick
        course: courses[0]._id,
        section: allSections[0]._id,
        data: { Reason: "Migraine", Date: "2025-10-22" },
        status: "rejected",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[0]._id, // Sick
        course: courses[0]._id,
        section: allSections[0]._id,
        data: { Reason: "Fever", Date: "2025-10-10" },
        status: "cancelled",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[1]._id, // Personal
        course: courses[1]._id,
        section: allSections[1]._id,
        data: { Reason: "Family event", Date: "2025-10-12" },
        status: "pending",
        reviewers: [lecturer._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[2]._id, // Vacation
        course: courses[0]._id,
        section: allSections[0]._id,
        data: {
          "Start Date": "2025-10-15",
          "End Date": "2025-10-20",
          Destination: "Phuket",
        },
        status: "approved",
        reviewers: [admin._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[3]._id, // Resignation
        course: courses[1]._id,
        section: allSections[1]._id,
        data: {
          "Reason for Resignation": "Health issues",
          "Effective Date": "2025-11-01",
        },
        status: "pending",
        reviewers: [admin._id],
      },
      {
        submitter: students[0]._id,
        template: formTemplates[0]._id, // อีกครั้ง Sick
        course: courses[0]._id,
        section: allSections[0]._id,
        data: { Reason: "Migraine", Date: "2025-10-22" },
        status: "rejected",
        reviewers: [lecturer._id],
      },
    ]);

    // 🔹 Announcements (3 อัน)
    await Announcement.insertMany([
      {
        lecturer: lecturer._id,
        course: courses[0]._id,
        section: allSections[0]._id,
        title: "Midterm Exam",
        content: "Midterm exam will be held on Oct 20th.",
        pinned: true,
        expiresAt: new Date("2025-12-31"),
        audience: [{ type: "role", role: "student" }],
      },
      {
        lecturer: lecturer._id,
        course: courses[1]._id,
        section: allSections[1]._id,
        title: "Group Project",
        content: "Please form groups of 3 for the final project.",
        pinned: false,
        expiresAt: new Date("2025-12-15"),
        audience: [{ type: "section", section: allSections[1]._id }],
      },
      {
        lecturer: lecturer._id,
        course: courses[0]._id,
        section: allSections[0]._id,
        title: "Holiday Notice",
        content: "No classes on Oct 25th (public holiday).",
        pinned: false,
        expiresAt: new Date("2025-11-01"),
        audience: [{ type: "role", role: "student" }],
      },
    ]);

    // 🔹 Notifications (3 อัน)
    await Notification.insertMany([
      {
        user: students[0]._id,
        type: "form",
        message: "Your sick leave request has been submitted.",
        link: "/forms",
      },
      {
        user: students[0]._id,
        type: "announcement",
        message: "New announcement: Midterm Exam.",
        link: "/announcements",
      },
      {
        user: students[0]._id,
        type: "system",
        message: "System maintenance on Oct 30th.",
        link: "/system",
      },
      {
        user: students[0]._id,
        type: "form",
        message: "Your sick leave request has been submitted.",
        link: "/forms",
      },
      {
        user: students[0]._id,
        type: "announcement",
        message: "New announcement: Midterm Exam.",
        link: "/announcements",
      },
      {
        user: students[0]._id,
        type: "system",
        message: "System maintenance on Oct 30th.",
        link: "/system",
      },
    ]);

    await User.deleteMany({});
    await Course.deleteMany({});
    await Section.deleteMany({});
    await FormTemplate.deleteMany({});
    await Form.deleteMany({});
    await Announcement.deleteMany({});
    await Notification.deleteMany({});

    console.log("✅ Seed data inserted successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

main();