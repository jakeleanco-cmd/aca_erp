const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormativeExam = require('../models/FormativeExam');
const { requireAuth } = require('../middleware/auth');
const { uploadWithCleanup, deleteFile } = require('../services/googleDriveService');
const {
  FORMATIVE_CATEGORIES,
  FORMATIVE_EXAM_TYPES,
  MIDTERM_PREP_EXAM_TYPES,
  DEFAULT_QUESTION_COUNTS,
} = require('../constants');

const router = express.Router();

// 업로드 디렉토리 설정 (Vercel에서는 /tmp 사용)
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error('업로드 디렉토리 생성 실패:', err);
  }
}

// Multer 스토리지 설정
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(requireAuth);

/**
 * 전체 목록 조회 (필터 지원)
 */
router.get('/', async (req, res) => {
  try {
    const { category, examType, studentId } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (examType) filter.examType = examType;
    if (studentId) filter.student = studentId;

    const list = await FormativeExam.find(filter)
      .populate('student', 'name schoolLevel gradeLabel')
      .populate('examPaper')
      .sort({ examDate: -1 })
      .lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '평가 목록을 불러오지 못했습니다.' });
  }
});

/**
 * 학생별 평가 목록 조회
 */
router.get('/by-student/:studentId', async (req, res) => {
  try {
    const { category, examType } = req.query;
    const filter = { student: req.params.studentId };
    if (category) filter.category = category;
    if (examType) filter.examType = examType;

    const list = await FormativeExam.find(filter)
      .populate('examPaper')
      .sort({ examDate: -1 })
      .lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '평가 목록을 불러오지 못했습니다.' });
  }
});

/**
 * 상수 정보 반환
 */
router.get('/constants', async (req, res) => {
  return res.json({
    FORMATIVE_CATEGORIES,
    FORMATIVE_EXAM_TYPES,
    MIDTERM_PREP_EXAM_TYPES,
    DEFAULT_QUESTION_COUNTS,
  });
});

/**
 * 평가 등록 (파일 업로드 지원)
 */
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const {
      category, examType, title, student, examPaper,
      schoolLevel, gradeLabel, level,
      totalQuestions, correctCount, score,
      examDate, semester, examPeriod,
      schoolName, chapterName, memo,
    } = req.body;

    // 구글 드라이브 업로드 처리 
    const attachments = [];
    for (const file of (req.files || [])) {
      const driveData = await uploadWithCleanup(file);
      attachments.push({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: driveData.webViewLink,
        googleFileId: driveData.id,
        webViewLink: driveData.webViewLink
      });
    }

    let finalScore = score || 0;
    if (totalQuestions > 0 && correctCount !== undefined) {
      finalScore = Math.round((correctCount / totalQuestions) * 100);
    }

    const exam = await FormativeExam.create({
      category,
      examType,
      title: title || `${examType}${level ? ' - ' + level : ''}`,
      student,
      examPaper: examPaper || null,
      schoolLevel,
      gradeLabel,
      level,
      totalQuestions: totalQuestions || 0,
      correctCount: correctCount || 0,
      score: finalScore,
      examDate,
      semester,
      examPeriod,
      schoolName,
      chapterName,
      memo,
      attachments
    });

    const populated = await FormativeExam.findById(exam._id)
      .populate('student', 'name schoolLevel gradeLabel')
      .populate('examPaper')
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '평가 등록에 실패했습니다.', detail: err.message });
  }
});

/**
 * 평가 수정 (파일 업데이트 지원)
 */
router.put('/:id', upload.array('files', 10), async (req, res) => {
  try {
    const exam = await FormativeExam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
    }

    const { existingFiles } = req.body;
    let parsedExistingFiles = [];
    if (existingFiles) {
      try {
        parsedExistingFiles = JSON.parse(existingFiles);
      } catch (e) {
        if (Array.isArray(existingFiles)) parsedExistingFiles = existingFiles;
      }
    }

    // 유지되는 파일 필터링
    const retainedAttachments = exam.attachments.filter(att => 
      parsedExistingFiles.includes(att.filename)
    );

    // 새 파일 구글 드라이브 업로드 
    const newAttachments = [];
    for (const file of (req.files || [])) {
      try {
        const driveData = await uploadWithCleanup(file);
        newAttachments.push({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: driveData.webViewLink,
          googleFileId: driveData.id,
          webViewLink: driveData.webViewLink
        });
      } catch (uploadErr) {
        console.error('파일 업로드 중 에러:', uploadErr);
      }
    }

    const fields = [
      'category', 'examType', 'title', 'student', 'examPaper', 'schoolLevel', 'gradeLabel',
      'level', 'totalQuestions', 'correctCount', 'score',
      'examDate', 'semester', 'examPeriod',
      'schoolName', 'chapterName', 'memo',
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        exam[f] = req.body[f];
      }
    }

    if (exam.totalQuestions > 0 && exam.correctCount !== undefined) {
      exam.score = Math.round((exam.correctCount / exam.totalQuestions) * 100);
    }

    exam.attachments = [...retainedAttachments, ...newAttachments];

    await exam.save();
    const populated = await FormativeExam.findById(exam._id)
      .populate('student', 'name schoolLevel gradeLabel')
      .populate('examPaper')
      .lean();

    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '평가 수정에 실패했습니다.' });
  }
});

/**
 * 평가 삭제 (파일 실제 삭제 포함)
 */
router.delete('/:id', async (req, res) => {
  try {
    const exam = await FormativeExam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
    }

    // 파일 삭제 (드라이브 및 로컬)
    for (const file of exam.attachments) {
      if (file.googleFileId) {
        await deleteFile(file.googleFileId);
      } else {
        const filePath = path.join(uploadDir, file.filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch(e) {}
        }
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
