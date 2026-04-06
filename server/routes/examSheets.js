const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExamSheet = require('../models/ExamSheet');
const { requireAuth } = require('../middleware/auth');
const { uploadWithCleanup, deleteFile } = require('../services/googleDriveService');

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

// 모든 API에 관리자 인증 적용
router.use(requireAuth);

/**
 * 1. 학생별 내신 성적 목록 조회
 * GET /api/exam-sheets/by-student/:studentId
 */
router.get('/by-student/:studentId', async (req, res) => {
  try {
    const sheets = await ExamSheet.find({ student: req.params.studentId })
      .sort({ year: -1, semester: 1 });
    res.json(sheets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '성적 데이터를 불러오지 못했습니다.' });
  }
});

/**
 * 2. 특정 성적 조회
 * GET /api/exam-sheets/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const sheet = await ExamSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: '성적을 찾을 수 없습니다.' });
    res.json(sheet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '성적 데이터를 불러오지 못했습니다.' });
  }
});

/**
 * 3. 성적 등록 (멀티 파일 업로드 포함)
 * POST /api/exam-sheets
 */
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { student, schoolName, year, semester, subject, score, memo } = req.body;
    
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

    const newSheet = await ExamSheet.create({
      student,
      schoolName,
      year: Number(year),
      semester,
      subject,
      score: Number(score),
      memo,
      attachments
    });

    res.status(201).json(newSheet);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: '성적 등록에 실패했습니다.', detail: err.message });
  }
});

/**
 * 4. 성적 및 첨부파일 정보 업데이트 (기존 파일 유지 + 새 파일 추가)
 * PUT /api/exam-sheets/:id
 * 참고: 프론트에서 기존 파일의 삭제 처리가 필요할 수도 있지만, 
 * 1차 구현에서는 단순 덧붙이거나 점수 변경 용도로 구현.
 */
router.put('/:id', upload.array('files', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolName, year, semester, subject, score, memo, existingFiles } = req.body;

    const sheet = await ExamSheet.findById(id);
    if (!sheet) return res.status(404).json({ message: '성적을 찾을 수 없습니다.' });

    // 삭제되지 않고 남은 기존 파일들 필터링
    let parsedExistingFiles = [];
    if (existingFiles) {
      try {
        parsedExistingFiles = JSON.parse(existingFiles);
      } catch (e) {
        if (Array.isArray(existingFiles)) parsedExistingFiles = existingFiles;
      }
    }
    
    // 유지되는 파일 필터링
    const retainedAttachments = sheet.attachments.filter(att => 
      parsedExistingFiles.includes(att.filename)
    );

    // 새롭게 추가된 파일 구글 드라이브 업로드 
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

    // 최종 파일 배열
    const finalAttachments = [...retainedAttachments, ...newAttachments];

    sheet.schoolName = schoolName !== undefined ? schoolName : sheet.schoolName;
    sheet.year = year !== undefined ? Number(year) : sheet.year;
    sheet.semester = semester !== undefined ? semester : sheet.semester;
    sheet.subject = subject !== undefined ? subject : sheet.subject;
    sheet.score = score !== undefined ? Number(score) : sheet.score;
    sheet.memo = memo !== undefined ? memo : sheet.memo;
    sheet.attachments = finalAttachments;

    await sheet.save();
    res.json(sheet);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: '성적 수정에 실패했습니다.' });
  }
});

/**
 * 5. 성적 삭제
 * DELETE /api/exam-sheets/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const sheet = await ExamSheet.findByIdAndDelete(req.params.id);
    if (!sheet) return res.status(404).json({ message: '성적을 찾을 수 없습니다.' });

    // 실제 파일 삭제 처리 (드라이브 및 로컬)
    for (const file of sheet.attachments) {
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
    console.error(err);
    res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
