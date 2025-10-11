const mongoose = require("mongoose");
const { Schema } = mongoose;

const formTemplateSchema = new Schema({
  title: { type: String, required: true },
  fields: [{ type: Schema.Types.Mixed }],
  allowedRoles: [{ type: String }],
  targetRoles: [{ type: String }],

  description: { type: String },
  category: {
    type: String
    , enum: ["Academic", "Administrative", "Evaluation", "Request", "Survey"]
    , required: true
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Draft"],
    default: "Draft",
  }
}
  , { timestamps: true });

module.exports = mongoose.model("FormTemplate", formTemplateSchema);
