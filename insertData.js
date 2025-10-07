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

    // เคลียร์ข้อมูลเดิม
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Section.deleteMany({}),
      FormTemplate.deleteMany({}),
      Form.deleteMany({}),
      Announcement.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // 🔹 Admin
    const admin = await new User({
      name: "System Admin",
      email: "admin@cp-mail.com",
      universityId: "000000001",
      role: "admin",
      passwordHash: await bcrypt.hash("admin123", 10),
    }).save();

    // 🔹 Lecturer
    const lecturer = await new User({
      name: "Prof. Alice",
      email: "alice@cp-mail.com",
      universityId: "111111111",
      role: "lecturer",
      passwordHash: await bcrypt.hash("lect1234", 10),
      mustChangePassword: true,
      major: "Computer Science",
    }).save();

    // 🔹 Courses
    const coursesData = [
      { courseId: "CS101", name: "Introduction to CS", description: "Basic CS course", credits: 3, semester: "1/2025" },
      { courseId: "MA101", name: "Calculus I", description: "Basic Math course", credits: 3, semester: "1/2025" },
      { courseId: "CS102", name: "Introduction to IT", description: "Basic IT course", credits: 3, semester: "1/2025" },
      { courseId: "CS103", name: "Introduction to Programming", description: "Basic Programming course", credits: 3, semester: "1/2025" },
    ];

    const courses = [];
    for (const c of coursesData) {
      const course = await new Course({ ...c, sections: [], lecturers: [lecturer._id] }).save();
      courses.push(course);
    }

    // 🔹 Sections (2 ต่อคอร์ส)
    const allSections = [];
    for (const course of courses) {
      for (let i = 1; i <= 2; i++) {
        const sec = await new Section({
          name: `Section ${i}`,
          course: course._id,
          students: [],
          lecturers: [lecturer._id],
          semester: course.semester,
          year: 2025,
          maxStudents: 50,
        }).save();
        allSections.push(sec);
        course.sections.push(sec._id);
        await course.save();
      }
    }

    // 🔹 Students
    const students = [];

    // 1) BabyShark -> ยังไม่ลงทะเบียนเรียน (courses/sections ว่าง)
    const babyShark = await new User({
      name: "BabyShark",
      email: "babyshark@kkumail.com",
      universityId: "663380598-0",
      role: "student",
      passwordHash: await bcrypt.hash("12345678", 10),
      mustChangePassword: false,
      dateOfBirth: new Date("2004-03-10"),
      major: "Computer Science",
      yearOfStudy: 2,
      courses: [],       // ❗ ว่าง
      sections: [],      // ❗ ว่าง
    }).save();
    students.push(babyShark);

    // 2) LittleMermaid -> ลงทะเบียน CS101 Sec2 + MA101 Sec1
    const littleMermaid = await new User({
      name: "LittleMermaid",
      email: "littlemermaid@kkumail.com",
      universityId: "663380599-0",
      role: "student",
      passwordHash: await bcrypt.hash("87654321", 10),
      mustChangePassword: false,
      dateOfBirth: new Date("2003-11-22"),
      major: "Information Technology",
      yearOfStudy: 3,
      courses: [courses[0]._id, courses[1]._id],
      sections: [allSections[1]._id, allSections[2]._id], // CS101 Sec2, MA101 Sec1
    }).save();
    students.push(littleMermaid);

    // อัปเดต sections ให้มี LittleMermaid เป็นสมาชิก
    allSections[1].students.push(littleMermaid._id);
    allSections[2].students.push(littleMermaid._id);
    await allSections[1].save();
    await allSections[2].save();

    // 🔹 FormTemplates (ใช้ฟิลด์ title ตามสคีมา)
    const formTemplates = await FormTemplate.insertMany([
      {
        title: "Leave Request - Sick",
        fields: [{ label: "Reason", type: "text" }, { label: "Date", type: "date" }, { label: "Medical Certificate", type: "file" }],
        allowedRoles: ["student"],
      },
      {
        title: "Leave Request - Personal",
        fields: [{ label: "Reason", type: "textarea" }, { label: "Date", type: "date" }],
        allowedRoles: ["student"],
      },
      {
        title: "Vacation Request",
        fields: [{ label: "Start Date", type: "date" }, { label: "End Date", type: "date" }, { label: "Destination", type: "text" }],
        allowedRoles: ["student"],
      },
      {
        title: "Resignation Request",
        fields: [{ label: "Reason for Resignation", type: "textarea" }, { label: "Effective Date", type: "date" }],
        allowedRoles: ["student"],
      },
    ]);

    // 🔹 Forms
    const statuses = ["pending", "approved", "rejected", "cancelled"];
    const formsData = [];

    // BabyShark 15 ฟอร์ม (แม้ยังไม่ลงทะเบียนก็ส่งฟอร์มได้)
    for (let i = 0; i < 15; i++) {
      formsData.push({
        submitter: babyShark._id,
        template: formTemplates[i % 4]._id,
        course: i % 2 === 0 ? courses[0]._id : courses[1]._id,
        section: i % 2 === 0 ? allSections[0]._id : allSections[3]._id,
        data: { Reason: `Reason ${i + 1}`, Date: `2025-10-${String(10 + i).padStart(2, "0")}` },
        status: statuses[i % 4],
        reviewers: i % 2 === 0 ? lecturer._id : admin._id, // ❗ ObjectId เดี่ยว ตามสคีมา
      });
    }

    // LittleMermaid 10 ฟอร์ม
    for (let i = 0; i < 10; i++) {
      formsData.push({
        submitter: littleMermaid._id,
        template: formTemplates[i % 4]._id,
        course: i % 2 === 0 ? courses[0]._id : courses[1]._id,
        section: i % 2 === 0 ? allSections[1]._id : allSections[2]._id,
        data: { Reason: `Reason ${i + 1}`, Date: `2025-10-${String(12 + i).padStart(2, "0")}` },
        status: statuses[i % 4],
        reviewers: i % 2 === 0 ? lecturer._id : admin._id, // ❗ ObjectId เดี่ยว
      });
    }

    await Form.insertMany(formsData);

    // 🔹 Announcements (โครงตามที่ใช้อยู่)
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
        section: allSections[3]._id,
        title: "Group Project",
        content: "Please form groups of 3 for the final project.",
        pinned: false,
        expiresAt: new Date("2025-12-15"),
        audience: [{ type: "section", section: allSections[3]._id }],
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

    // 🔹 Notifications
    await Notification.insertMany([
      { user: babyShark._id, type: "form", message: "Your sick leave request has been submitted.", link: "/forms" },
      { user: babyShark._id, type: "announcement", message: "New announcement: Midterm Exam.", link: "/announcements" },
      { user: babyShark._id, type: "system", message: "System maintenance on Oct 30th.", link: "/system" },
      { user: littleMermaid._id, type: "form", message: "Your personal leave request has been submitted.", link: "/forms" },
      { user: littleMermaid._id, type: "announcement", message: "New announcement: Group Project.", link: "/announcements" },
      { user: littleMermaid._id, type: "system", message: "System maintenance on Oct 30th.", link: "/system" },
    ]);

    console.log("✅ Seed data inserted successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

main();
