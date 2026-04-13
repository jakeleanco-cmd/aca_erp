const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { uploadFile } = require('../services/googleDriveService');
const ExamPaper = require('../models/ExamPaper');

// .env 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DATA_ROOT = path.join(__dirname, '../data/내신연습');

// 헬퍼: 파일명에서 정보 추출 (NFC 정규화 필수)
function parseFileInfo(filename) {
  const normName = filename.normalize('NFC');
  const info = {
    title: normName.replace(/\.[^/.]+$/, ""), // 확장자 제거
    totalQuestions: 0
  };

  // 문항 수 추출: [20문제]
  const qMatch = normName.match(/\[(\d+)문제\]/);
  if (qMatch) {
    info.totalQuestions = parseInt(qMatch[1], 10);
  }

  // 앞부분의 [유형] 태그 제거하여 깔끔한 제목 만들기
  info.title = info.title.replace(/^\[.*?\]_/, '').replace(/_\[\d+문제\]$/, '');

  return info;
}

// 헬퍼: 폴더명에서 유형 추출 및 Enum 매핑 보정
function parseTypeName(folderName) {
  let type = folderName.normalize('NFC').replace(/^\d+-\d+_/, '');
  
  // Enum 값 보정 (DB 규격에 맞게 변환)
  if (type === '강남3구기출_객관식') return '강남3구기출(객관식)';
  if (type === '강남3구기출_서술형') return '강남3구기출(서술형)';
  
  return type;
}

async function migrate() {
  try {
    console.log('🚀 마이그레이션 보정 버전 시작...');
    
    // DB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aca_erp');
    console.log('✅ MongoDB 연결 성공');

    const grades = ['중1', '중2', '중3'];
    let totalCount = 0;
    let successCount = 0;
    let skipCount = 0;

    for (const rawGrade of grades) {
      const grade = rawGrade.normalize('NFC');
      const gradePath = path.join(DATA_ROOT, grade);
      if (!fs.existsSync(gradePath)) continue;

      const semesters = fs.readdirSync(gradePath).filter(f => !f.startsWith('.'));
      for (const rawSemester of semesters) {
        const semester = rawSemester.normalize('NFC');
        const semesterPath = path.join(gradePath, rawSemester);
        const terms = fs.readdirSync(semesterPath).filter(f => !f.startsWith('.'));

        for (const rawTerm of terms) {
          const term = rawTerm.normalize('NFC');
          const termPath = path.join(semesterPath, rawTerm);
          const types = fs.readdirSync(termPath).filter(f => !f.startsWith('.'));

          for (const rawTypeFolder of types) {
            const typeFolder = rawTypeFolder.normalize('NFC');
            const typePath = path.join(termPath, rawTypeFolder);
            const examType = parseTypeName(typeFolder);
            const files = fs.readdirSync(typePath).filter(f => f.endsWith('.pdf'));

            for (const filename of files) {
              totalCount++;
              const filePath = path.join(typePath, filename);
              const { title, totalQuestions } = parseFileInfo(filename);

              // 중복 체크 (제목, 학년, 학기 기반 - 반드시 정규화된 값으로 체크)
              const existing = await ExamPaper.findOne({ 
                title, 
                gradeLabel: grade,
                semester: semester.includes('1학기') ? '1학기' : semester.includes('2학기') ? '2학기' : semester,
                examTerm: term.includes('중간') ? '중간' : term.includes('기말') ? '기말' : term,
                examType
              });

              if (existing) {
                console.log(`⏩ [Skipped] 이미 존재함: ${grade} ${semester} ${title}`);
                skipCount++;
                continue;
              }

              console.log(`📤 [Uploading] ${grade} > ${semester} > ${term} > ${filename.normalize('NFC')}`);

              // 구글 드라이브 업로드
              // skipDecoding: true 를 추가하여 로컬 UTF-8 파일명이 깨지지 않게 함
              const mockFile = {
                originalname: filename.normalize('NFC'),
                mimetype: 'application/pdf',
                path: filePath,
                skipDecoding: true
              };

              try {
                const driveResult = await uploadFile(mockFile);

                // DB 저장
                await ExamPaper.create({
                  title,
                  category: '내신준비평가',
                  examType,
                  schoolLevel: '중등',
                  gradeLabel: grade,
                  semester: semester.includes('1학기') ? '1학기' : semester.includes('2학기') ? '2학기' : semester,
                  examTerm: term.includes('중간') ? '중간' : term.includes('기말') ? '기말' : term,
                  totalQuestions,
                  attachments: [{
                    filename: driveResult.name,
                    originalName: filename.normalize('NFC'),
                    mimetype: 'application/pdf',
                    size: fs.statSync(filePath).size,
                    path: driveResult.webViewLink,
                    googleFileId: driveResult.id,
                    webViewLink: driveResult.webViewLink
                  }]
                });

                successCount++;
                console.log(`✅ [Success] ${title} 등록 완료`);
              } catch (uploadErr) {
                console.error(`❌ [Error] ${filename} 업로드 실패:`, uploadErr.message);
              }
            }
          }
        }
      }
    }

    console.log('\n--- 마이그레이션 요약 ---');
    console.log(`총 파일: ${totalCount}`);
    console.log(`성공: ${successCount}`);
    console.log(`건너뜀: ${skipCount}`);
    console.log(`실패: ${totalCount - successCount - skipCount}`);
    console.log('------------------------');

  } catch (err) {
    console.error('💥 치명적 에러:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
