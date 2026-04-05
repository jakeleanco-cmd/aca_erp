const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// 모델 임포트 (mongoose.model로 등록되어 있어야 함)
// server/models/ExamPaper.js에서 export한 것을 사용
const ExamPaper = require('../models/ExamPaper');

const DATA_ROOT = path.join(__dirname, '..', 'data', '내신연습');
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const TYPE_MAP = {
  '1-1_최다빈출': '최다빈출',
  '1-2_서술형': '서술형',
  '2-1_강남3구기출_객관식': '강남3구기출(객관식)',
  '2-2_강남3구기출_서술형': '강남3구기출(서술형)',
  '3-1_최다오답': '최다오답',
  '3-2_고난이도': '고난이도',
  '4-1_학교기출': '학교기출',
};

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');
    
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    // 1. 학년 폴더 (중2, 중3 등)
    const grades = fs.readdirSync(DATA_ROOT).filter(f => fs.statSync(path.join(DATA_ROOT, f)).isDirectory());

    for (const grade of grades) {
      const gradePath = path.join(DATA_ROOT, grade);
      // 2. 유형 폴더 (1-1_최다빈출 등)
      const types = fs.readdirSync(gradePath).filter(f => fs.statSync(path.join(gradePath, f)).isDirectory());

      for (const typeFolder of types) {
        const typePath = path.join(gradePath, typeFolder);
        const examType = TYPE_MAP[typeFolder] || typeFolder;
        
        // 3. 파일들
        const files = fs.readdirSync(typePath).filter(f => f.endsWith('.pdf'));

        for (const filename of files) {
          const filePath = path.join(typePath, filename);
          const stats = fs.statSync(filePath);

          // 파일명 파싱 예: [최다빈출]_1-1.유리수와순환소수_[20문제].pdf
          // Regex: /\[(.*?)\]_(.*?)\.(.*?)_\[(\d+)문제\]/
          const match = filename.match(/\[(.*?)\]_(.*?)\.(.*?)_\[(\d+)문제\]/);
          
          let title = filename.replace('.pdf', '');
          let totalQuestions = 0;
          if (match) {
            const [ , , , chapterTitle, qCount] = match;
            title = `[${grade}] ${examType} - ${chapterTitle}`;
            totalQuestions = parseInt(qCount, 10);
          }

          // 중복 체크 (제목 기준)
          const existing = await ExamPaper.findOne({ title });
          if (existing) {
            console.log(`[SKIP] Already exists: ${title}`);
            continue;
          }

          // 파일 복사
          const extension = path.extname(filename);
          const newFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
          const targetPath = path.join(UPLOAD_ROOT, newFilename);
          
          fs.copyFileSync(filePath, targetPath);
          console.log(`[COPY] ${filename} -> ${newFilename}`);

          // DB 저장
          await ExamPaper.create({
            title,
            category: '내신준비평가',
            examType,
            schoolLevel: '중등',
            gradeLabel: grade,
            totalQuestions,
            attachments: [{
              filename: newFilename,
              originalName: filename,
              mimetype: 'application/pdf',
              size: stats.size,
              path: `/uploads/${newFilename}`
            }],
            memo: '자동 등록된 내신 연습 시험지'
          });

          console.log(`[OK] Registered: ${title}`);
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
