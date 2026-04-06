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

async function migrateElemBooks() {
  try {
    console.log('🚀 초등 교재 데이터 마이그레이션을 시작합니다...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB 연결 성공');

    const jsonPath = path.join(__dirname, 'books_초등_26.04.06.01.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const books = JSON.parse(rawData);

    // Rollback: 기존에 마이그레이션 했던 초등 교재만 찾아서 삭제
    const deleteResult = await Textbook.deleteMany({ schoolLevel: '초등' });
    console.log(`🧹 기존 등록된 초등 관련 교재 ${deleteResult.deletedCount}건을 삭제(롤백)했습니다.`);

    // 사용자가 명시한 초등 교재 학습수준
    // 연산: 쎈연산, 빅터연산
    // 기본: 디딤돌(기본+응용)
    // 실력: 쎈, 최상위S
    // 심화: 최상위, 왕수학(최상위)
    const getLearningLevel = (series) => {
      if (['쎈연산', '빅터연산'].includes(series)) return '연산';
      if (['디딤돌(기본+응용)'].includes(series)) return '기본';
      if (['쎈', '최상위S'].includes(series)) return '실력';
      if (['최상위', '왕수학(최상위)'].includes(series)) return '심화';
      return '기본'; // fallback
    };

    const textbooksToInsert = books.map((b) => ({
      publishYear: b.year,
      schoolLevel: b.grade_level,
      // 이전 마이그레이션 스크립트와 동일한 포맷 (`grade학년 semester학기`)
      gradeLabel: `${b.grade}학년 ${b.semester}학기`,
      title: `${b.series} 초등 ${b.subject} ${b.grade}-${b.semester} (${b.curriculum})`,
      learningLevel: getLearningLevel(b.series),
      chapters: b.chapters.map((ch) => ({
        // 초등 json에선 chapter_no가 숫자형 문자열 ("1", "2") 이므로 바로 변환
        order: parseInt(ch.chapter_no, 10) || 0,
        title: ch.chapter_title,
        hasUnitEvaluation: false,
        topics: (ch.topics || []).map((t) => ({
          order: parseInt(t.topic_no, 10) || 0,
          title: t.topic_title.trim(),
          hasUnitEvaluation: false
        }))
      }))
    }));

    const result = await Textbook.insertMany(textbooksToInsert);
    console.log(`✅ 총 ${result.length}건의 초등 교재가 성공적으로 등록되었습니다.`);

  } catch (err) {
    console.error('❌ 마이그레이션 실패:', err);
  } finally {
    await mongoose.disconnect();
    console.log('👋 DB 연결 종료.');
  }
}

migrateElemBooks();
