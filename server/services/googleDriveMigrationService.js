const ExamPaper = require('../models/ExamPaper');
const ExamSheet = require('../models/ExamSheet');
const FormativeExam = require('../models/FormativeExam');
const { 
  FOLDER_TYPES, 
  getOrCreateSubfolder, 
  moveFile, 
  listFiles,
  runWithDrive,
} = require('./googleDriveService');

/**
 * DB에서 각 도메인별 googleFileId 목록을 집계하여 Set으로 반환
 */
async function getDbFileIdSets() {
  const [examPapers, examSheets, formativeExams] = await Promise.all([
    ExamPaper.find({ 'attachments.googleFileId': { $exists: true, $ne: null } }).select('attachments.googleFileId').lean(),
    ExamSheet.find({ 'attachments.googleFileId': { $exists: true, $ne: null } }).select('attachments.googleFileId').lean(),
    FormativeExam.find({ 'attachments.googleFileId': { $exists: true, $ne: null } }).select('attachments.googleFileId').lean(),
  ]);

  const paperFileIds = new Set();
  examPapers.forEach(p => p.attachments?.forEach(a => { if (a.googleFileId) paperFileIds.add(a.googleFileId); }));

  const sheetFileIds = new Set();
  examSheets.forEach(s => s.attachments?.forEach(a => { if (a.googleFileId) sheetFileIds.add(a.googleFileId); }));

  const formativeFileIds = new Set();
  formativeExams.forEach(f => f.attachments?.forEach(a => { if (a.googleFileId) formativeFileIds.add(a.googleFileId); }));

  return { paperFileIds, sheetFileIds, formativeFileIds };
}

/**
 * 파일의 적절한 대상 폴더 판정
 * 1순위: DB googleFileId 매칭
 * 2순위: 파일명 패턴 매칭
 */
function determineTargetFolder(file, { paperFileIds, sheetFileIds, formativeFileIds }) {
  const fileId = file.id;
  const fileName = (file.name || '').toLowerCase();

  // 1. DB 매칭
  if (paperFileIds.has(fileId)) return FOLDER_TYPES.EXAM_PAPER;
  if (sheetFileIds.has(fileId)) return FOLDER_TYPES.EXAM_SHEET;
  if (formativeFileIds.has(fileId)) return FOLDER_TYPES.FORMATIVE_EXAM;

  // 2. 파일명 패턴 매칭
  if (
    fileName.startsWith('기출_') ||
    fileName.includes('기말') ||
    fileName.includes('중간') ||
    fileName.includes('문제') ||
    fileName.includes('해설') ||
    fileName.includes('정답') ||
    /\d-\d/.test(fileName) // 학기 패턴 (예: 2-1, 1-2 등 과거 기출 시험지)
  ) {
    return FOLDER_TYPES.EXAM_PAPER;
  }

  if (
    fileName.startsWith('sheet_') ||
    fileName.includes('omr') ||
    fileName.includes('답안') ||
    fileName.includes('성적')
  ) {
    return FOLDER_TYPES.EXAM_SHEET;
  }

  if (
    fileName.startsWith('formative_') ||
    fileName.includes('형성평가') ||
    fileName.includes('단원평가')
  ) {
    return FOLDER_TYPES.FORMATIVE_EXAM;
  }

  // 매칭되지 않는 기타 파일
  return FOLDER_TYPES.OTHER;
}

/**
 * 구글 드라이브 기존 파일 마이그레이션 실행
 * @param {Object} options { dryRun: boolean }
 */
async function migrateDriveFiles(options = {}) {
  const { dryRun = false } = options;
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID 환경 변수가 설정되지 않았습니다.');
  }

  console.log(`[Drive Migration] 마이그레이션 시작 (dryRun: ${dryRun})`);

  // 1. DB 매핑 ID 조회
  const idSets = await getDbFileIdSets();
  console.log(`[Drive Migration] DB 매핑 통계 - 기출시험지: ${idSets.paperFileIds.size}, 답안지: ${idSets.sheetFileIds.size}, 형성평가: ${idSets.formativeFileIds.size}`);

  // 2. 루트 폴더의 모든 파일 페이징 조회
  let allFiles = [];
  let pageToken = null;
  do {
    const listRes = await listFiles({
      pageToken,
      pageSize: 100,
      folderType: null, // 전체 조회
    });
    const files = listRes.files || [];
    // 이미 하위 폴더에 들어가 있는 파일은 제외하고, 루트에 있는 파일만 필터링
    const rootFiles = files.filter(f => f.folderName === '루트');
    allFiles.push(...rootFiles);
    pageToken = listRes.nextPageToken;
  } while (pageToken);

  console.log(`[Drive Migration] 루트 폴더 내 마이그레이션 대상 파일 수: ${allFiles.length}건`);

  // 3. 파일별 이동 계획 수립
  const plan = [];
  for (const file of allFiles) {
    const targetFolderType = determineTargetFolder(file, idSets);
    plan.push({
      fileId: file.id,
      fileName: file.name,
      targetFolderType,
    });
  }

  if (dryRun) {
    return {
      dryRun: true,
      totalCount: plan.length,
      summary: {
        [FOLDER_TYPES.EXAM_PAPER]: plan.filter(p => p.targetFolderType === FOLDER_TYPES.EXAM_PAPER).length,
        [FOLDER_TYPES.EXAM_SHEET]: plan.filter(p => p.targetFolderType === FOLDER_TYPES.EXAM_SHEET).length,
        [FOLDER_TYPES.FORMATIVE_EXAM]: plan.filter(p => p.targetFolderType === FOLDER_TYPES.FORMATIVE_EXAM).length,
        [FOLDER_TYPES.OTHER]: plan.filter(p => p.targetFolderType === FOLDER_TYPES.OTHER).length,
      },
      plan: plan.slice(0, 50), // 샘플 50건 반환
    };
  }

  // 4. 실제 이동 수행 (폴더 ID 사전 조회로 최적화)
  const targetFolderIdMap = {};
  await runWithDrive(async (drive, rootId) => {
    for (const type of Object.values(FOLDER_TYPES)) {
      targetFolderIdMap[type] = await getOrCreateSubfolder(drive, rootId, type);
    }
  });

  console.log('[Drive Migration] 대상 폴더 ID 매핑 완료:', targetFolderIdMap);

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const item of plan) {
    try {
      const targetFolderId = targetFolderIdMap[item.targetFolderType] || rootFolderId;
      await moveFile(item.fileId, targetFolderId, rootFolderId);
      successCount++;
      if (successCount % 20 === 0 || successCount === plan.length) {
        console.log(`[Drive Migration] 진행 중: ${successCount}/${plan.length} 완료`);
      }
      results.push({ fileId: item.fileId, fileName: item.fileName, status: 'success', folder: item.targetFolderType });
    } catch (err) {
      failCount++;
      console.error(`[Drive Migration] 이동 실패 (${item.fileName}):`, err.message);
      results.push({ fileId: item.fileId, fileName: item.fileName, status: 'failed', error: err.message });
    }
  }

  console.log(`[Drive Migration] 마이그레이션 완료 - 성공: ${successCount}, 실패: ${failCount}`);

  return {
    dryRun: false,
    totalCount: plan.length,
    successCount,
    failCount,
    results,
  };
}

module.exports = {
  getDbFileIdSets,
  determineTargetFolder,
  migrateDriveFiles,
};
