const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    /** 설정 식별 키 (예: bill_message_template) */
    key: { type: String, required: true, unique: true, trim: true },
    /** 설정 값 (JSON, String 등 다양한 형식 수용) */
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    /** 설정 항목에 대한 설명 */
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
