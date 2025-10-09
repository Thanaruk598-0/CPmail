const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true }, // รหัสวิชา เช่น CS101
  name: { type: String, required: true }, // ชื่อวิชา
  description: { type: String }, // คำอธิบายรายวิชา
  credits: { type: Number, required: true, min: 0 }, // จำนวนหน่วยกิต
  semester: { type: String, required: true }, // ภาคการศึกษาหลักของวิชา (เช่น "1/2567")
  sections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Section" }], // Section ของรายวิชา
  lecturers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // อาจารย์ผู้สอน
}, { timestamps: true });

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;