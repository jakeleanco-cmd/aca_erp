const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExamPaper = require('../models/ExamPaper');
const { requireAuth } = require('../middleware/auth');
const { uploadWithCleanup, deleteFile } = require('../services/googleDriveService');
const { syncLocalExams } = require('../services/examMigrationService');

const router = express.Router();

// 업로드 디렉토리 설정
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error('업로드 디렉토리 생성 실패:', err);
  }
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
 * 로컬 단말 시험지 데이터베이스 갱신/동기화 
 */
router.post('/sync-local', async (req, res) => {
  try {
    const result = await syncLocalExams();
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('동기화 실패:', error);
    res.status(500).json({ message: '동기화 중 오류가 발생했습니다.' });
  }
});

/**
 * 시험지 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const { category, examType, schoolLevel, gradeLabel, semester, examTerm, title } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (examType) filter.examType = examType;
    if (schoolLevel) filter.schoolLevel = schoolLevel;
    if (gradeLabel) filter.gradeLabel = gradeLabel;
    if (semester) filter.semester = semester;
    if (examTerm) filter.examTerm = examTerm;
    if (title) filter.title = { $regex: title, $options: 'i' };

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
    const { title, category, examType, schoolLevel, gradeLabel, semester, examTerm, level, totalQuestions, memo } = req.body;
    
    // 구글 드라이브 업로드 처리
    const attachments = [];
    for (const file of (req.files || [])) {
      const driveData = await uploadWithCleanup(file);
      attachments.push({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: driveData.webViewLink, // DB에는 웹 뷰 링크를 기본 경로로 저장
        googleFileId: driveData.id,
        webViewLink: driveData.webViewLink
      });
    }

    const paper = await ExamPaper.create({
      title, category, examType, schoolLevel, gradeLabel, semester, examTerm, level,
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

    const { title, category, examType, schoolLevel, gradeLabel, semester, examTerm, level, totalQuestions, memo, existingFiles } = req.body;

    let parsedExisting = [];
    if (existingFiles) {
      parsedExisting = Array.isArray(existingFiles) ? existingFiles : JSON.parse(existingFiles);
    }

    const retained = paper.attachments.filter(a => parsedExisting.includes(a.filename));
    
    // 새 파일 구글 드라이브 업로드
    const newFiles = [];
    for (const file of (req.files || [])) {
      try {
        const driveData = await uploadWithCleanup(file);
        newFiles.push({
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

    paper.title = title || paper.title;
    paper.category = category || paper.category;
    paper.examType = examType || paper.examType;
    paper.schoolLevel = schoolLevel || paper.schoolLevel;
    paper.gradeLabel = gradeLabel !== undefined ? gradeLabel : paper.gradeLabel;
    paper.semester = semester !== undefined ? semester : paper.semester;
    paper.examTerm = examTerm !== undefined ? examTerm : paper.examTerm;
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

    for (const file of paper.attachments) {
      if (file.googleFileId) {
        await deleteFile(file.googleFileId);
      } else {
        const filePath = path.join(uploadDir, file.filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch(e) {}
        }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: '삭제 실패' });
  }
});

/**
 * 시험지 선택 삭제 (배치)
 */
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '삭제할 ID가 없습니다.' });
    }

    const papers = await ExamPaper.find({ _id: { $in: ids } });
    
    for (const paper of papers) {
      // 파일 삭제 (드라이브 및 로컬)
      if (paper.attachments) {
        for (const file of paper.attachments) {
          if (file.googleFileId) {
            await deleteFile(file.googleFileId);
          } else {
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch(e) {}
          }
        }
      }
      await ExamPaper.findByIdAndDelete(paper._id);
    }

    res.json({ ok: true, count: papers.length });
  } catch (err) {
    res.status(500).json({ message: '배치 삭제 실패' });
  }
});

/**
 * 시험지 전체 삭제
 */
router.delete('/', async (req, res) => {
  try {
    const papers = await ExamPaper.find({});
    
    for (const paper of papers) {
      if (paper.attachments) {
        for (const file of paper.attachments) {
          if (file.googleFileId) {
            await deleteFile(file.googleFileId);
          } else {
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch(e) {}
          }
        }
      }
    }

    await ExamPaper.deleteMany({});
    res.json({ ok: true, count: papers.length });
  } catch (err) {
    res.status(500).json({ message: '전체 삭제 실패' });
  }
});

module.exports = router;
