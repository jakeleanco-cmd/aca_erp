/**
 * 로컬/개발용 테스트 데이터 삽입 스크립트.
 * 기본 동작: 기존 시드 관련 컬렉션을 비운 뒤, 요청된 규모로 다시 채운다.
 * 왜: 반복 시드 시 항상 동일한 시나리오를 보장하기 위함.
 *
 * 사용: 루트에서 `npm run seed` (MONGODB_URI 필요)
 * 기존 데이터 유지(삭제 안 함): SEED_SKIP_RESET=1 npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Admin = require('./models/Admin');
const ClassSlot = require('./models/ClassSlot');
const Textbook = require('./models/Textbook');
const Student = require('./models/Student');
const StudentLearning = require('./models/StudentLearning');
const MonthlyBill = require('./models/MonthlyBill');

const EMAIL = process.env.SEED_ADMIN_EMAIL || 'test@test.com';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'test1234';
const NAME = process.env.SEED_ADMIN_NAME || '개발용 관리자';

/** weekdayIndex: 0=월 … 6=일 (constants WEEKDAYS_KO 와 동일) */
const WD = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };

/**
 * 요청된 수업 슬롯 정의 (월금/화목/수·토)
 */
function buildSlotDefinitions() {
  return [
    { weekdayIndex: WD.월, startTime: '16:00', label: '월금 16시 (월)' },
    { weekdayIndex: WD.금, startTime: '16:00', label: '월금 16시 (금)' },
    { weekdayIndex: WD.월, startTime: '18:00', label: '월금 18시 (월)' },
    { weekdayIndex: WD.금, startTime: '18:00', label: '월금 18시 (금)' },
    { weekdayIndex: WD.월, startTime: '20:00', label: '월금 20시 (월)' },
    { weekdayIndex: WD.금, startTime: '20:00', label: '월금 20시 (금)' },
    { weekdayIndex: WD.화, startTime: '16:00', label: '화목 16시 (화)' },
    { weekdayIndex: WD.목, startTime: '16:00', label: '화목 16시 (목)' },
    { weekdayIndex: WD.화, startTime: '18:00', label: '화목 18시 (화)' },
    { weekdayIndex: WD.목, startTime: '18:00', label: '화목 18시 (목)' },
    { weekdayIndex: WD.화, startTime: '20:00', label: '화목 20시 (화)' },
    { weekdayIndex: WD.목, startTime: '20:00', label: '화목 20시 (목)' },
    { weekdayIndex: WD.수, startTime: '16:00', label: '수 16시' },
    { weekdayIndex: WD.토, startTime: '14:00', label: '토 14시' },
  ];
}

function slotId(slots, weekdayIndex, startTime) {
  const s = slots.find((x) => x.weekdayIndex === weekdayIndex && x.startTime === startTime);
  if (!s) {
    throw new Error(`슬롯 없음: weekdayIndex=${weekdayIndex} ${startTime}`);
  }
  return s._id;
}

/** 동일 슬롯이 두 번 들어가지 않게 정리 */
function uniqSlotIds(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    const k = String(id);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(id);
    }
  }
  return out;
}

async function resetCollections() {
  await Promise.all([
    Admin.deleteMany({}),
    ClassSlot.deleteMany({}),
    Textbook.deleteMany({}),
    Student.deleteMany({}),
    StudentLearning.deleteMany({}),
    MonthlyBill.deleteMany({}),
  ]);
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await Admin.findOneAndUpdate(
    { email: EMAIL.toLowerCase() },
    { email: EMAIL.toLowerCase(), passwordHash, name: NAME },
    { upsert: true, new: true }
  );
  // 왜: 예전 기본 계정(dev@aca.local 등)이 남아 로그인 혼선이 나지 않게 한다.
  await Admin.deleteMany({ email: { $ne: EMAIL.toLowerCase() } });
  console.log(`[seed] 관리자: ${EMAIL}`);
}

async function seedSlots() {
  const defs = buildSlotDefinitions();
  const docs = await ClassSlot.insertMany(defs);
  console.log(`[seed] 수업 슬롯 ${docs.length}건 (월금·화목·수16·토14)`);
  return docs.map((d) => d.toObject());
}

