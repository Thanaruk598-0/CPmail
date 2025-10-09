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
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending",
  },

  reviewers: { type: Schema.Types.ObjectId, ref: "User" },
  reviewComment: { type: String },
  reviewedAt: { type: Date },
  reviewUpdatedAt: { type: Date }, 

  attachments: [{ type: String }],
  reason: { type: String },
  cancellationReason: { type: String },
},
  { timestamps: true } 
);

module.exports = mongoose.model("Form", formSchema);