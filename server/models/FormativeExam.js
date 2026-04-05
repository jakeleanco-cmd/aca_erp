const mongoose = require('mongoose');
const {
  FORMATIVE_CATEGORIES,
  FORMATIVE_EXAM_TYPES,
  MIDTERM_PREP_EXAM_TYPES,
  SCHOOL_LEVELS,
} = require('../constants');

const formativeExamSchema = new mongoose.Schema(
  {
    /** 대분류: 형성평가 | 내신준비평가 */
    category: {
      type: String,
      required: true,
      enum: FORMATIVE_CATEGORIES,
    },
    /** 소분류: 레벨평가, 과정평가, 단원평가 ... 또는 최다빈출, 서술형 ... */
    examType: {
      type: String,
      required: true,
      enum: [...FORMATIVE_EXAM_TYPES, ...MIDTERM_PREP_EXAM_TYPES],
    },
    /** 시험 제목 (자유 입력) */
    title: { type: String, default: '', trim: true },
    /** 학생 참조 */
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    /** 학교급 */
    schoolLevel: { type: String, enum: SCHOOL_LEVELS },
    /** 학년 */
    gradeLabel: { type: String, default: '', trim: true },
    /** 수준 (과정평가: 기본/실력/심화, 단원평가: 개념~심화) */
    level: { type: String, default: '', trim: true },
    /** 총 문항수 */
    totalQuestions: { type: Number, default: 0, min: 0 },
    /** 맞은 문항수 */
    correctCount: { type: Number, default: 0, min: 0 },
    /** 점수 (백분율, 자동계산 또는 직접 입력) */
    score: { type: Number, default: 0, min: 0 },
    /** 시험 일자 */
    examDate: { type: Date, required: true },
    /** 학기 (내신평가 시 사용: 1학기/2학기) */
    semester: { type: String, default: '', trim: true },
    /** 시험구분 (내신평가: 중간고사/기말고사) */
    examPeriod: { type: String, default: '', trim: true },
    /** 학교명 (학교기출 시 사용) */
    schoolName: { type: String, default: '', trim: true },
    /** 단원명 */
    chapterName: { type: String, default: '', trim: true },
    /** 메모 */
    memo: { type: String, default: '', trim: true },
    /** 첨부파일 (이미지, PDF 등) */
    attachments: [{
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
      path: { type: String, required: true },
    }],
  },
  { timestamps: true }
);

// 학생 + 날짜 기반으로 빠른 조회를 위한 인덱스
formativeExamSchema.index({ student: 1, examDate: -1 });
formativeExamSchema.index({ category: 1, examType: 1 });

module.exports =
  mongoose.models.FormativeExam ||
  mongoose.model('FormativeExam', formativeExamSchema);
