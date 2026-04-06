const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { uploadWithCleanup } = require('../services/googleDriveService');
const ExamPaper = require('../models/ExamPaper');
const ExamSheet = require('../models/ExamSheet');
const FormativeExam = require('../models/FormativeExam');

// 프로젝트 루트의 server/uploads 폴더를 정확히 지칭합니다.
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
console.log('업로드 디렉토리 확인:', UPLOAD_DIR);

async function migrate() {
  try {
    // 1. DB 연결
    console.log('MongoDB 연결 시도 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공!');

    // 2. 대상 모델 목록
    const models = [
      { name: 'ExamPaper', model: ExamPaper },
      { name: 'ExamSheet', model: ExamSheet },
      { name: 'FormativeExam', model: FormativeExam }
    ];

    for (const { name, model } of models) {
      console.log(`\n--- ${name} 마이그레이션 시작 ---`);
      // googleFileId가 없는 문서 조회
      const docs = await model.find({ 'attachments.googleFileId': { $exists: false } });
      console.log(`대상 문서 수: ${docs.length}개`);

      for (const doc of docs) {
        let updated = false;
        for (let i = 0; i < doc.attachments.length; i++) {
          const att = doc.attachments[i];
          if (!att.googleFileId) {
            const filePath = path.join(UPLOAD_DIR, att.filename);
            
            if (fs.existsSync(filePath)) {
              console.log(`[업로드 중] ${att.originalName} (${att.filename})`);
              try {
                // 구글 드라이브 업로드
                const driveData = await uploadWithCleanup({
                  path: filePath,
                  originalname: att.originalName,
                  mimetype: att.mimetype
                });

                // DB 정보 업데이트 (인덱스로 직접 수정)
                doc.attachments[i].googleFileId = driveData.id;
                doc.attachments[i].webViewLink = driveData.webViewLink;
                doc.attachments[i].path = driveData.webViewLink;
                updated = true;
                
                console.log(`   └─ 성공: ${driveData.id}`);
              } catch (err) {
                console.error(`   └─ 실패: ${err.message}`);
              }
            } else {
              // 파일이 없는 경우 로그 출력
              console.warn(`[파일 없음] ${att.filename} (탐색 경로: ${filePath})`);
            }
          }
        }

        if (updated) {
          doc.markModified('attachments'); // Mongoose 배열 변경 알림
          await doc.save();
        }
      }
      console.log(`${name} 마이그레이션 완료\n`);
    }

    console.log('모든 마이그레이션 작업이 종료되었습니다.');
  } catch (error) {
    console.error('마이그레이션 중 치명적 에러:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
