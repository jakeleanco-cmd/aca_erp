const express = require('express');
const StudentLearning = require('../models/StudentLearning');
const Textbook = require('../models/Textbook');
const {
  LEARNING_TYPE_ORDER,
  UNIT_STATUSES,
  LEARNING_STATUSES,
} = require('../constants');
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
      /** 교재에 정의된 소주제 목록으로 초기 상태 생성 */
      topics: (ch.topics || []).map(topicTitle => ({
        title: topicTitle,
        status: '학습예정',
        startedAt: null,
        completedAt: null,
        result: ''
      }))
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
 * 학습 전체 정보 수정 (주로 status 변경)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (status && !LEARNING_STATUSES.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 학습 상태입니다.' });
    }

    const doc = await StudentLearning.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('textbook').lean();

    if (!doc) {
      return res.status(404).json({ message: '학습 정보를 찾을 수 없습니다.' });
    }
    
    const sortUnitsByChapterOrder = (units) => {
      return [...units].sort((a, b) => a.chapterOrder - b.chapterOrder);
    };
    
    doc.units = sortUnitsByChapterOrder(doc.units || []);
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '학습 수정에 실패했습니다.' });
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

/**
 * 특정 소주제(topic)의 정보 수정
 */
router.patch('/:id/units/:chapterOrder/topics/:topicIndex', async (req, res) => {
  try {
    const chapterOrder = Number(req.params.chapterOrder);
    const topicIndex = Number(req.params.topicIndex);
    const { status, startedAt, completedAt, result } = req.body;

    const learning = await StudentLearning.findById(req.params.id);
    if (!learning) {
      return res.status(404).json({ message: '학습 정보를 찾을 수 없습니다.' });
    }

    const unit = learning.units.find((u) => u.chapterOrder === chapterOrder);
    if (!unit) {
      return res.status(404).json({ message: '단원을 찾을 수 없습니다.' });
    }

    const topic = unit.topics[topicIndex];
    if (!topic) {
      return res.status(404).json({ message: '소주제를 찾을 수 없습니다.' });
    }

    if (status !== undefined) topic.status = status;
    if (startedAt !== undefined) topic.startedAt = startedAt ? new Date(startedAt) : null;
    if (completedAt !== undefined) topic.completedAt = completedAt ? new Date(completedAt) : null;
    if (result !== undefined) topic.result = result;

    await learning.save();
    const populated = await StudentLearning.findById(learning._id).populate('textbook').lean();
    populated.units = sortUnitsByChapterOrder(populated.units || []);
    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '소주제 수정에 실패했습니다.' });
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
