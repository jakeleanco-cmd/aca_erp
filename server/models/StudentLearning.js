const mongoose = require('mongoose');
const { LEARNING_TYPE_ORDER, UNIT_STATUSES } = require('../constants');

const unitProgressSchema = new mongoose.Schema(
  {
    chapterOrder: { type: Number, required: true },
    status: { type: String, required: true, enum: UNIT_STATUSES },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    /** 단원평가 결과 메모/점수 (자유 형식) */
    unitEvaluationResult: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const studentLearningSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    learningType: { type: String, required: true, enum: LEARNING_TYPE_ORDER },
    textbook: { type: mongoose.Schema.Types.ObjectId, ref: 'Textbook', required: true },
    units: { type: [unitProgressSchema], default: [] },
  },
  { timestamps: true }
);

studentLearningSchema.index({ student: 1, learningType: 1, textbook: 1 }, { unique: true });

module.exports =
  mongoose.models.StudentLearning ||
  mongoose.model('StudentLearning', studentLearningSchema);
