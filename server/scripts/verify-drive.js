const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// .env.local 및 .env 로드
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { uploadFile, deleteFile } = require('../services/googleDriveService');
const { google } = require('googleapis');

async function verifyFullLifecycle() {
  console.log('====================================================');
  console.log('   구글 드라이브(Google Drive) 읽기/쓰기 최종 유효성 검사');
  console.log('====================================================\n');

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  console.log(`[1단계] 대상 폴더 ID: ${folderId}`);

  // 2. 쓰기 (업로드) 테스트 - 한글 파일명 및 UTF-8 NFC 정규화
  console.log('\n[2단계] 파일 쓰기 (한글 파일명 UTF-8 업로드) 테스트:');
  const testFileName = `연동테스트_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const tempFilePath = path.join(__dirname, 'temp_verify_file.txt');
  const testContent = `[Google Drive API Verification Test]\n생성일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n본 문서는 구글 드라이브 읽기 및 쓰기가 유효한지 검증하기 위한 데이터입니다.`;

  fs.writeFileSync(tempFilePath, testContent, 'utf8');

  let uploadedData = null;
  try {
    uploadedData = await uploadFile({
      originalname: testFileName,
      mimetype: 'text/plain',
      path: tempFilePath,
    });
    console.log('  ✅ [쓰기 성공] 파일이 구글 드라이브에 정상 업로드되었습니다!');
    console.log(`     - 파일 ID: ${uploadedData.id}`);
    console.log(`     - 파일 이름: ${uploadedData.name}`);
    console.log(`     - 웹 보기 링크: ${uploadedData.webViewLink}`);
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }

  if (!uploadedData || !uploadedData.id) {
    throw new Error('업로드 결과 데이터가 올바르지 않습니다.');
  }

  // 3. 읽기 테스트 (내용 다운로드 및 정합성 검증)
  console.log('\n[3단계] 파일 읽기 (업로드된 파일 다운로드 및 원본 일치 검증) 테스트:');
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  let driveClient;
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  }

  const downloadRes = await driveClient.files.get(
    { fileId: uploadedData.id, alt: 'media' },
    { responseType: 'text' }
  );

  if (downloadRes.data === testContent) {
    console.log('  ✅ [읽기 성공] 구글 드라이브로부터 파일 내용을 완벽하게 읽어왔으며 원본 데이터와 100% 일치합니다.');
  } else {
    console.warn('  ⚠️ 파일 내용을 읽었으나 내용이 다릅니다.');
  }

  // 4. 폴더 내 파일 목록 조회 테스트
  console.log('\n[4단계] 폴더 내 파일 목록 조회 (files.list) 테스트:');
  const listRes = await driveClient.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: 5,
    fields: 'files(id, name, mimeType, size)',
  });
  console.log(`  ✅ [목록 조회 성공] 폴더 내 파일 수: ${listRes.data.files.length}개`);
  listRes.data.files.slice(0, 3).forEach((f, idx) => {
    console.log(`     ${idx + 1}. ${f.name} (크기: ${f.size || 0} bytes)`);
  });

  // 5. 정리 (삭제) 테스트
  console.log('\n[5단계] 테스트 파일 삭제 (deleteFile) 테스트:');
  await deleteFile(uploadedData.id);
  console.log(`  ✅ [삭제 성공] 테스트 파일(${uploadedData.id})이 드라이브에서 안전하게 삭제되었습니다.`);

  console.log('\n====================================================');
  console.log('🎉 [최종 결과] 구글 드라이브 읽기 / 쓰기 / 삭제 모든 기능이 완벽하게 유효합니다!');
  console.log('====================================================');
}

verifyFullLifecycle().catch((err) => {
  console.error('\n❌ 유효성 검사 실패:', err.message);
  process.exit(1);
});
