const express = require('express');
const Student = require('../models/Student');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const list = await Student.find()
      .populate('classSlotIds')
      .sort({ name: 1 })
      .lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '학생 목록을 불러오지 못했습니다.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Student.findById(req.params.id).populate('classSlotIds').lean();
    if (!doc) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '학생 조회에 실패했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const doc = await Student.create(req.body);
    const populated = await Student.findById(doc._id).populate('classSlotIds').lean();
    return res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '학생 등록에 실패했습니다.', detail: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('classSlotIds');
    if (!doc) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '학생 수정에 실패했습니다.', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Student.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '학생 삭제에 실패했습니다.' });
  }
});

module.exports = router;
