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
    gradeLevel: { type: String, required: true, enum: SCHOOL_LEVELS },
    grade: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    learningLevel: { type: String, required: true, enum: TEXTBOOK_LEVELS },
    curriculum: { type: String, trim: true },
    semester: { type: String, trim: true },
    series: { type: String, trim: true },
    chapters: { type: [chapterSchema], default: [] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Textbook || mongoose.model('Textbook', textbookSchema);
