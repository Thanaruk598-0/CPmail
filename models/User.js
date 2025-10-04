const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    avatarUrl: { type: String },
    universityId: { type: String },
    role: {
      type: String,
      enum: ["student", "lecturer", "admin"],
      required: true,
    },
    passwordHash: { type: String, required: true },
    courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    sections: [{ type: Schema.Types.ObjectId, ref: "Section" }],
    mustChangePassword: { type: Boolean, default: true },
    settings: {
      dailyEmail: { type: Boolean, default: true },
      notificationsOn: { type: Boolean, default: true },
    },
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
