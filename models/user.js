const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    avatarUrl: { type: String, default: "/uploads/default.jpg" },
    universityId: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date },
    yearOfStudy: {
      type: Number,
      validate: {
        validator: function (v) {
          if (this.role === "student") return v != null;
          return true;
        },
        message: "yearOfStudy is required for students",
      },
    },
    major: {
      type: String,
      validate: {
        validator: function (v) {
          if (this.role === "student" || this.role === "lecturer")
            return v != null;
          return true;
        },
        message: "branch is required for students and lecturers",
      },
    },
    address: { type: String },
    role: {
      type: String,
      enum: ["student", "lecturer", "admin"],
      required: true,
    },
    passwordHash: { type: String, required: true },
    courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    sections: [{ type: Schema.Types.ObjectId, ref: "Section" }],
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);