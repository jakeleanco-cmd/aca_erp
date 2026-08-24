const fs = require('fs');
const path = require('path');
const { uploadFile, deleteFile } = require('./googleDriveService');
const ExamPaper = require('../models/ExamPaper');

const DATA_ROOT = path.join(__dirname, '../data/내신연습');

// 헬퍼: 파일명에서 정보 추출 (NFC 정규화 필수)
function parseFileInfo(filename, examType = '') {
  const normName = filename.normalize('NFC');
  const nameWithoutExt = normName.replace(/\.[^/.]+$/, "");
  const info = {
    title: nameWithoutExt, // 기본값: 확장자 제외 파일명 전체
    totalQuestions: 0,
    year: null,
    schoolName: ''
  };

  // 문항 수 추출: [20문제]
  const qMatch = normName.match(/\[(\d+)문제\]/);
  if (qMatch) {
    info.totalQuestions = parseInt(qMatch[1], 10);
  }

  // 기출년도 추출: 예: 22년, 2022년
  const yearMatch = normName.match(/(\d{2,4})년/);
  if (yearMatch) {
    let y = parseInt(yearMatch[1], 10);
    if (y < 100) y = 2000 + y;
    info.year = y;
  }

  // 학교명 추출: 예: 고덕중, 배재중, 성덕여중, 천호중 등
  const schoolMatch = normName.match(/([가-힣]+(?:중|여중|고|여고|초))/);
  if (schoolMatch) {
    info.schoolName = schoolMatch[1];
  }

  // 학교기출은 파일명 전체를 그대로 시험지명(title)으로 유지
  if (examType === '학교기출') {
    info.title = nameWithoutExt;
  } else {
    // 일반 단원평가: 앞부분의 [유형] 태그 및 뒷부분의 _[20문제] 태그 제거하여 단원명으로 추출
    info.title = nameWithoutExt.replace(/^\[.*?\]_/, '').replace(/_\[\d+문제\]$/, '');
  }

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

// 필터 옵션: { gradeLabel, semester, examTerm } → 해당 범위만 동기화
async function syncLocalExams(filter = {}) {
  const { gradeLabel, semester, examTerm } = filter;
  console.log('🚀 로컬 시험지 동기화(갱신) 시작...', gradeLabel ? `[필터: ${gradeLabel} ${semester} ${examTerm}]` : '[전체]');

  // 필터에 학년이 지정되었으면 해당 학년만, 아니면 전체
  const grades = gradeLabel ? [gradeLabel] : ['중1', '중2', '중3'];
  let totalCount = 0;
  let successCount = 0;
  let skipCount = 0;
  const localPaperKeys = [];
  const failedFiles = []; // 실패한 파일 목록 수집용

  for (const rawGrade of grades) {
    const grade = rawGrade.normalize('NFC');
    const gradePath = path.join(DATA_ROOT, grade);
    if (!fs.existsSync(gradePath)) continue;

    const semesters = fs.readdirSync(gradePath).filter(f => !f.startsWith('.'));
    for (const rawSemester of semesters) {
      const sem = rawSemester.normalize('NFC');
      const semNorm = sem.includes('1학기') ? '1학기' : sem.includes('2학기') ? '2학기' : sem;
      // 학기 필터가 있으면 해당 학기만 처리
      if (semester && semNorm !== semester) continue;

      const semesterPath = path.join(gradePath, rawSemester);
      const terms = fs.readdirSync(semesterPath).filter(f => !f.startsWith('.'));

      for (const rawTerm of terms) {
        const term = rawTerm.normalize('NFC');
        const termNorm = term.includes('중간') ? '중간' : term.includes('기말') ? '기말' : term;
        // 고사 필터가 있으면 해당 고사만 처리
        if (examTerm && termNorm !== examTerm) continue;

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
            const { title, totalQuestions, year, schoolName } = parseFileInfo(filename, examType);

            // 중복 체크 (제목, 학년, 학기 기반 - 반드시 정규화된 값으로 체크)
            const existing = await ExamPaper.findOne({ 
              title, 
              gradeLabel: grade,
              semester: semNorm,
              examTerm: termNorm,
              examType
            });

            localPaperKeys.push({
              title,
              gradeLabel: grade,
              semester: semNorm,
              examTerm: termNorm,
              examType
            });

            if (existing) {
              const currentAtt = existing.attachments?.[0];
              const normOriginalName = filename.normalize('NFC');
              const isFileNameChanged = currentAtt && currentAtt.originalName !== normOriginalName;
              const isQuestionsChanged = existing.totalQuestions !== totalQuestions;
              const isYearChanged = year && existing.year !== year;
              const isSchoolChanged = schoolName && existing.schoolName !== schoolName;

              if (isFileNameChanged || isQuestionsChanged || isYearChanged || isSchoolChanged) {
                console.log(`🔄 [Updating] ${grade} ${title} 정보 갱신`);
                existing.totalQuestions = totalQuestions;
                if (year) existing.year = year;
                if (schoolName) existing.schoolName = schoolName;
                if (currentAtt) {
                  currentAtt.originalName = normOriginalName;
                }
                await existing.save();
                successCount++;
              } else {
                skipCount++;
              }
              continue;
            }

            console.log(`📤 [Uploading] ${grade} > ${semNorm} > ${termNorm} > ${filename.normalize('NFC')}`);

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
                semester: semNorm,
                examTerm: termNorm,
                year,
                schoolName,
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
            } catch (uploadErr) {
              console.error(`❌ [Error] ${filename} 업로드 실패:`, uploadErr.message);
              failedFiles.push({ filename: filename.normalize('NFC'), reason: uploadErr.message });
            }
          }
        }
      }
    }
  }

  // 5. DB에 있는 내신준비평가 마스터 시험지 중 로컬 파일에 존재하지 않는 것 삭제 (Prune)
  // 필터가 있으면 해당 범위만, 없으면 전체 대상으로 Prune
  let prunedCount = 0;
  try {
    const pruneFilter = { category: '내신준비평가', schoolLevel: '중등' };
    if (gradeLabel) pruneFilter.gradeLabel = gradeLabel;
    if (semester) pruneFilter.semester = semester;
    if (examTerm) pruneFilter.examTerm = examTerm;
    const dbPapers = await ExamPaper.find(pruneFilter);
    for (const paper of dbPapers) {
      // 로컬 키 목록과 매칭되는 것이 있는지 검사
      const match = localPaperKeys.find(local => 
        local.title === paper.title &&
        local.gradeLabel === paper.gradeLabel &&
        local.semester === paper.semester &&
        local.examTerm === paper.examTerm &&
        local.examType === paper.examType
      );

      // 로컬 파일에서 지워진 시험지인 경우 삭제 프로세스 진행
      if (!match) {
        console.log(`🗑️ [Pruning] 로컬에 존재하지 않는 시험지 정리 대상: ${paper.title}`);
        
        // 구글 드라이브의 실제 파일도 삭제
        for (const att of (paper.attachments || [])) {
          if (att.googleFileId) {
            try {
              await deleteFile(att.googleFileId);
              console.log(`  - 구글 드라이브 파일 삭제 성공: ${att.googleFileId}`);
            } catch (err) {
              console.error(`  - 구글 드라이브 파일 삭제 실패 (${att.googleFileId}):`, err.message);
            }
          }
        }
        
        // DB 문서 삭제
        await ExamPaper.deleteOne({ _id: paper._id });
        prunedCount++;
      }
    }
  } catch (pruneErr) {
    console.error('❌ Pruning 처리 중 오류 발생:', pruneErr);
  }

  // 실패한 파일이 있으면 목록 출력
  if (failedFiles.length > 0) {
    console.log('\n--- 실패한 파일 목록 ---');
    failedFiles.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.filename} → ${f.reason}`);
    });
  }

  console.log('\n--- 동기화 요약 ---');
  console.log(`총 파일: ${totalCount}`);
  console.log(`성공: ${successCount}`);
  console.log(`건너뜀: ${skipCount}`);
  console.log(`정리됨: ${prunedCount}`);
  console.log(`실패: ${totalCount - successCount - skipCount}`);
  console.log('------------------------');

  return { totalCount, successCount, skipCount, prunedCount, failedFiles };
}

module.exports = {
  syncLocalExams
};

