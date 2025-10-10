const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  studentId: { type: String, unique: true }, 
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, 
  phone: { type: String }, 
  avatarUrl: { type: String }, 
  role: { type: String, enum: ["student", "lecturer", "admin"], required: true }, 
  passwordHash: { type: String, required: true }, 
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  sections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Section" }], 
  mustChangePassword: { type: Boolean, default: true }, 
  settings: {
    dailyEmail: { type: Boolean, default: true }, 
    notificationsOn: { type: Boolean, default: true }
  },
  lastLogin: { type: Date }, 
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
module.exports = User;