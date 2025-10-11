/**
 * CPmail_DB • Seed ข้อมูลสมจริง (Thai version + targetRoles)
 * ----------------------------------------------------------------
 * สิ่งที่ทำ:
 *  - ผู้ใช้หลายบทบาท (admin/lecturer/student)
 *  - หลายวิชา หลายเซคชัน (เทอม 1/2025, 2/2025)
 *  - ฟอร์มเทมเพลต (Request/Academic/Administrative) พร้อม targetRoles
 *  - ฟอร์มจริงหลากหลายสถานะ + reviewers เลือกตาม targetRoles
 *  - ประกาศข่าว + การแจ้งเตือน เป็นข้อความภาษาไทย
 */

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

/* ------------------------------ Helper ทั่วไป ------------------------------ */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMany = (arr, n) => {
  const a = [...arr];
  const out = [];
  while (a.length && out.length < n) {
    out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  }
  return out;
};
const weightedPick = (pairs) => {
  // pairs: [{value:'pending', w:5}, ...]
  const total = pairs.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of pairs) {
    if ((r -= p.w) <= 0) return p.value;
  }
  return pairs[pairs.length - 1].value;
};
const dateStr = (d) => {
  const iso = new Date(d).toISOString();
  return iso.split("T")[0];
};
const randDateBetween = (start, end) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s));
};
const today = new Date();

/* กำหนดช่วงเวลาเทอม เพื่อสุ่ม createdAt ให้ดูสมจริง */
const SEM1 = { start: new Date("2025-08-01"), end: new Date("2025-12-31") };
const SEM2 = { start: new Date("2026-01-08"), end: new Date("2026-05-15") };

