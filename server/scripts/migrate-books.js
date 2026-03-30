const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// 모델 정의 (간략화)
const chapterSchema = new mongoose.Schema({
  order: Number,
  title: String,
  hasUnitEvaluation: { type: Boolean, default: false }
}, { _id: false });

const textbookSchema = new mongoose.Schema({
  publishYear: Number,
  schoolLevel: String,
  gradeLabel: String,
  title: String,
  learningLevel: String,
  chapters: [chapterSchema]
}, { timestamps: true });

const Textbook = mongoose.models.Textbook || mongoose.model('Textbook', textbookSchema);

async function migrate() {
  try {
    console.log('교재 데이터 마이그레이션을 시작합니다...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB 연결 성공');

    const jsonPath = path.join(__dirname, 'books.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const books = JSON.parse(rawData);

    console.log(`총 ${books.length}종의 교재 데이터를 읽어왔습니다.`);

    const getLearningLevel = (series) => {
      if (series.includes('연산')) return '연산';
      if (series.includes('라이트쎈')) return '기초';
      if (series === '쎈' || series === 'RPM') return '기본';
      if (series === '일품') return '실력';
      if (series === '에이급' || series === '블랙라벨') return '심화';
      return '기본'; // 기본값
    };

    const textbooksToInsert = books.map((b) => ({
      publishYear: b.year,
      schoolLevel: b.grade_level,
      gradeLabel: `${b.grade}학년 ${b.semester}학기`,
      title: `${b.series} ${b.subject}`,
      learningLevel: getLearningLevel(b.series),
      chapters: b.chapters.map((ch, idx) => ({
        order: idx + 1,
        title: ch.chapter_title,
        hasUnitEvaluation: false
      }))
    }));

    // 기존 데이터 삭제 (필요한 경우)
    // await Textbook.deleteMany({}); 

    const result = await Textbook.insertMany(textbooksToInsert);
    console.log(`✅ ${result.length}건의 교재 데이터가 성공적으로 등록되었습니다.`);

  } catch (err) {
    console.error('❌ 마이그레이션 실패:', err);
  } finally {
    await mongoose.disconnect();
    console.log('DB 연결 종료.');
  }
}

migrate();
