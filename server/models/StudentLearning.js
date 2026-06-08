const mongoose = require('mongoose');
const {
  LEARNING_TYPE_ORDER,
  UNIT_STATUSES,
  LEARNING_STATUSES,
} = require('../constants');

const topicProgressSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    status: { type: String, default: '학습예정' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    hasUnitEvaluation: { type: Boolean, default: false },
    result: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const unitProgressSchema = new mongoose.Schema(
  {
    chapterOrder: { type: Number, required: true },
    status: { type: String, required: true, enum: UNIT_STATUSES },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    /** 단원 전체 요약 결과 */
    unitEvaluationResult: { type: String, default: '', trim: true },
    /** 개별 소주제별 상세 기록 */
    topics: { type: [topicProgressSchema], default: [] },
  },
  { _id: false }
);

const studentLearningSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    learningType: { type: String, required: true, enum: LEARNING_TYPE_ORDER },
    textbook: { type: mongoose.Schema.Types.ObjectId, ref: 'Textbook', required: true },
    status: { type: String, required: true, enum: LEARNING_STATUSES, default: '진행중' },
    startedAt: { type: Date, default: null }, // 과정별 시작날짜
    units: { type: [unitProgressSchema], default: [] },
  },
  { timestamps: true }
);

studentLearningSchema.index({ student: 1, learningType: 1, textbook: 1 }, { unique: true });

module.exports =
  mongoose.models.StudentLearning ||
  mongoose.model('StudentLearning', studentLearningSchema);
