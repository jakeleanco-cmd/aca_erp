const mongoose = require('mongoose');
const {
  FORMATIVE_CATEGORIES,
  FORMATIVE_EXAM_TYPES,
  MIDTERM_PREP_EXAM_TYPES,
  SCHOOL_LEVELS,
} = require('../constants');

const examPaperSchema = new mongoose.Schema(
  {
    /** 시험지 제목 */
    title: { type: String, required: true, trim: true },
    /** 대분류: 형성평가 | 내신준비평가 */
    category: {
      type: String,
      required: true,
      enum: FORMATIVE_CATEGORIES,
    },
    /** 소분류 */
    examType: {
      type: String,
      required: true,
      enum: [...FORMATIVE_EXAM_TYPES, ...MIDTERM_PREP_EXAM_TYPES],
    },
    /** 학교급 */
    schoolLevel: { type: String, enum: SCHOOL_LEVELS, default: '중등' },
    /** 학년 */
    gradeLabel: { type: String, default: '', trim: true },
    /** 학기: 1학기 | 2학기 | 기타 */
    semester: { type: String, enum: ['', '1학기', '2학기', '기타'], default: '' },
    /** 수준 */
    level: { type: String, default: '', trim: true },
    /** 총 문항수 (기본값) */
    totalQuestions: { type: Number, default: 0, min: 0 },
    /** 첨부파일 (원본 시험지) */
    attachments: [{
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
      path: { type: String, required: true },
    }],
    /** 메모 */
    memo: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ExamPaper || mongoose.model('ExamPaper', examPaperSchema);
