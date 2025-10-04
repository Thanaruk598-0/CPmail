const mongoose = require("mongoose");
const { Schema } = mongoose;

const courseSchema = new Schema({
  courseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  credits: { type: Number },
  semester: { type: String },
  sections: [{ type: Schema.Types.ObjectId, ref: "Section" }],
  lecturers: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("Course", courseSchema);
