// models/FormTemplate.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const formTemplateSchema = new Schema(
  {
    title: { type: String, required: true },          // ชื่อเทมเพลต
    description: { type: String },                    // คำอธิบาย
    category: {                                       // หมวดหมู่
      type: String,
      enum: ["Academic", "Administrative", "Evaluation", "Request", "Survey"],
      required: true,
    },
    status: {                                         // สถานะของ "แม่แบบ"
      type: String,
      enum: ["Active", "Inactive", "Draft"],
      default: "Draft",
    },
    allowedRoles: [{ type: String }],                 // สิทธิ์ที่ส่งแบบฟอร์มนี้ได้
    // โครงสร้างช่องฟิลด์แบบยืดหยุ่น
    // เช่น {type:'text', label:'เหตุผลลา', placeholder:'...', required:true}
    fields: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true }                                // มี createdAt / updatedAt
);

module.exports = mongoose.model("FormTemplate", formTemplateSchema);