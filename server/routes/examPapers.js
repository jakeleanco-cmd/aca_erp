const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExamPaper = require('../models/ExamPaper');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 업로드 디렉토리 설정
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {}
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

router.use(requireAuth);

/**
 * 시험지 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const { category, examType, schoolLevel } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (examType) filter.examType = examType;
    if (schoolLevel) filter.schoolLevel = schoolLevel;

    const list = await ExamPaper.find(filter).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: '목록 조회 실패' });
  }
});

/**
 * 시험지 등록
 */
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    const { title, category, examType, schoolLevel, gradeLabel, level, totalQuestions, memo } = req.body;
    
    const attachments = (req.files || []).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/${file.filename}`
    }));

    const paper = await ExamPaper.create({
      title, category, examType, schoolLevel, gradeLabel, level,
      totalQuestions: Number(totalQuestions || 0),
      memo,
      attachments
    });

    res.status(201).json(paper);
  } catch (err) {
    res.status(400).json({ message: '등록 실패' });
  }
});

/**
 * 시험지 수정
 */
router.put('/:id', upload.array('files', 5), async (req, res) => {
  try {
    const paper = await ExamPaper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: '찾을 수 없음' });

    const { title, category, examType, schoolLevel, gradeLabel, level, totalQuestions, memo, existingFiles } = req.body;

    let parsedExisting = [];
    if (existingFiles) {
      parsedExisting = Array.isArray(existingFiles) ? existingFiles : JSON.parse(existingFiles);
    }

    const retained = paper.attachments.filter(a => parsedExisting.includes(a.filename));
    const newFiles = (req.files || []).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/${file.filename}`
    }));

    paper.title = title || paper.title;
    paper.category = category || paper.category;
    paper.examType = examType || paper.examType;
    paper.schoolLevel = schoolLevel || paper.schoolLevel;
    paper.gradeLabel = gradeLabel !== undefined ? gradeLabel : paper.gradeLabel;
    paper.level = level !== undefined ? level : paper.level;
    paper.totalQuestions = totalQuestions !== undefined ? Number(totalQuestions) : paper.totalQuestions;
    paper.memo = memo !== undefined ? memo : paper.memo;
    paper.attachments = [...retained, ...newFiles];

    await paper.save();
    res.json(paper);
  } catch (err) {
    res.status(400).json({ message: '수정 실패' });
  }
});

/**
 * 시험지 삭제
 */
router.delete('/:id', async (req, res) => {
  try {
    const paper = await ExamPaper.findByIdAndDelete(req.params.id);
    if (!paper) return res.status(404).json({ message: '찾을 수 없음' });

    paper.attachments.forEach(file => {
      const filePath = path.join(uploadDir, file.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch(e) {}
      }
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: '삭제 실패' });
  }
});

module.exports = router;