async function seedTextbooks() {
  const commonChapters = [
    { order: 1, title: '1. 진도 단원', hasUnitEvaluation: true },
    { order: 2, title: '2. 응용', hasUnitEvaluation: false },
    { order: 3, title: '3. 심화', hasUnitEvaluation: true },
  ];
  const list = await Textbook.insertMany([
    {
      publishYear: 2026,
      gradeLevel: '초등',
      grade: 3,
      title: '초3-1 디딤돌',
      learningLevel: '기본',
      series: '디딤돌',
      chapters: commonChapters,
    },
    {
      publishYear: 2026,
      gradeLevel: '중등',
      grade: 2,
      title: '중2-1 쎈',
      learningLevel: '실력',
      series: '쎈',
      chapters: commonChapters,
    },
    {
      publishYear: 2026,
      gradeLevel: '고등',
      grade: 1,
      title: '고1-1 블랙라벨',
      learningLevel: '심화',
      series: '블랙라벨',
      chapters: commonChapters,
    },
  ]);
  console.log(`[seed] 교재 ${list.length}종`);
  return list.map((t) => t.toObject());
}

function buildUnitsFromTextbook(textbookDoc) {
  const chapters = [...(textbookDoc.chapters || [])].sort((a, b) => a.order - b.order);
  return chapters.map((ch) => ({
    chapterOrder: ch.order,
    status: ch.order === 1 ? '학습중' : '학습예정',
    startedAt: ch.order === 1 ? new Date() : null,
    completedAt: null,
    unitEvaluationResult: '',
  }));
}

/**
 * 초등 10: 16시대 위주 — 월·금·화·목·수 16시에 각 2명씩 골고루
 */
function elementarySlotIds(slots, index) {
  const row = [
    slotId(slots, WD.월, '16:00'),
    slotId(slots, WD.금, '16:00'),
    slotId(slots, WD.화, '16:00'),
    slotId(slots, WD.목, '16:00'),
    slotId(slots, WD.수, '16:00'),
  ];
  const primary = row[index % 5];
  const secondary = row[(index + 2) % 5];
  // 왜: 같은 시간대만이 아니라 인접 슬롯도 섞어 배정감을 낸다.
  if (index % 3 === 0) {
    return [primary, slotId(slots, WD.토, '14:00')];
  }
  return [primary, secondary];
}

/**
 * 중등 15: 18시·20시 위주 — 월금/화목 18·20 슬롯 8개에 라운드로빈
 */
function middleSlotIds(slots, index) {
  const pool = [
    slotId(slots, WD.월, '18:00'),
    slotId(slots, WD.금, '18:00'),
    slotId(slots, WD.화, '18:00'),
    slotId(slots, WD.목, '18:00'),
    slotId(slots, WD.월, '20:00'),
    slotId(slots, WD.금, '20:00'),
    slotId(slots, WD.화, '20:00'),
    slotId(slots, WD.목, '20:00'),
  ];
  const a = pool[index % 8];
  const b = pool[(index + 3) % 8];
  return [a, b];
}

/**
 * 고등 5: 20시 위주 — 월금·화목 20시 4슬롯에 분산
 */
function highSlotIds(slots, index) {
  const pool = [
    slotId(slots, WD.월, '20:00'),
    slotId(slots, WD.금, '20:00'),
    slotId(slots, WD.화, '20:00'),
    slotId(slots, WD.목, '20:00'),
  ];
  const a = pool[index % 4];
  const b = pool[(index + 2) % 4];
  return [a, b];
}

