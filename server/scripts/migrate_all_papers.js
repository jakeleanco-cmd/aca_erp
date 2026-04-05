const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

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

    // 0. 기존 데이터 초기화 (사용자 요청)
    console.log('Clearing existing ExamPaper data...');
    const deleted = await ExamPaper.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} existing records.`);

    // 1. 학년 폴더 (중2, 중3)
    const grades = fs.readdirSync(DATA_ROOT)
      .filter(f => fs.statSync(path.join(DATA_ROOT, f)).isDirectory())
      .map(f => f.normalize('NFC'));

    for (const grade of grades) {
      const gradePath = path.join(DATA_ROOT, grade);
      
      // 2. 학기 폴더 (1학기, 2학기)
      const semesters = fs.readdirSync(gradePath)
        .filter(f => fs.statSync(path.join(gradePath, f)).isDirectory())
        .map(f => f.normalize('NFC'));

      for (const semester of semesters) {
        const semesterPath = path.join(gradePath, semester);
        
        // 3. 고사 구분 폴더 (중간, 기말)
        const terms = fs.readdirSync(semesterPath)
          .filter(f => fs.statSync(path.join(semesterPath, f)).isDirectory())
          .map(f => f.normalize('NFC'));

        for (const examTerm of terms) {
          const termPath = path.join(semesterPath, examTerm);
          
          // 4. 유형 폴더 (1-1_최다빈출 등)
          const typeFolders = fs.readdirSync(termPath)
            .filter(f => fs.statSync(path.join(termPath, f)).isDirectory())
            .map(f => f.normalize('NFC'));

          for (const typeFolder of typeFolders) {
            const typePath = path.join(termPath, typeFolder);
            const examType = TYPE_MAP[typeFolder] || typeFolder.split('_')[1] || typeFolder;
            
            // 5. 파일들
            const files = fs.readdirSync(typePath)
              .filter(f => f.endsWith('.pdf'))
              .map(f => f.normalize('NFC'));

            for (const filename of files) {
              const filePath = path.join(typePath, filename);
              const stats = fs.statSync(filePath);

              // 파일명 파싱 예: [최다빈출]_1-1.유리수와순환소수_[20문제].pdf
              const match = filename.match(/\[(.*?)\]_(.*?)\.(.*?)_\[(\d+)문제\]/);
              
              let chapterLabel = filename.replace('.pdf', '');
              let totalQuestions = 0;
              if (match) {
                const [ , , , chapterTitle, qCount] = match;
                chapterLabel = chapterTitle;
                totalQuestions = parseInt(qCount, 10);
              }

              // 제목 형식: [중2/1학기/중간] 유형 - 단원명
              const title = `[${grade}/${semester}/${examTerm}] ${examType} - ${chapterLabel}`;

              // 파일 복사
              const extension = path.extname(filename);
              const newFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
              const targetPath = path.join(UPLOAD_ROOT, newFilename);
              
              fs.copyFileSync(filePath, targetPath);

              // DB 저장
              await ExamPaper.create({
                title,
                category: '내신준비평가',
                examType,
                schoolLevel: '중등',
                gradeLabel: grade,
                semester,
                examTerm,
                totalQuestions,
                attachments: [{
                  filename: newFilename,
                  originalName: filename,
                  mimetype: 'application/pdf',
                  size: stats.size,
                  path: `/uploads/${newFilename}`
                }],
                memo: `자동 마이그레이션 (${grade} ${semester} ${examTerm})`
              });

              console.log(`[OK] Registered: ${title}`);
            }
          }
        }
      }
    }

    console.log('Successful Migration of all papers.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
