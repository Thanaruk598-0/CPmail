// seed.js
const mongoose = require("mongoose");
const User = require("./models/User");
const Course = require("./models/Course");
const Section = require("./models/Section");
const FormTemplate = require("./models/FormTemplate");
const Form = require("./models/Form");

async function seed() {
  await mongoose.connect("mongodb://localhost:27017/CPmail");

  console.log("🚀 Connected to MongoDB");

  try {
    // ล้างข้อมูลเก่า
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Section.deleteMany({}),
      FormTemplate.deleteMany({}),
      Form.deleteMany({})
    ]);

    // 👩‍🎓 Users
    const student = await User.create({
      studentId: "6530001",
      name: "สมชาย นักศึกษา",
      email: "student@example.com",
      phone: "0812345678",
      role: "student",
      passwordHash: "hashedpassword123"
    });

    const lecturer = await User.create({
      studentId: "L001",
      name: "อาจารย์สมหญิง",
      email: "lecturer@example.com",
      role: "lecturer",
      passwordHash: "hashedpassword123"
    });

    const admin = await User.create({
      studentId: "A001",
      name: "เจ้าหน้าที่ฝ่ายวิชาการ",
      email: "admin@example.com",
      role: "admin",
      passwordHash: "hashedpassword123"
    });

    // 📚 Course + Section
    const course = await Course.create({
      courseId: "CS101",
      name: "Introduction to Computer Science",
      description: "รายวิชาเบื้องต้นทางคอมพิวเตอร์",
      credits: 3,
      semester: "1/2567",
      lecturers: [lecturer._id],
    });

    const section = await Section.create({
      name: "A",
      course: course._id,
      students: [student._id],
      lecturers: [lecturer._id],
      semester: "1/2567",
      year: 2024,
      maxStudents: 50,
      schedule: "จันทร์ 09:00-12:00",
      room: "CS101"
    });

    // 📑 FormTemplates
    const templates = await FormTemplate.insertMany([
      {
        title: "ฟอร์มลา (Leave Request)",
        category: "Request",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { labels: ["ชื่อ", "นามสกุล"], type: "text", required: true },
          { labels: ["รหัสนักศึกษา"], type: "text", required: true },
          { label: "ประเภทการลา", type: "radio", required: true, options: ["ลาป่วย", "ลากิจ", "ลากิจพิเศษ"] },
          { label: "วันที่เริ่มลา", type: "date", required: true },
          { label: "วันที่สิ้นสุด", type: "date", required: true },
          { label: "เหตุผลการลา", type: "textarea", required: true }
        ]
      },
      {
        title: "ฟอร์มลาอบรม/สัมมนา",
        category: "Request",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { labels: ["ชื่อ", "นามสกุล"], type: "text", required: true },
          { label: "ชื่อกิจกรรม", type: "text", required: true },
          { label: "หน่วยงานที่จัด", type: "text" },
          { label: "สถานที่จัด", type: "text" },
          { label: "วันที่เริ่มต้น", type: "date" },
          { label: "วันที่สิ้นสุด", type: "date" },
          { label: "วัตถุประสงค์", type: "textarea" },
          { label: "ไฟล์แนบ", type: "file" }
        ]
      },
      {
        title: "ฟอร์มขอเพิ่ม/ถอนวิชา",
        category: "Academic",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { label: "รหัสวิชา", type: "text", required: true },
          { label: "ชื่อวิชา", type: "text" },
          { label: "ประเภท", type: "radio", options: ["เพิ่มวิชา", "ถอนวิชา"] },
          { label: "เหตุผล", type: "textarea" }
        ]
      },
      {
        title: "ฟอร์มคำร้องเลื่อนสอบ",
        category: "Request",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { label: "รายวิชา", type: "text", required: true },
          { label: "วันที่สอบเดิม", type: "date", required: true },
          { label: "วันที่เสนอใหม่", type: "date" },
          { label: "เหตุผล", type: "textarea", required: true }
        ]
      },
      {
        title: "แบบประเมินการสอนอาจารย์",
        category: "Evaluation",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { label: "ชื่ออาจารย์ผู้สอน", type: "text", required: true },
          { label: "ความเข้าใจในเนื้อหา", type: "radio", options: ["ดีมาก", "ดี", "พอใช้", "ปรับปรุง"] },
          { label: "การใช้สื่อการสอน", type: "radio", options: ["เหมาะสม", "ปานกลาง", "ควรปรับปรุง"] },
          { label: "ข้อเสนอแนะเพิ่มเติม", type: "textarea" }
        ]
      },
      {
        title: "แบบสำรวจความพึงพอใจบริการคณะ",
        category: "Survey",
        status: "Active",
        allowedRoles: ["student", "lecturer"],
        fields: [
          { label: "การให้บริการของเจ้าหน้าที่", type: "radio", options: ["ดีมาก", "ดี", "พอใช้", "ปรับปรุง"] },
          { label: "ความรวดเร็วในการให้บริการ", type: "radio", options: ["รวดเร็ว", "ปานกลาง", "ช้า"] },
          { label: "ข้อเสนอแนะ", type: "textarea" }
        ]
      }
    ]);

    // 📝 Forms (สร้างการส่งจริง 1–2 ต่อ template)
    const forms = await Form.insertMany([
      {
        submitter: student._id,
        template: templates[0]._id,
        course: course._id,
        section: section._id,
        data: {
          "ชื่อ": "สมชาย",
          "นามสกุล": "นักศึกษา",
          "ประเภทการลา": "ลาป่วย",
          "วันที่เริ่มลา": "2025-10-15",
          "วันที่สิ้นสุด": "2025-10-16",
          "เหตุผลการลา": "ไม่สบาย"
        },
        priority: "high",
        status: "pending",
        reviewers: [lecturer._id]
      },
      {
        submitter: student._id,
        template: templates[2]._id,
        data: {
          "รหัสวิชา": "CS101",
          "ชื่อวิชา": "Introduction to Computer Science",
          "ประเภท": "ถอนวิชา",
          "เหตุผล": "ตารางเรียนชน"
        },
        priority: "medium",
        status: "approved",
        reviewers: [lecturer._id, admin._id]
      }
    ]);

    console.log("✅ Seed data created successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();
