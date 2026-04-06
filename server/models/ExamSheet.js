const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  googleFileId: { type: String },
  webViewLink: { type: String },
});

const examSheetSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    schoolName: { type: String, trim: true, default: '' },
    year: { type: Number, required: true },
    semester: { 
      type: String, 
      required: true, 
      enum: ['1학기 중간', '1학기 기말', '2학기 중간', '2학기 기말', '기타'] 
    },
    subject: { type: String, required: true, trim: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    memo: { type: String, default: '', trim: true },
    attachments: [attachmentSchema], // 이미지, PDF 등 다중 첨부 파일
  },
  { timestamps: true }
);

module.exports = mongoose.models.ExamSheet || mongoose.model('ExamSheet', examSheetSchema);
