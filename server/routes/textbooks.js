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

// --- JSON 마이그레이션 도우미 함수 ---
const romanToNum = (roman) => {
  const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  return map[roman] || 0;
};

const getLearningLevel = (series) => {
  if (!series) return '기본';
  if (['쎈연산', '빅터연산', '수력충전'].includes(series) || series.includes('연산')) return '연산';
  if (['디딤돌(기본+응용)', 'RPM'].includes(series)) return '기본';
  if (['쎈', '최상위S', '일품'].includes(series)) return '실력';
  if (['최상위', '왕수학(최상위)', '에이급', '블랙라벨'].includes(series)) return '심화';
  if (series.includes('라이트쎈')) return '기초';
  return '기본';
};

// JSON 기반 일괄 등록 엔드포인트
router.post('/batch-json', async (req, res) => {
  try {
    const { jsonData } = req.body;
    if (!Array.isArray(jsonData)) {
      return res.status(400).json({ message: 'JSON 데이터가 올바른 배열(Array) 형태가 아닙니다.' });
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const b of jsonData) {
      const grade = parseInt(b.grade, 10) || 1;
      const gradeLevel = b.grade_level || b.gradeLevel || b.schoolLevel || '기타';

      let learningLevel = b.level || b.learningLevel || getLearningLevel(b.series);
      // 수준 정규화 (예: "연산/기초" -> "연산")
      if (learningLevel.includes('연산')) learningLevel = '연산';
      else if (learningLevel.includes('심화')) learningLevel = '심화';
      else if (learningLevel.includes('실력')) learningLevel = '실력';
      else if (learningLevel.includes('기본')) learningLevel = '기본';
      else if (learningLevel.includes('기초')) learningLevel = '기초';
      else if (learningLevel.includes('개념')) learningLevel = '개념';

      const publishYear = b.year || b.publishYear || new Date().getFullYear();
      
      let title = b.title;
      // 교재 제목 자동 생성 로직: 예) 중3-1 라이트쎈
      if (!title) {
        const prefix = (gradeLevel || '').charAt(0); // '초', '중', '고'
        const semesterStr = b.semester ? `-${b.semester}` : '';
        title = `${prefix}${grade}${semesterStr} ${b.series}`;
      }

      // 중복 검사: 4가지 키를 모두 비교
      const exists = await Textbook.findOne({
        title,
        publishYear,
        gradeLevel,
        grade
      });

      if (exists) {
        skippedCount++;
        continue; // 중복이면 스킵
      }

      // 단원(차시) 구조 변환
      const chapters = (b.chapters || []).map(ch => ({
        order: parseInt(ch.chapter_no, 10) || romanToNum(ch.chapter_no) || 0,
        title: ch.chapter_title || ch.title,
        hasUnitEvaluation: false,
        topics: (ch.topics || []).map(t => ({
          order: parseInt(t.topic_no, 10) || t.order || 0,
          title: (t.topic_title || t.title || '').trim(),
          hasUnitEvaluation: false
        }))
      }));

      const curriculum = b.curriculum || '';
      const semester = b.semester ? String(b.semester) : '';
      const series = b.series || '';

      // 1건 추가
      await Textbook.create({
        title,
        gradeLevel,
        grade,
        publishYear,
        learningLevel,
        curriculum,
        semester,
        series,
        chapters
      });
      
      addedCount++;
    }

    return res.json({ addedCount, skippedCount });
  } catch (err) {
    console.error('JSON Batch Insert Error:', err);
    return res.status(500).json({ message: 'JSON 일괄 등록 중 서버 오류가 발생했습니다.', detail: err.message });
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