/* ------------------------------ MAIN ------------------------------ */
async function main() {
  try {
    await mongoose.connect(dbURI);
    console.log("เชื่อมต่อ MongoDB แล้ว");

    // ล้างข้อมูลเดิม
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Section.deleteMany({}),
      FormTemplate.deleteMany({}),
      Form.deleteMany({}),
      Announcement.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    /* ------------------------------ Users ------------------------------ */
    // แอดมิน
    const admin = await new User({
      name: "ผู้ดูแลระบบ",
      email: "admin@cp-mail.com",
      universityId: "000000001",
      role: "admin",
      passwordHash: await bcrypt.hash("admin123", 10),
    }).save();

    const admin2 = await new User({
      name: "แอดมินฝ่ายปฏิบัติการ",
      email: "ops.admin@cp-mail.com",
      universityId: "000000002",
      role: "admin",
      passwordHash: await bcrypt.hash("adminops123", 10),
    }).save();

    // อาจารย์
    const lecturerAlice = await new User({
      name: "รศ. อลิซ",
      email: "alice@cp-mail.com",
      universityId: "111111111",
      role: "lecturer",
      passwordHash: await bcrypt.hash("lect1234", 10),
      mustChangePassword: true,
      major: "วิทยาการคอมพิวเตอร์",
    }).save();

    const lecturerBob = await new User({
      name: "ผศ. บ๊อบ",
      email: "bob@cp-mail.com",
      universityId: "111111112",
      role: "lecturer",
      passwordHash: await bcrypt.hash("boblect999", 10),
      mustChangePassword: false,
      major: "เทคโนโลยีสารสนเทศ",
    }).save();

    const lecturerCarol = await new User({
      name: "ดร. แครอล",
      email: "carol@cp-mail.com",
      universityId: "111111113",
      role: "lecturer",
      passwordHash: await bcrypt.hash("carolpwd", 10),
      mustChangePassword: false,
      major: "คณิตศาสตร์",
    }).save();

    // นักศึกษาหลัก
    const babyShark = await new User({
      name: "BabyShark",
      email: "babyshark@kkumail.com",
      universityId: "663380598-0",
      role: "student",
      passwordHash: await bcrypt.hash("12345678", 10),
      mustChangePassword: false,
      dateOfBirth: new Date("2004-03-10"),
      major: "วิทยาการคอมพิวเตอร์",
      yearOfStudy: 2,
      courses: [],
      sections: [],
    }).save();

    const littleMermaid = await new User({
      name: "LittleMermaid",
      email: "littlemermaid@kkumail.com",
      universityId: "663380599-0",
      role: "student",
      passwordHash: await bcrypt.hash("87654321", 10),
      mustChangePassword: false,
      dateOfBirth: new Date("2003-11-22"),
      major: "เทคโนโลยีสารสนเทศ",
      yearOfStudy: 3,
    }).save();

    // กลุ่มนักศึกษาเพิ่มเติม
    const studentNames = [
      ["Taro", "taro"],
      ["Mint", "mint"],
      ["View", "view"],
      ["Boss", "boss"],
      ["Nune", "nune"],
      ["Game", "game"],
      ["Earn", "earn"],
      ["Pond", "pond"],
      ["Aom", "aom"],
      ["First", "first"],
      ["Nan", "nan"],
      ["Mew", "mew"],
      ["Peta", "peta"],
      ["Gun", "gunny"],
      ["Pim", "pim"],
      ["Ice", "ice"],
      ["Boom", "boom"],
      ["Meen", "meen"],
      ["Proud", "proud"],
      ["Yok", "yok"],
    ];

    const students = [babyShark, littleMermaid];
    for (let i = 0; i < studentNames.length; i++) {
      const [fullname, alias] = studentNames[i];
      const s = await new User({
        name: fullname,
        email: `${alias}@kkumail.com`,
        universityId: `66338${(1000 + i).toString()}-X`,
        role: "student",
        passwordHash: await bcrypt.hash("student123", 10),
        mustChangePassword: i % 7 === 0,
        dateOfBirth: new Date(
          `${2003 + (i % 2)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(10 + (i % 18)).padStart(2, "0")}`
        ),
        major: pick(["วิทยาการคอมพิวเตอร์", "เทคโนโลยีสารสนเทศ", "คณิตศาสตร์"]),
        yearOfStudy: 1 + (i % 4),
        courses: [],
        sections: [],
      }).save();
      students.push(s);
    }

    /* ------------------------------ วิชา & เซคชัน ------------------------------ */
    const coursesData = [
      {
        courseId: "CS101",
        name: "พื้นฐานวิทยาการคอมพิวเตอร์",
        description: "แนวคิดพื้นฐาน ทักษะแก้ปัญหา และภาพรวมระบบ",
        credits: 3,
        semester: "1/2025",
        lecturers: [lecturerAlice._id],
      },
      {
        courseId: "MA101",
        name: "แคลคูลัส I",
        description: "ลิมิต อนุพันธ์ ปริพันธ์ และการประยุกต์",
        credits: 3,
        semester: "1/2025",
        lecturers: [lecturerCarol._id],
      },
      {
        courseId: "CS102",
        name: "พื้นฐานเทคโนโลยีสารสนเทศ",
        description: "พื้นฐานเครือข่าย ฐานข้อมูล และความปลอดภัย",
        credits: 3,
        semester: "1/2025",
        lecturers: [lecturerBob._id, lecturerAlice._id],
      },
      {
        courseId: "CS103",
        name: "พื้นฐานการเขียนโปรแกรม",
        description: "อัลกอริทึม ชนิดข้อมูล และ Python เบื้องต้น",
        credits: 3,
        semester: "2/2025",
        lecturers: [lecturerAlice._id],
      },
      {
        courseId: "CS220",
        name: "โครงสร้างข้อมูล",
        description: "ลิสต์ ต้นไม้ กราฟ ความซับซ้อน และการนำไปใช้",
        credits: 3,
        semester: "2/2025",
        lecturers: [lecturerBob._id],
      },
    ];

    const courses = [];
    for (const c of coursesData) {
      const course = await new Course({ ...c, sections: [] }).save();
      courses.push(course);
    }

    const allSections = [];
    // สร้าง 2-3 เซคชันต่อวิชา
    for (const course of courses) {
      const secCount = course.courseId === "CS220" ? 2 : 3;
      for (let i = 1; i <= secCount; i++) {
        const sec = await new Section({
          name: `Section ${i}`,
          course: course._id,
          students: [],
          lecturers: course.lecturers,
          semester: course.semester,
          year: course.semester.endsWith("/2025") ? 2025 : 2026,
          maxStudents: 50,
        }).save();
        allSections.push(sec);
        course.sections.push(sec._id);
      }
      await course.save();
    }

    // ลงทะเบียน LittleMermaid -> CS101 Sec2 + MA101 Sec1
    const cs101 = courses.find((c) => c.courseId === "CS101");
    const ma101 = courses.find((c) => c.courseId === "MA101");
    const cs101_sec2 = allSections.find((s) => String(s.course) === String(cs101._id) && s.name === "Section 2");
    const ma101_sec1 = allSections.find((s) => String(s.course) === String(ma101._id) && s.name === "Section 1");

    littleMermaid.courses = [cs101._id, ma101._id];
    littleMermaid.sections = [cs101_sec2._id, ma101_sec1._id];
    await littleMermaid.save();

    cs101_sec2.students.push(littleMermaid._id);
    ma101_sec1.students.push(littleMermaid._id);
    await cs101_sec2.save();
    await ma101_sec1.save();

    // กระจายนักศึกษาอื่น ๆ ลงวิชาแบบสุ่มสมจริง
    for (const stu of students.filter((s) => s._id.toString() !== littleMermaid._id.toString())) {
      if (stu.email.startsWith("babyshark")) {
        // BabyShark ยังไม่ลงทะเบียน (ตรงตามโจทย์)
        continue;
      }
      const enrolledCourses = pickMany(courses, 1 + Math.floor(Math.random() * 3)); // 1-3 วิชา
      stu.courses = enrolledCourses.map((c) => c._id);

      const enrolledSections = [];
      for (const c of enrolledCourses) {
        const sectionsOfCourse = allSections.filter((s) => String(s.course) === String(c._id));
        const sPick = pick(sectionsOfCourse);
        enrolledSections.push(sPick._id);
        sPick.students.push(stu._id);
        await sPick.save();
      }
      stu.sections = enrolledSections;
      await stu.save();
      if (Math.random() < 0.1) await delay(5);
    }

    /* ------------------------------ Form Templates (ภาษาไทย + targetRoles) ------------------------------ */
    const formTemplates = await FormTemplate.insertMany([
      {
        title: "ใบคำร้องขอลาป่วย",
        description: "แบบฟอร์มลาป่วย แนบใบรับรองแพทย์ได้ (ถ้ามี)",
        fields: [
          { label: "สาเหตุ", type: "text" },
          { label: "วันที่", type: "date" },
          { label: "ใบรับรองแพทย์", type: "file" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["lecturer"], // ส่งให้อาจารย์ผู้สอนพิจารณา
        category: "Request",
        status: "Active",
      },
      {
        title: "ใบคำร้องลากิจ",
        description: "แบบฟอร์มลากิจ กรณีธุระส่วนตัว",
        fields: [
          { label: "สาเหตุ (รายละเอียด)", type: "textarea" },
          { label: "วันที่", type: "date" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["lecturer"],
        category: "Request",
        status: "Active",
      },
      {
        title: "คำร้องลาพักผ่อน",
        description: "ขอลาพักผ่อนในช่วงวันที่ที่กำหนด",
        fields: [
          { label: "วันที่เริ่ม", type: "date" },
          { label: "วันที่สิ้นสุด", type: "date" },
          { label: "ปลายทาง/สถานที่", type: "text" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["admin"], // งานธุรการ
        category: "Administrative",
        status: "Active",
      },
      {
        title: "คำร้องขอถอนรายวิชา/กิจกรรม",
        description: "ขอถอนรายวิชา หรือถอนตัวจากกิจกรรม/โครงการ",
        fields: [
          { label: "เหตุผลการถอน", type: "textarea" },
          { label: "วันที่มีผล", type: "date" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["lecturer", "admin"], // อาจารย์ + ธุรการ
        category: "Administrative",
        status: "Active",
      },
      {
        title: "อุทธรณ์ส่งงานล่าช้า",
        description: "คำร้องอุทธรณ์กรณีส่งงานล่าช้าเนื่องจากเหตุจำเป็น",
        fields: [
          { label: "ชื่องาน/งานที่ส่ง", type: "text" },
          { label: "รายวิชา", type: "text" },
          { label: "เหตุผล", type: "textarea" },
          { label: "วันที่ส่งจริง", type: "date" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["lecturer"],
        category: "Academic",
        status: "Active",
      },
      {
        title: "คำร้องขอทบทวนคะแนน",
        description: "ขอทบทวนคะแนนการบ้าน/สอบ พร้อมเหตุผลประกอบ",
        fields: [
          { label: "หัวข้อประเมิน", type: "text" },
          { label: "คะแนนที่คาดหวัง", type: "text" },
          { label: "คำชี้แจง/เหตุผล", type: "textarea" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["lecturer"],
        category: "Academic",
        status: "Active",
      },
      {
        title: "ขอยืมอุปกรณ์แลบ",
        description: "ขอยืมอุปกรณ์ห้องปฏิบัติการระยะสั้น",
        fields: [
          { label: "ชื่ออุปกรณ์", type: "text" },
          { label: "วันที่ยืม", type: "date" },
          { label: "วันที่คืน", type: "date" },
          { label: "วัตถุประสงค์", type: "textarea" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["admin"], // พัสดุ/แลบ
        category: "Administrative",
        status: "Active",
      },
      {
        title: "ลงทะเบียนเข้าร่วมกิจกรรม",
        description: "ลงทะเบียนกิจกรรม/เวิร์กช็อปของภาควิชา",
        fields: [
          { label: "ชื่อกิจกรรม", type: "text" },
          { label: "ช่วงเวลาที่สะดวก", type: "text" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["lecturer", "admin"], // งานกิจกรรม
        category: "Administrative",
        status: "Active",
      },
      {
        title: "ขอฝึกงาน (Internship)",
        description: "เสนอที่ฝึกงาน พร้อมข้อมูลบริษัท/ช่วงเวลา เพื่อขออนุมัติ",
        fields: [
          { label: "ชื่อบริษัท", type: "text" },
          { label: "ตำแหน่ง", type: "text" },
          { label: "วันเริ่มฝึก", type: "date" },
          { label: "วันสิ้นสุดฝึก", type: "date" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["lecturer", "admin"], // มักต้องทั้งอาจารย์และธุรการ
        category: "Academic",
        status: "Active",
      },
      {
        title: "เบิกค่าเดินทาง",
        description: "ขอเบิกค่าเดินทาง/ภารกิจนอกสถานที่",
        fields: [
          { label: "วัตถุประสงค์การเดินทาง", type: "textarea" },
          { label: "วันที่เดินทาง", type: "date" },
          { label: "จำนวนเงิน", type: "text" },
          { label: "ไฟล์หลักฐาน/ใบเสร็จ", type: "file" },
        ],
        allowedRoles: ["student"],
        targetRoles: ["admin"], // การเงิน/ธุรการ
        category: "Administrative",
        status: "Active",
      },
    ]);

    /* ------------------------------ เลือกผู้พิจารณาให้ตรง targetRoles ------------------------------ */
    const allAdmins = [admin, admin2];
    const allLecturers = [lecturerAlice, lecturerBob, lecturerCarol];

    function getLecturersFor(courseObj, sectionObj) {
      // ให้ความสำคัญอาจารย์ที่ผูกกับ section ก่อน ถ้าไม่มีค่อยดึงจาก course
      if (sectionObj?.lecturers?.length) return sectionObj.lecturers;
      if (courseObj?.lecturers?.length) return courseObj.lecturers;
      return [];
    }

    function asObjectIds(arr) {
      return arr.map((u) => (u._id ? u._id : u)); // รองรับทั้ง object และ ObjectId
    }

    /**
     * เลือกผู้พิจารณา (reviewer) หนึ่งคน ตาม targetRoles ของเทมเพลต
     * - มี 'lecturer' ⇒ ใช้อาจารย์ของ section/course
     * - มี 'admin'    ⇒ ใช้แอดมิน
     * - มีทั้งสอง     ⇒ รวมเป็นพูลเดียวแล้วสุ่ม 1
     * - ไม่มี/หาไม่ได้ ⇒ fallback สุ่มจากอาจารย์+แอดมินทั้งหมด
     */
    function getReviewerFor(tpl, courseObj, sectionObj) {
      const targets = tpl.targetRoles || [];
      const candidateIds = new Set();

      if (targets.includes("lecturer")) {
        const lecIds = getLecturersFor(courseObj, sectionObj);
        lecIds.forEach((id) => candidateIds.add(String(id)));
      }
      if (targets.includes("admin")) {
        asObjectIds(allAdmins).forEach((id) => candidateIds.add(String(id)));
      }

      if (candidateIds.size === 0) {
        const fallback = pick([...allAdmins, ...allLecturers]);
        return fallback._id;
      }

      const ids = Array.from(candidateIds);
      return ids[Math.floor(Math.random() * ids.length)];
    }

    /* ------------------------------ ตัวช่วยสร้าง data ของฟอร์ม (สอดคล้อง label ภาษาไทย) ------------------------------ */
    const mkDataByTemplate = (tpl, courseObj, sectionObj) => {
      const obj = {};
      for (const f of tpl.fields) {
        switch (f.label) {
          case "สาเหตุ":
          case "สาเหตุ (รายละเอียด)":
          case "เหตุผล":
          case "เหตุผลการถอน":
          case "คำชี้แจง/เหตุผล":
          case "วัตถุประสงค์":
          case "วัตถุประสงค์การเดินทาง":
            obj[f.label] = pick([
              "ป่วยกะทันหัน มีใบรับรองแพทย์",
              "ธุระครอบครัวด่วน",
              "ปัญหาการเดินทาง/รถเสีย",
              "เข้าร่วมกิจกรรมของคณะ",
              "ติดสัมภาษณ์งาน/ฝึกงาน",
            ]);
            break;

          case "วันที่":
          case "วันที่ยืม":
          case "วันที่คืน":
          case "วันที่มีผล":
          case "วันเริ่มฝึก":
          case "วันสิ้นสุดฝึก":
          case "วันที่เดินทาง":
          case "วันที่ส่งจริง":
            obj[f.label] = dateStr(randDateBetween(SEM1.start, SEM1.end));
            break;

          case "ใบรับรองแพทย์":
          case "ไฟล์หลักฐาน/ใบเสร็จ":
            obj[f.label] = pick(["certificate_001.pdf", "receipt_351.jpg", "ไม่มีไฟล์"]);
            break;

          case "ปลายทาง/สถานที่":
            obj[f.label] = pick(["เชียงใหม่", "กรุงเทพฯ", "ขอนแก่น", "ภูเก็ต"]);
            break;

          case "หัวข้อประเมิน":
          case "ชื่องาน/งานที่ส่ง":
            obj[f.label] = pick(["Midterm", "Project Report", "Lab 3", "Quiz 2"]);
            break;

          case "คะแนนที่คาดหวัง":
            obj[f.label] = pick(["B+", "A", "A-"]);
            break;

          case "รายวิชา":
            obj[f.label] = courseObj ? courseObj.name : pick(courses).name;
            break;

          case "ชื่อบริษัท":
            obj[f.label] = pick(["Construction Lines Co., Ltd.", "DataNest", "GreenTech", "ThaiSoft"]);
            break;

          case "ตำแหน่ง":
            obj[f.label] = pick(["HR Intern", "IT Support Intern", "Data Intern", "Comms Intern"]);
            break;

          case "ชื่ออุปกรณ์":
            obj[f.label] = pick(["Raspberry Pi Kit", "ขาตั้งกล้อง", "กล้อง DSLR", "เครื่องบันทึกเสียง"]);
            break;

          case "ชื่อกิจกรรม":
            obj[f.label] = pick(["Git Workshop", "UI/UX Bootcamp", "AI for Beginners", "Math Clinic"]);
            break;

          case "ช่วงเวลาที่สะดวก":
            obj[f.label] = pick(["09:00-11:00", "13:00-15:00", "15:30-17:30"]);
            break;

          case "จำนวนเงิน":
            obj[f.label] = `${(200 + Math.floor(Math.random() * 800)).toString()} บาท`;
            break;

          default:
            obj[f.label] = pick(["-", "ไม่ระบุ", "N/A"]);
        }
      }
      // แนบ id วิชา/เซคชันใน data เพื่อ query บนหน้า UI ได้สะดวก (ถ้าสคีมาไม่ได้ใช้ก็ไม่เป็นไร)
      if (courseObj) obj["_courseId"] = courseObj._id.toString();
      if (sectionObj) obj["_sectionId"] = sectionObj._id.toString();
      return obj;
    };

    /* ------------------------------ สร้างฟอร์มจริง (สมจริง + reviewer ตาม targetRoles) ------------------------------ */
    const statusWeights = [
      { value: "pending", w: 6 },
      { value: "approved", w: 5 },
      { value: "rejected", w: 2 },
      { value: "cancelled", w: 1 },
    ];

    const formsToInsert = [];

    // ฟอร์มของ BabyShark (แม้ยังไม่ลงทะเบียนก็ให้ส่งได้)
    for (let i = 0; i < 15; i++) {
      const tpl = formTemplates[i % formTemplates.length];
      const course = pick([cs101, ma101, pick(courses)]);
      const secCandidates = allSections.filter((s) => String(s.course) === String(course._id));
      const section = pick(secCandidates);
      const status = weightedPick(statusWeights);
      const createdAt = randDateBetween(SEM1.start, today);
      formsToInsert.push({
        submitter: babyShark._id,
        template: tpl._id,
        course: course._id,
        section: section?._id,
        data: mkDataByTemplate(tpl, course, section),
        status,
        reviewers: getReviewerFor(tpl, course, section), // <-- เลือกตาม targetRoles
        createdAt,
        updatedAt: createdAt,
      });
    }

    // ฟอร์มของ LittleMermaid (ยึดวิชาที่ลงจริง)
    for (let i = 0; i < 12; i++) {
      const tpl = pick(formTemplates);
      const course = pick([cs101, ma101]);
      const section = String(course._id) === String(cs101._id) ? cs101_sec2 : ma101_sec1;
      const status = weightedPick(statusWeights);
      const createdAt = randDateBetween(SEM1.start, today);
      formsToInsert.push({
        submitter: littleMermaid._id,
        template: tpl._id,
        course: course._id,
        section: section._id,
        data: mkDataByTemplate(tpl, course, section),
        status,
        reviewers: getReviewerFor(tpl, course, section), // <-- เลือกตาม targetRoles
        createdAt,
        updatedAt: createdAt,
      });
    }

    // นักศึกษาคนอื่น ๆ: คนละ 1-4 ฟอร์ม
    for (const stu of students.filter(
      (s) =>
        s._id.toString() !== littleMermaid._id.toString() &&
        s._id.toString() !== babyShark._id.toString()
    )) {
      const count = 1 + Math.floor(Math.random() * 4);
      for (let k = 0; k < count; k++) {
        const tpl = pick(formTemplates);
        let course = null;
        let section = null;
        if (stu.courses?.length) {
          course = pick(courses.filter((c) => stu.courses.map(String).includes(String(c._id))));
          const secs = allSections.filter((s) => String(s.course) === String(course._id));
          section = pick(secs);
        } else {
          course = pick(courses);
          const secs = allSections.filter((s) => String(s.course) === String(course._id));
          section = pick(secs);
        }
        const status = weightedPick(statusWeights);
        const window = Math.random() < 0.25 ? SEM2 : SEM1; // บางส่วนไปอยู่เทอม 2/2025
        const createdAt = randDateBetween(window.start, window.end);
        formsToInsert.push({
          submitter: stu._id,
          template: tpl._id,
          course: course._id,
          section: section?._id,
          data: mkDataByTemplate(tpl, course, section),
          status,
          reviewers: getReviewerFor(tpl, course, section), // <-- เลือกตาม targetRoles
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    await Form.insertMany(formsToInsert);

    /* ------------------------------ ประกาศข่าว (ภาษาไทย) ------------------------------ */
    const annToInsert = [
      {
        lecturer: lecturerAlice._id,
        course: cs101._id,
        section: cs101_sec2._id,
        title: "ประกาศสอบกลางภาค",
        content: "สอบกลางภาควันที่ 20 ต.ค. ครอบคลุมบทที่ 1–5 โปรดนำบัตรนิสิตนักศึกษามาด้วย",
        pinned: true,
        expiresAt: new Date("2025-12-31"),
        audience: [{ type: "role", role: "student" }],
        createdAt: randDateBetween(new Date("2025-09-25"), new Date("2025-10-10")),
      },
      {
        lecturer: lecturerCarol._id,
        course: ma101._id,
        section: ma101_sec1._id,
        title: "โปรเจกต์กลุ่ม",
        content: "จัดกลุ่ม 3 คน และส่งหัวข้อภายใน 5 พ.ย.",
        pinned: false,
        expiresAt: new Date("2025-12-15"),
        audience: [{ type: "section", section: ma101_sec1._id }],
        createdAt: randDateBetween(new Date("2025-10-01"), new Date("2025-11-01")),
      },
      {
        lecturer: lecturerAlice._id,
        course: cs101._id,
        section: cs101_sec2._id,
        title: "หยุดวันนักขัตฤกษ์",
        content: "งดเรียนวันที่ 25 ต.ค. (วันหยุดนักขัตฤกษ์)",
        pinned: false,
        expiresAt: new Date("2025-11-01"),
        audience: [{ type: "role", role: "student" }],
        createdAt: new Date("2025-10-15"),
      },
      {
        lecturer: lecturerBob._id,
        course: courses.find((c) => c.courseId === "CS102")._id,
        section: allSections.find(
          (s) => String(s.course) === String(courses.find((c) => c.courseId === "CS102")._id) && s.name === "Section 1"
        )._id,
        title: "การใช้อุปกรณ์แลบ",
        content: "โปรดใช้อุปกรณ์ด้วยความระมัดระวัง หากชำรุดแจ้งผ่านฟอร์ม 'ขอยืมอุปกรณ์แลบ' ทันที",
        pinned: false,
        expiresAt: new Date("2025-12-20"),
        audience: [{ type: "role", role: "student" }],
        createdAt: randDateBetween(new Date("2025-09-10"), new Date("2025-11-30")),
      },
    ];
    await Announcement.insertMany(annToInsert);

    /* ------------------------------ การแจ้งเตือน (ภาษาไทย) ------------------------------ */
    const notifBase = [
      { type: "system", message: "ระบบจะปิดปรับปรุงวันที่ 30 ต.ค.", link: "/system" },
      { type: "announcement", message: "ประกาศใหม่: สอบกลางภาค", link: "/announcements" },
      { type: "announcement", message: "ประกาศใหม่: โปรเจกต์กลุ่ม", link: "/announcements" },
      { type: "form", message: "คำร้องของคุณถูกส่งเรียบร้อยแล้ว", link: "/forms" },
    ];

    const notifications = [];
    // แจ้งเตือนสำหรับผู้ใช้หลัก 2 คน
    for (const base of notifBase) {
      notifications.push({ user: babyShark._id, ...base, createdAt: randDateBetween(SEM1.start, today) });
      notifications.push({ user: littleMermaid._id, ...base, createdAt: randDateBetween(SEM1.start, today) });
    }
    // กระจายให้ผู้ใช้อื่นแบบสุ่ม 0-3 รายการ
    for (const stu of students) {
      const k = Math.floor(Math.random() * 4);
      for (let i = 0; i < k; i++) {
        notifications.push({
          user: stu._id,
          ...pick(notifBase),
          createdAt: randDateBetween(SEM1.start, today),
        });
      }
    }
    await Notification.insertMany(notifications);

    console.log("✅ ใส่ข้อมูล Seed สำเร็จ (Thai + targetRoles)!");
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

main();
