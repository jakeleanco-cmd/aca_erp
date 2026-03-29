const mongoose = require('mongoose');
const { SCHOOL_LEVELS } = require('../constants');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    schoolLevel: { type: String, required: true, enum: SCHOOL_LEVELS },
    gradeLabel: { type: String, required: true, trim: true },
    monthlyTuition: { type: Number, required: true, min: 0 },
    classSlotIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClassSlot' }],
    cashReceiptPhone: { type: String, default: '', trim: true },
    enrolledAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
    lastCounselingAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Student || mongoose.model('Student', studentSchema);
