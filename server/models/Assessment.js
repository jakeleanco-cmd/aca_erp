const mongoose = require('mongoose');
const { ASSESSMENT_TYPES } = require('../constants');

const assessmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentLearning: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentLearning',
      required: true,
    },
    type: { type: String, required: true, enum: ASSESSMENT_TYPES },
    /** 단원평가일 때 해당 단원 order (과정평가는 null 가능) */
    chapterOrder: { type: Number, default: null },
    result: { type: String, default: '', trim: true },
    assessedAt: { type: Date, required: true },
    memo: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema);
