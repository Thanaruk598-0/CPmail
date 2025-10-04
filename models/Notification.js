const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["form", "announcement", "system"] },
    message: { type: String },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
