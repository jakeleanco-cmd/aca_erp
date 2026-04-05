const express = require('express');
const FormativeExam = require('../models/FormativeExam');
const { requireAuth } = require('../middleware/auth');
const {
  FORMATIVE_CATEGORIES,
  FORMATIVE_EXAM_TYPES,
  MIDTERM_PREP_EXAM_TYPES,
  DEFAULT_QUESTION_COUNTS,
} = require('../constants');

const router = express.Router();
router.use(requireAuth);

/**
 * 전체 목록 조회 (필터 지원)
 * GET /api/formative-exams?category=형성평가&examType=레벨평가&studentId=xxx
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
      .sort({ examDate: -1 })
      .lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '평가 목록을 불러오지 못했습니다.' });
  }
});

/**
 * 상수 정보 반환 (프론트엔드에서 폼 구성 시 사용)
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
 * 평가 등록
 */
router.post('/', async (req, res) => {
  try {
    const {
      category, examType, title, student,
      schoolLevel, gradeLabel, level,
      totalQuestions, correctCount, score,
      examDate, semester, examPeriod,
      schoolName, chapterName, memo,
    } = req.body;

    // 맞은 개수로 점수 자동 계산 (totalQuestions > 0인 경우)
    let finalScore = score || 0;
    if (totalQuestions > 0 && correctCount !== undefined) {
      finalScore = Math.round((correctCount / totalQuestions) * 100);
    }

    const exam = await FormativeExam.create({
      category,
      examType,
      title: title || `${examType}${level ? ' - ' + level : ''}`,
      student,
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
    });

    const populated = await FormativeExam.findById(exam._id)
      .populate('student', 'name schoolLevel gradeLabel')
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '평가 등록에 실패했습니다.', detail: err.message });
  }
});

/**
 * 평가 수정
 */
router.put('/:id', async (req, res) => {
  try {
    const exam = await FormativeExam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
    }

    const fields = [
      'category', 'examType', 'title', 'schoolLevel', 'gradeLabel',
      'level', 'totalQuestions', 'correctCount', 'score',
      'examDate', 'semester', 'examPeriod',
      'schoolName', 'chapterName', 'memo',
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        exam[f] = req.body[f];
      }
    }

    // 맞은 개수로 점수 재계산
    if (exam.totalQuestions > 0 && exam.correctCount !== undefined) {
      exam.score = Math.round((exam.correctCount / exam.totalQuestions) * 100);
    }

    await exam.save();
    const populated = await FormativeExam.findById(exam._id)
      .populate('student', 'name schoolLevel gradeLabel')
      .lean();

    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '평가 수정에 실패했습니다.' });
  }
});

/**
 * 평가 삭제
 */
router.delete('/:id', async (req, res) => {
  try {
    const exam = await FormativeExam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
