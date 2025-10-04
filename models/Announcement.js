const mongoose = require("mongoose");
const { Schema } = mongoose;

const announcementSchema = new Schema(
  {
    lecturer: { type: Schema.Types.ObjectId, ref: "User" },
    course: { type: Schema.Types.ObjectId, ref: "Course" },
    section: { type: Schema.Types.ObjectId, ref: "Section" },
    title: { type: String, required: true },
    content: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    audience: [
      {
        type: { type: String, enum: ["role", "section"], required: true },
        role: {
          type: String,
          enum: ["student", "lecturer", "admin"],
          required: function () {
            return this.type === "role";
          },
        },
        section: {
          type: Schema.Types.ObjectId,
          ref: "Section",
          required: function () {
            return this.type === "section";
          },
        },
      },
    ],
    link: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
