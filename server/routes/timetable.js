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
const MonthlyBill = require('../models/MonthlyBill');

router.get('/dashboard', async (req, res) => {
  try {
    const slots = await ClassSlot.find().sort({ weekdayIndex: 1, startTime: 1 }).lean();
    
    // 현재 월(YYYY-MM) 계산
    const yearMonth = new Date().toISOString().slice(0, 7);
    
    // '재원' 상태인 학생만 조회
    const students = await Student.find({ status: '재원' })
      .select('name status classSlotIds schoolLevel gradeLabel lastCounselingAt lastStudyRecordUpdatedAt cashReceiptUse')
      .lean();

    // 해당 월의 수납 정보 조회
    const bills = await MonthlyBill.find({ yearMonth }).lean();
    const studentIdToBill = {};
    for (const b of bills) {
      studentIdToBill[String(b.student)] = b;
    }

    const slotIdToStudents = {};
    for (const s of students) {
      const bill = studentIdToBill[String(s._id)];
      const studentData = {
        _id: s._id,
        name: s.name,
        status: s.status,
        schoolLevel: s.schoolLevel,
        gradeLabel: s.gradeLabel,
        lastCounselingAt: s.lastCounselingAt || null,
        lastStudyRecordUpdatedAt: s.lastStudyRecordUpdatedAt || null,
        cashReceiptUse: s.cashReceiptUse ?? '사용',
        billId: bill?._id || null,
        billStatus: bill?.status || null,
        paymentMethod: bill?.paymentMethod || null,
        receiptIssued: bill?.receiptIssued || false, // 현금영수증 발행 완료 여부
      };

      for (const sid of s.classSlotIds || []) {
        const key = String(sid);
        if (!slotIdToStudents[key]) slotIdToStudents[key] = [];
        slotIdToStudents[key].push(studentData);
      }
    }

    const grid = slots.map((slot) => ({
      ...slot,
      weekdayKo: WEEKDAYS_KO[slot.weekdayIndex],
      students: slotIdToStudents[String(slot._id)] || [],
      yearMonth, // 클라이언트에서 고지서 생성 시 사용하도록 전달
    }));

    return res.json(grid);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '시간표 데이터를 불러오지 못했습니다.' });
  }
});

module.exports = router;
