const mongoose = require("mongoose");
const { Schema } = mongoose;

const sectionSchema = new Schema({
  name: { type: String, required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  students: [{ type: Schema.Types.ObjectId, ref: "User" }],
  lecturers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  semester: { type: String },
  year: { type: Number },
  maxStudents: { type: Number },
}, { timestamps: true }
);

module.exports = mongoose.model("Section", sectionSchema);
