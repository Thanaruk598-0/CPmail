const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ชื่อ Section
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // อ้างอิงวิชา
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // นักศึกษา
  lecturers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // อาจารย์
  semester: { type: String, required: true }, // เอาจาก Course, ไม่แก้เอง
  year: { type: Number, required: true, min: 2000 }, // ปีการศึกษา
  maxStudents: { type: Number, default: 50, min: 1 },
  schedule: { type: String },
  room: { type: String }
}, { timestamps: true });

sectionSchema.index({ course: 1 });
const Section = mongoose.model("Section", sectionSchema);
module.exports = Section;
