const express = require('express');
const Assessment = require('../models/Assessment');
const { ASSESSMENT_TYPES } = require('../constants');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/by-learning/:studentLearningId', async (req, res) => {
  try {
    const list = await Assessment.find({ studentLearning: req.params.studentLearningId })
      .sort({ assessedAt: -1 })
      .lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '평가 목록을 불러오지 못했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { type } = req.body;
    if (!ASSESSMENT_TYPES.includes(type)) {
      return res.status(400).json({ message: '유효하지 않은 평가 유형입니다.' });
    }
    const doc = await Assessment.create(req.body);
    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '평가 저장에 실패했습니다.', detail: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await Assessment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
    }
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '평가 수정에 실패했습니다.', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Assessment.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
