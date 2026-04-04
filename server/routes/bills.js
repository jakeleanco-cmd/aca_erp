const express = require('express');
const MonthlyBill = require('../models/MonthlyBill');
const Student = require('../models/Student');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

router.get('/', async (req, res) => {
  try {
    const { yearMonth } = req.query;
    const filter = yearMonth ? { yearMonth: String(yearMonth) } : {};
    const list = await MonthlyBill.find(filter)
      .populate('student')
      .sort({ yearMonth: -1, 'student.name': 1 })
      .lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '고지 목록을 불러오지 못했습니다.' });
  }
});

/**
 * 해당 월의 미납 고지서 일괄 삭제 (잘못 생성한 경우)
 */
router.delete('/', async (req, res) => {
  try {
    const { yearMonth } = req.query;
    if (!yearMonth || !YEAR_MONTH_RE.test(yearMonth)) {
      return res.status(400).json({ message: 'yearMonth는 YYYY-MM 형식이어야 합니다.' });
    }

    // 납부 완료된 데이터 보호를 위해 '미납'인 상태만 삭제
    const result = await MonthlyBill.deleteMany({ yearMonth, status: '미납' });

    return res.json({ message: `해당 월의 미납 고지서 ${result.deletedCount}건이 삭제되었습니다.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '고지서 삭제에 실패했습니다.', detail: err.message });
  }
});

/**
 * 해당 월에 아직 고지가 없는 학생에게만 월수강료 스냅샷으로 고지 생성
 */
router.post('/generate', async (req, res) => {
  try {
    const { yearMonth } = req.body;
    if (!yearMonth || !YEAR_MONTH_RE.test(yearMonth)) {
      return res.status(400).json({ message: 'yearMonth는 YYYY-MM 형식이어야 합니다.' });
    }

    const students = await Student.find({ leftAt: null }).lean();
    const existing = await MonthlyBill.find({ yearMonth }).select('student').lean();
    const existingSet = new Set(existing.map((b) => String(b.student)));

    const toCreate = students.filter((s) => !existingSet.has(String(s._id)));
    const docs = toCreate.map((s) => ({
      yearMonth,
      student: s._id,
      amount: s.monthlyTuition,
      status: '미납',
    }));

    if (docs.length === 0) {
      return res.json({ created: 0, message: '신규로 생성할 고지가 없습니다.' });
    }

    const inserted = await MonthlyBill.insertMany(docs);
    const populated = await MonthlyBill.find({ _id: { $in: inserted.map((d) => d._id) } })
      .populate('student')
      .lean();

    return res.status(201).json({ created: inserted.length, bills: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '고지 생성에 실패했습니다.', detail: err.message });
  }
});

router.post('/:id/pay-card', async (req, res) => {
  try {
    const bill = await MonthlyBill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: '고지를 찾을 수 없습니다.' });
    }
    bill.status = '납부완료';
    bill.paymentMethod = '카드';
    bill.paidAt = new Date();
    await bill.save();
    const populated = await MonthlyBill.findById(bill._id).populate('student').lean();
    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '카드 수납 처리에 실패했습니다.' });
  }
});

router.post('/:id/pay-cash', async (req, res) => {
  try {
    const bill = await MonthlyBill.findById(req.params.id).populate('student');
    if (!bill) {
      return res.status(404).json({ message: '고지를 찾을 수 없습니다.' });
    }
    bill.status = '납부완료';
    bill.paymentMethod = '현금';
    bill.paidAt = new Date();
    await bill.save();
    const populated = await MonthlyBill.findById(bill._id).populate('student').lean();
    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '현금 수납 처리에 실패했습니다.' });
  }
});

/**
 * 현금영수증 발행 완료 기록 (추후 외부 API 연동 필드 확장 가능)
 */
router.post('/:id/issue-receipt', async (req, res) => {
  try {
    const bill = await MonthlyBill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: '고지를 찾을 수 없습니다.' });
    }
    if (bill.paymentMethod !== '현금') {
      return res.status(400).json({ message: '현금 수납 건만 발행 기록할 수 있습니다.' });
    }
    bill.receiptIssued = true;
    bill.receiptIssuedAt = new Date();
    if (req.body.externalReceiptId) {
      bill.externalReceiptId = String(req.body.externalReceiptId).trim();
    }
    await bill.save();
    const populated = await MonthlyBill.findById(bill._id).populate('student').lean();
    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '발행 기록에 실패했습니다.' });
  }
});

module.exports = router;
