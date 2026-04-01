const mongoose = require('mongoose');
const { SCHOOL_LEVELS, TEXTBOOK_LEVELS } = require('../constants');

const topicSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    /** 소단원 끝에 단원평가 시험이 있는지 */
    hasUnitEvaluation: { type: Boolean, default: false },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    /** 중단원 끝에 단원평가 시험이 있는지 */
    hasUnitEvaluation: { type: Boolean, default: false },
    topics: { type: [topicSchema], default: [] },
  },
  { _id: false }
);

const textbookSchema = new mongoose.Schema(
  {
    publishYear: { type: Number, required: true },
    schoolLevel: { type: String, required: true, enum: SCHOOL_LEVELS },
    /** "3학년" 등 표기 통일은 프론트에서 안내 */
    gradeLabel: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    learningLevel: { type: String, required: true, enum: TEXTBOOK_LEVELS },
    chapters: { type: [chapterSchema], default: [] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Textbook || mongoose.model('Textbook', textbookSchema);
