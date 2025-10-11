// seedForms.js
const mongoose = require("mongoose");
const FormTemplate = require("./models/FormTemplate");
const Form = require("./models/Form");
const User = require("./models/User"); // สมมติมี model User
const Course = require("./models/Course");
const Section = require("./models/Section");

async function seed() {
  await mongoose.connect("mongodb://localhost:27017/CPmail", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected to MongoDB");

  // หาอาจารย์
  const lecturer = await User.findOne({ email: "teacher@mail.com" });
  if (!lecturer) {
    console.log("Lecturer not found. Seed users first.");
    return;
  }

  // ตัวอย่างผู้เรียน
  const student = await User.findOne({ studentId: "663380" });
  if (!student) {
    console.log("Student not found. Seed users first.");
    return;
  }

  // ตัวอย่าง Template
  const template1 = await FormTemplate.create({
    title: "แบบฟอร์มลาเรียน",
    description: "ส่งขออนุมัติการลาเรียน",
    category: "Academic",
    status: "Active",
    allowedRoles: ["student"],
    fields: [
      { type: "text", label: "เหตุผล", placeholder: "ระบุเหตุผล...", required: true },
      { type: "date", label: "วันที่ลา", required: true }
    ]
  });

  const template2 = await FormTemplate.create({
    title: "ขออนุมัติอาจารย์ผู้สอน",
    description: "ส่งฟอร์มขออนุมัติการสอน",
    category: "Administrative",
    status: "Active",
    allowedRoles: ["lecturer"],
    fields: [
      { type: "text", label: "หัวข้อการสอน", placeholder: "ระบุหัวข้อ", required: true },
      { type: "number", label: "จำนวนชั่วโมง", required: true }
    ]
  });

  // ฟอร์ม: นักเรียนส่งไปหาอาจารย์
  await Form.create({
    submitter: student._id,
    template: template1._id,
    reviewers: [lecturer._id],
    data: {
      เหตุผล: "ป่วยไข้",
      วันที่ลา: "2025-10-11"
    },
    priority: "high",
    status: "pending"
  });

  // ฟอร์ม: อาจารย์ส่งไปหาใครบางคน (สมมติส่งให้ admin)
  const admin = await User.findOne({ role: "admin" });
  if (admin) {
    await Form.create({
      submitter: lecturer._id,
      template: template2._id,
      reviewers: [admin._id],
      data: {
        "หัวข้อการสอน": "Mobile App Development",
        "จำนวนชั่วโมง": 12
      },
      priority: "medium",
      status: "pending"
    });
  }

  console.log("Seed completed!");
  mongoose.connection.close();
}

seed().catch(err => console.log(err));
