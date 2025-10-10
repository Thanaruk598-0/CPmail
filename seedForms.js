const mongoose = require("mongoose");
const Form = require("./models/Form");
const FormTemplate = require("./models/FormTemplate");

// 🧩 เชื่อมต่อ MongoDB Local
mongoose.connect("mongodb://localhost:27017/CPmail")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

async function seed() {
  try {
    // ล้างข้อมูลเก่า
    await Form.deleteMany();
    await FormTemplate.deleteMany();
    console.log("🧹 ล้างข้อมูลเก่าเรียบร้อย");

    // ✅ SEED: FormTemplate
    const templates = await FormTemplate.insertMany([
      {
        _id: new mongoose.Types.ObjectId("68e2a55808fabfc023668b52"),
        title: "แบบประเมินรายวิชา",
        description: "สำหรับนักศึกษาใช้ประเมินรายวิชาและอาจารย์ผู้สอน",
        category: "Evaluation",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { type: "number", label: "คะแนนความพึงพอใจ (1-5)", required: true },
          { type: "textarea", label: "ข้อเสนอแนะเพิ่มเติม" },
        ],
      },
      {
        title: "แบบฟอร์มขอลาเรียน",
        description: "สำหรับนักศึกษาที่ต้องการลาเรียน เนื่องจากเหตุจำเป็น",
        category: "Request",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { type: "text", label: "เหตุผลการลา", required: true },
          { type: "date", label: "วันที่เริ่มลา", required: true },
          { type: "date", label: "วันที่สิ้นสุดการลา", required: true },
        ],
      },
      {
        title: "แบบฟอร์มขอใช้ห้องเรียน",
        description: "ใช้สำหรับอาจารย์หรือเจ้าหน้าที่ที่ต้องการจองห้องเรียน",
        category: "Administrative",
        status: "Active",
        allowedRoles: ["lecturer", "staff"],
        fields: [
          { type: "text", label: "ชื่อห้องที่ต้องการจอง", required: true },
          { type: "date", label: "วันที่จอง", required: true },
          { type: "time", label: "เวลาเริ่ม", required: true },
          { type: "time", label: "เวลาสิ้นสุด", required: true },
        ],
      },
      {
        title: "แบบสำรวจความพึงพอใจต่อการให้บริการ",
        description: "สำหรับนักศึกษาใช้ประเมินการให้บริการของมหาวิทยาลัย",
        category: "Survey",
        status: "Active",
        allowedRoles: ["student"],
        fields: [
          { type: "radio", label: "พึงพอใจต่อการบริการ", options: ["มาก", "ปานกลาง", "น้อย"], required: true },
          { type: "textarea", label: "ข้อเสนอแนะเพิ่มเติม" },
        ],
      },
      {
        title: "แบบฟอร์มรายงานปัญหาด้านเทคนิค",
        description: "แจ้งปัญหาที่เกิดขึ้นกับระบบ CPmail หรือระบบออนไลน์อื่น ๆ",
        category: "Administrative",
        status: "Active",
        allowedRoles: ["student", "lecturer"],
        fields: [
          { type: "text", label: "หัวข้อปัญหา", required: true },
          { type: "textarea", label: "รายละเอียดปัญหา", required: true },
        ],
      },
    ]);

    console.log(`✅ สร้าง FormTemplate แล้ว ${templates.length} รายการ`);

    // ✅ สร้าง Form ตัวอย่าง
    const forms = await Form.insertMany([
      {
        submitter: new mongoose.Types.ObjectId("68dfeadb383f5ee7ed45daa7"),
        template: templates[0]._id, // แบบประเมินรายวิชา
        course: new mongoose.Types.ObjectId("68e24326f8177a5cd69e3ae5"),
        section: new mongoose.Types.ObjectId("68e2438ef8177a5cd69e3af6"),
        data: { feedback: "Great course, but needs more examples.", score: 4 },
        status: "approved",
        reviewers: [new mongoose.Types.ObjectId("68e22bf2cc29a5143ed2e8c5")],
        comments: [
          {
            user: new mongoose.Types.ObjectId("68e22bf2cc29a5143ed2e8c5"),
            message: "Approved, thanks for the feedback!",
            createdAt: new Date("2025-10-05T17:05:28.312Z"),
          },
        ],
        submittedAt: new Date("2025-10-05T17:05:28.312Z"),
      },
      {
        submitter: new mongoose.Types.ObjectId("68dfeadb383f5ee7ed45daa7"),
        template: templates[1]._id, // ฟอร์มขอลาเรียน
        data: {
          เหตุผลการลา: "ป่วยเป็นไข้",
          วันที่เริ่มลา: "2025-10-01",
          วันที่สิ้นสุดการลา: "2025-10-03",
        },
        status: "pending",
        priority: "high",
        submittedAt: new Date("2025-10-02T10:30:00.000Z"),
      },
      {
        submitter: new mongoose.Types.ObjectId("68e22bf2cc29a5143ed2e8c5"),
        template: templates[2]._id, // ฟอร์มขอใช้ห้องเรียน
        data: {
          ชื่อห้องที่ต้องการจอง: "CS101",
          วันที่จอง: "2025-10-12",
          เวลาเริ่ม: "09:00",
          เวลาสิ้นสุด: "11:00",
        },
        status: "approved",
        submittedAt: new Date("2025-10-10T15:00:00.000Z"),
      },
      {
        submitter: new mongoose.Types.ObjectId("68dfeadb383f5ee7ed45daa7"),
        template: templates[3]._id, // แบบสำรวจความพึงพอใจ
        data: {
          พึงพอใจต่อการบริการ: "มาก",
          ข้อเสนอแนะเพิ่มเติม: "อยากให้เพิ่มช่องบริการออนไลน์อีก",
        },
        status: "approved",
        submittedAt: new Date("2025-10-09T08:00:00.000Z"),
      },
      {
        submitter: new mongoose.Types.ObjectId("68e22bf2cc29a5143ed2e8c5"),
        template: templates[4]._id, // รายงานปัญหาด้านเทคนิค
        data: {
          หัวข้อปัญหา: "ไม่สามารถส่งอีเมลได้",
          รายละเอียดปัญหา: "ขึ้น error 'SMTP connection failed'",
        },
        status: "pending",
        priority: "medium",
        submittedAt: new Date("2025-10-07T11:15:00.000Z"),
      },
    ]);

    console.log(`📄 สร้างฟอร์มแล้ว ${forms.length} รายการ`);

    mongoose.connection.close();
    console.log("🔒 ปิดการเชื่อมต่อ MongoDB แล้ว ✅");

  } catch (err) {
    console.error("❌ Error while seeding:", err);
  }
}

seed();
