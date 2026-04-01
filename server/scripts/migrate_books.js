const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 모델 불러오기
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Textbook = require('../models/Textbook');

async function migrate() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI가 설정되지 않았습니다.');
    
    await mongoose.connect(uri);
    console.log('MongoDB 연결 성공');

    // 1. 기존 교재 데이터 전체 삭제
    console.log('기존 교재 데이터를 삭제 중...');
    await Textbook.deleteMany({});
    console.log('기존 데이터 삭제 완료');

    // 2. books.json 읽기
    const booksData = JSON.parse(fs.readFileSync(path.join(__dirname, './books.json'), 'utf8'));

    // 3. 데이터 삽입
    for (const item of booksData) {
      const gradeLabel = `${item.grade_level} ${item.grade}학년 ${item.semester}학기`;
      
      let learningLevel = '기본';
      if (item.series === '일품') learningLevel = '심화';
      if (item.series === '블랙라벨') learningLevel = '심화';
      if (item.series === '에이급') learningLevel = '심화';
      if (item.series === '쎈개념연산') learningLevel = '연산';

      const chapters = item.chapters.map((ch, idx) => ({
        order: idx + 1,
        title: ch.chapter_title,
        hasUnitEvaluation: true,
        /** 최신 객체 스키마 { order, title } 에 맞게 변환 */
        topics: (ch.topics || []).map((topic, tIdx) => ({
          order: tIdx + 1,
          title: typeof topic === 'string' ? topic : (topic.topic_title || topic.title),
          hasUnitEvaluation: false
        }))
      }));

      const payload = {
        publishYear: item.year,
        schoolLevel: item.grade_level,
        gradeLabel: gradeLabel,
        title: item.series,
        learningLevel: learningLevel,
        chapters: chapters
      };

      await Textbook.create(payload);
      console.log(`등록 완료: ${payload.title} (${gradeLabel})`);
    }

    console.log('모든 교재 데이터 초기화 및 재등록 성공!');
  } catch (err) {
    console.error('마이그레이션 실패:', err);
  } finally {
    mongoose.connection.close();
  }
}

migrate();
