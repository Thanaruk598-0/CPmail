const mongoose = require("mongoose");
const { Schema } = mongoose;

const formTemplateSchema = new Schema({
  title: { type: String, required: true },
  fields: [{ type: Schema.Types.Mixed }],
  allowedRoles: [{ type: String }],
});

module.exports = mongoose.model("FormTemplate", formTemplateSchema);