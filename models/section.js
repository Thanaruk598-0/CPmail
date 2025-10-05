const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ชื่อ Section (เช่น A, B)
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // อ้างอิงวิชา
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // นักศึกษาใน Section
  lecturers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // อาจารย์ของ Section (array)
  semester: { type: String, required: true }, // ภาคการศึกษา (e.g., 1/2567)
  year: { type: Number, required: true, min: 2000 }, // ปีการศึกษา (auto จาก semester)
  maxStudents: { type: Number, default: 50, min: 1 }, // จำนวนผู้เรียนสูงสุด
  schedule: { type: String }, // วันเวลาเรียน (e.g., "จันทร์ 13:00-15:00, พุธ 14:00-16:00")
  room: { type: String } // ห้องเรียน (e.g., "CS101")
}, { timestamps: true });

sectionSchema.index({ course: 1 });
const Section = mongoose.model("Section", sectionSchema);
module.exports = Section;