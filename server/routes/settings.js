const express = require('express');
const Settings = require('../models/Settings');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * 특정 키의 설정 가져오기
 */
router.get('/:key', async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: req.params.key });
    if (!settings) {
      return res.json({ key: req.params.key, value: null });
    }
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '설정을 불러오지 못했습니다.' });
  }
});

/**
 * 설정 저장/업데이트
 */
router.post('/', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key) {
      return res.status(400).json({ message: '설정 키가 필요합니다.' });
    }

    const settings = await Settings.findOneAndUpdate(
      { key },
      { value, description },
      { upsert: true, new: true }
    );
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '설정을 저장하지 못했습니다.' });
  }
});

module.exports = router;
