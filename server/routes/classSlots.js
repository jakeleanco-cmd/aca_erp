const express = require('express');
const ClassSlot = require('../models/ClassSlot');
const { WEEKDAYS_KO } = require('../constants');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const list = await ClassSlot.find().sort({ weekdayIndex: 1, startTime: 1 }).lean();
    const withKo = list.map((s) => ({
      ...s,
      weekdayKo: WEEKDAYS_KO[s.weekdayIndex],
    }));
    return res.json(withKo);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '수업 슬롯 목록을 불러오지 못했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const doc = await ClassSlot.create(req.body);
    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '슬롯 생성에 실패했습니다.', detail: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await ClassSlot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ message: '슬롯을 찾을 수 없습니다.' });
    }
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '슬롯 수정에 실패했습니다.', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await ClassSlot.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: '슬롯을 찾을 수 없습니다.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '슬롯 삭제에 실패했습니다.' });
  }
});

module.exports = router;
