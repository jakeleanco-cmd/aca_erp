const mongoose = require('mongoose');
const { SCHOOL_LEVELS } = require('../constants');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    status: { 
      type: String, 
      enum: ['대기', '재원', '퇴원'], 
      default: '재원' 
    },
    schoolLevel: { type: String, required: true, enum: SCHOOL_LEVELS },
    gradeLabel: { type: String, required: true, trim: true },
    monthlyTuition: { type: Number, required: true, min: 0 },
    classSlotIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClassSlot' }],
    cashReceiptPhone: { type: String, default: '', trim: true },
    enrolledAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
    lastCounselingAt: { type: Date, default: null },
    lastStudyRecordUpdatedAt: { type: Date, default: null },
    cashReceiptUse: { type: String, enum: ['사용', '미사용'], default: '사용' },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Student || mongoose.model('Student', studentSchema);
