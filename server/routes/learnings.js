const express = require('express');
const StudentLearning = require('../models/StudentLearning');
const Textbook = require('../models/Textbook');
const { LEARNING_TYPE_ORDER, UNIT_STATUSES } = require('../constants');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function sortUnitsByChapterOrder(units) {
  return [...units].sort((a, b) => a.chapterOrder - b.chapterOrder);
}

/**
 * 학생별 학습 목록 — 학습종류 순서는 항상 LEARNING_TYPE_ORDER
 */
router.get('/by-student/:studentId', async (req, res) => {
  try {
    const list = await StudentLearning.find({ student: req.params.studentId })
      .populate('textbook')
      .lean();

    const orderMap = Object.fromEntries(LEARNING_TYPE_ORDER.map((t, i) => [t, i]));
    list.sort((a, b) => orderMap[a.learningType] - orderMap[b.learningType]);

    for (const row of list) {
      row.units = sortUnitsByChapterOrder(row.units || []);
    }

    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '학습 목록을 불러오지 못했습니다.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await StudentLearning.findById(req.params.id).populate('textbook').lean();
    if (!doc) {
      return res.status(404).json({ message: '학습 정보를 찾을 수 없습니다.' });
    }
    doc.units = sortUnitsByChapterOrder(doc.units || []);
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '학습 조회에 실패했습니다.' });
  }
});

/**
 * 교재 단원으로 초기 진행 행 생성
 */
router.post('/', async (req, res) => {
  try {
    const { student, learningType, textbook: textbookId } = req.body;
    if (!LEARNING_TYPE_ORDER.includes(learningType)) {
      return res.status(400).json({ message: '유효하지 않은 학습종류입니다.' });
    }

    const textbook = await Textbook.findById(textbookId);
    if (!textbook) {
      return res.status(404).json({ message: '교재를 찾을 수 없습니다.' });
    }

    const chapters = [...textbook.chapters].sort((a, b) => a.order - b.order);
    const units = chapters.map((ch) => ({
      chapterOrder: ch.order,
      status: '학습예정',
      startedAt: null,
      completedAt: null,
      unitEvaluationResult: '',
    }));

    const created = await StudentLearning.create({
      student,
      learningType,
      textbook: textbookId,
      units,
    });

    const populated = await StudentLearning.findById(created._id).populate('textbook').lean();
    populated.units = sortUnitsByChapterOrder(populated.units || []);
    return res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: '이미 동일한 학습(학생·종류·교재)이 등록되어 있습니다.' });
    }
    console.error(err);
    return res.status(400).json({ message: '학습 등록에 실패했습니다.', detail: err.message });
  }
});

/**
 * 단원 진행 상태·날짜·단원평가 결과 부분 수정
 */
router.patch('/:id/units/:chapterOrder', async (req, res) => {
  try {
    const chapterOrder = Number(req.params.chapterOrder);
    const { status, startedAt, completedAt, unitEvaluationResult } = req.body;

    const learning = await StudentLearning.findById(req.params.id);
    if (!learning) {
      return res.status(404).json({ message: '학습 정보를 찾을 수 없습니다.' });
    }

    const unit = learning.units.find((u) => u.chapterOrder === chapterOrder);
    if (!unit) {
      return res.status(404).json({ message: '해당 단원을 찾을 수 없습니다.' });
    }

    if (status !== undefined) {
      if (!UNIT_STATUSES.includes(status)) {
        return res.status(400).json({ message: '유효하지 않은 진행 상태입니다.' });
      }
      unit.status = status;
    }
    if (startedAt !== undefined) unit.startedAt = startedAt ? new Date(startedAt) : null;
    if (completedAt !== undefined) unit.completedAt = completedAt ? new Date(completedAt) : null;
    if (unitEvaluationResult !== undefined) unit.unitEvaluationResult = unitEvaluationResult;

    await learning.save();
    const populated = await StudentLearning.findById(learning._id).populate('textbook').lean();
    populated.units = sortUnitsByChapterOrder(populated.units || []);
    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '단원 수정에 실패했습니다.', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await StudentLearning.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: '학습 정보를 찾을 수 없습니다.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
