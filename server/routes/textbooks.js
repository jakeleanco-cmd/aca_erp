const express = require('express');
const Textbook = require('../models/Textbook');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const list = await Textbook.find().sort({ publishYear: -1, title: 1 }).lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '교재 목록을 불러오지 못했습니다.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Textbook.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ message: '교재를 찾을 수 없습니다.' });
    }
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '교재 조회에 실패했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const doc = await Textbook.create(body);
    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '교재 저장에 실패했습니다.', detail: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await Textbook.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ message: '교재를 찾을 수 없습니다.' });
    }
    return res.json(doc);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: '교재 수정에 실패했습니다.', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Textbook.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: '교재를 찾을 수 없습니다.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '교재 삭제에 실패했습니다.' });
  }
});

module.exports = router;
