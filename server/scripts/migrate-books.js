const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// --- 모델 정의 (최신 스키마 반영) ---
const topicSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  title: { type: String, required: true, trim: true },
  hasUnitEvaluation: { type: Boolean, default: false },
}, { _id: false });

const chapterSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  title: { type: String, required: true, trim: true },
  hasUnitEvaluation: { type: Boolean, default: false },
  topics: { type: [topicSchema], default: [] }, // topics 추가
}, { _id: false });

const textbookSchema = new mongoose.Schema({
  publishYear: { type: Number, required: true },
  schoolLevel: { type: String, required: true },
  gradeLabel: { type: String, required: true },
  title: { type: String, required: true },
  learningLevel: { type: String, required: true },
  chapters: { type: [chapterSchema], default: [] },
}, { timestamps: true });

const Textbook = mongoose.models.Textbook || mongoose.model('Textbook', textbookSchema);

// --- 로마자 변환 헬퍼 (필요한 경우 사용) ---
const romanToNum = (roman) => {
  const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  return map[roman] || 0;
};

async function migrate() {
  try {
    console.log('🚀 교재 및 토픽 데이터 마이그레이션을 시작합니다...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB 연결 성공');

    const jsonPath = path.join(__dirname, 'books.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const books = JSON.parse(rawData);

    const getLearningLevel = (series) => {
      if (series.includes('연산')) return '연산';
      if (series.includes('라이트쎈')) return '기초';
      if (series === '쎈' || series === 'RPM') return '기본';
      if (series === '일품') return '실력';
      if (series === '에이급' || series === '블랙라벨') return '심화';
      return '기본';
    };

    const textbooksToInsert = books.map((b) => ({
      publishYear: b.year,
      schoolLevel: b.grade_level,
      gradeLabel: `${b.grade}학년 ${b.semester}학기`,
      // 교재 제목을 조금 더 명확하게 구성 (예: 라이트쎈 중등 수학 1-1 (2022개정))
      title: `${b.series} 중등 ${b.subject} ${b.grade}-${b.semester} (${b.curriculum})`,
      learningLevel: getLearningLevel(b.series),
      chapters: b.chapters.map((ch) => ({
        order: romanToNum(ch.chapter_no) || 0,
        title: ch.chapter_title,
        hasUnitEvaluation: false,
        // --- 수정된 topics 마이그레이션 로직 ---
        topics: ch.topics.map((t) => ({
          // t가 객체이므로 직접 속성에 접근합니다.
          order: parseInt(t.topic_no, 10) || 0,
          title: t.topic_title.trim(),
          hasUnitEvaluation: false
        }))
      }))
    }));

    // 기존 데이터 초기화가 필요한 경우 주석 해제
    // await Textbook.deleteMany({}); 

    const result = await Textbook.insertMany(textbooksToInsert);
    console.log(`✅ 총 ${result.length}건의 교재(토픽 포함) 데이터가 성공적으로 등록되었습니다.`);

  } catch (err) {
    console.error('❌ 마이그레이션 실패:', err);
  } finally {
    await mongoose.disconnect();
    console.log('👋 DB 연결 종료.');
  }
}

migrate();