async function seedStudentsAndLearning(slots, textbooks) {
  const tbEl = textbooks.find((t) => t.gradeLevel === '초등');
  const tbMid = textbooks.find((t) => t.gradeLevel === '중등');
  const tbHi = textbooks.find((t) => t.gradeLevel === '고등');

  const baseDate = new Date('2025-03-01');
  const studentsPayload = [];

  for (let i = 0; i < 10; i += 1) {
    const grade = (i % 6) + 1;
    studentsPayload.push({
      name: `[시드] 초등 학생${String(i + 1).padStart(2, '0')}`,
      schoolLevel: '초등',
      gradeLabel: `${grade}학년`,
      monthlyTuition: 300000,
      classSlotIds: uniqSlotIds(elementarySlotIds(slots, i)),
      cashReceiptPhone: `0101000${String(i).padStart(4, '0')}`,
      enrolledAt: new Date(baseDate.getTime() + i * 86400000),
      leftAt: null,
      lastCounselingAt: i % 4 === 0 ? new Date() : null,
    });
  }

  for (let i = 0; i < 15; i += 1) {
    const grade = (i % 3) + 1;
    studentsPayload.push({
      name: `[시드] 중등 학생${String(i + 1).padStart(2, '0')}`,
      schoolLevel: '중등',
      gradeLabel: `${grade}학년`,
      monthlyTuition: 350000,
      classSlotIds: uniqSlotIds(middleSlotIds(slots, i)),
      cashReceiptPhone: `0102000${String(i).padStart(4, '0')}`,
      enrolledAt: new Date(baseDate.getTime() + i * 86400000),
      leftAt: null,
      lastCounselingAt: null,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const grade = (i % 3) + 1;
    studentsPayload.push({
      name: `[시드] 고등 학생${String(i + 1).padStart(2, '0')}`,
      schoolLevel: '고등',
      gradeLabel: `${grade}학년`,
      monthlyTuition: 400000,
      classSlotIds: uniqSlotIds(highSlotIds(slots, i)),
      cashReceiptPhone: `0103000${String(i).padStart(4, '0')}`,
      enrolledAt: new Date(baseDate.getTime() + i * 86400000),
      leftAt: null,
      lastCounselingAt: null,
    });
  }

  const created = await Student.insertMany(studentsPayload);
  console.log(`[seed] 학생 ${created.length}명 (초10·중15·고5)`);

  const firstEl = created.find((s) => s.schoolLevel === '초등');
  const firstMid = created.find((s) => s.schoolLevel === '중등');
  const firstHi = created.find((s) => s.schoolLevel === '고등');  // 학생은 기존 schoolLevel 그대로 유지

  const learnings = [];
  if (firstEl && tbEl) {
    learnings.push({
      student: firstEl._id,
      learningType: '연산선행',
      textbook: tbEl._id,
      units: buildUnitsFromTextbook(tbEl),
    });
  }
  if (firstMid && tbMid) {
    learnings.push({
      student: firstMid._id,
      learningType: '응용선행',
      textbook: tbMid._id,
      units: buildUnitsFromTextbook(tbMid),
    });
  }
  if (firstHi && tbHi) {
    learnings.push({
      student: firstHi._id,
      learningType: '현행심화',
      textbook: tbHi._id,
      units: buildUnitsFromTextbook(tbHi),
    });
  }
  if (learnings.length) {
    await StudentLearning.insertMany(learnings);
    console.log(`[seed] 학습진도 샘플 ${learnings.length}건 (학년별 1명씩)`);
  }

  return created.map((s) => s.toObject());
}

async function seedBills(students) {
  if (!students?.length) return;
  const ym = new Date();
  const yearMonth = `${ym.getFullYear()}-${String(ym.getMonth() + 1).padStart(2, '0')}`;
  const rows = students.map((st) => ({
    yearMonth,
    student: st._id,
    amount: st.monthlyTuition,
    status: '미납',
  }));
  await MonthlyBill.insertMany(rows);
  console.log(`[seed] ${yearMonth} 월 고지 ${rows.length}건`);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI가 .env에 없습니다.');
    process.exit(1);
  }

  const skipReset = process.env.SEED_SKIP_RESET === '1';

  await mongoose.connect(process.env.MONGODB_URI);

  if (!skipReset) {
    console.warn('[seed] 기존 데이터 삭제 후 재삽입합니다. (유지하려면 SEED_SKIP_RESET=1)');
    await resetCollections();
  }

  await seedAdmin();
  const slots = await seedSlots();
  const textbooks = await seedTextbooks();
  const students = await seedStudentsAndLearning(slots, textbooks);
  await seedBills(students);

  console.log('[seed] 완료. 로그인:', EMAIL, '/', PASSWORD);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
