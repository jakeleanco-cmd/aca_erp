const express = require('express');
const ClassSlot = require('../models/ClassSlot');
const Student = require('../models/Student');
const { WEEKDAYS_KO } = require('../constants');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * 요일·시간 슬롯별로 수강 학생 목록을 묶어 반환한다.
 * 왜: 시간표 대시보드에서 그리드 렌더링을 단순화하기 위함.
 */
router.get('/dashboard', async (req, res) => {
  try {
    const slots = await ClassSlot.find().sort({ weekdayIndex: 1, startTime: 1 }).lean();
    const students = await Student.find().select('name classSlotIds').lean();

    const slotIdToStudents = {};
    for (const s of students) {
      for (const sid of s.classSlotIds || []) {
        const key = String(sid);
        if (!slotIdToStudents[key]) slotIdToStudents[key] = [];
        slotIdToStudents[key].push({ _id: s._id, name: s.name });
      }
    }

    const grid = slots.map((slot) => ({
      ...slot,
      weekdayKo: WEEKDAYS_KO[slot.weekdayIndex],
      students: slotIdToStudents[String(slot._id)] || [],
    }));

    return res.json(grid);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '시간표 데이터를 불러오지 못했습니다.' });
  }
});

module.exports = router;
