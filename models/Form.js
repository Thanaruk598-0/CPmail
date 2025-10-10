const mongoose = require("mongoose");
const { Schema } = mongoose;

const formSchema = new Schema({
  submitter: { type: Schema.Types.ObjectId, ref: "User", required: true },
  template: {
    type: Schema.Types.ObjectId,
    ref: "FormTemplate",
    required: true,
  },
  course: { type: Schema.Types.ObjectId, ref: "Course" },
  section: { type: Schema.Types.ObjectId, ref: "Section" },
  data: { type: Schema.Types.Mixed },

  // ✅ เพิ่ม priority ตรงนี้
  priority: { 
    type: String, 
    enum: ["high", "medium", "low"], 
    default: "medium" 
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending",
  },
  reviewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      message: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  attachments: [{ type: String }],
  reason: { type: String },
  cancellationReason: { type: String },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
}, { timestamps: true }); // ✅ auto createdAt + updatedAt

module.exports = mongoose.model("Form", formSchema);