const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const getDriveContext = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  });

  return {
    drive: google.drive({ version: 'v3', auth: oauth2Client }),
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
  };
};

async function fixFilenames() {
  const { drive, folderId } = getDriveContext();
  
  if (!folderId) {
    console.error('GOOGLE_DRIVE_FOLDER_ID is not set.');
    return;
  }

  try {
    console.log(`🚀 구글 드라이브 파일명 보정 시작 (Folder ID: ${folderId})`);
    
    // 1. 파일 목록 가져오기
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1000
    });

    const files = response.data.files;
    console.log(`📊 총 ${files.length}개의 파일을 검사합니다.`);

    let fixedCount = 0;

    for (const file of files) {
      const originalName = file.name;
      // NFC 정규화 수행
      const fixedName = originalName.normalize('NFC');

      if (originalName !== fixedName) {
        console.log(`🔧 보정 필요: "${originalName}" -> "${fixedName}"`);
        
        try {
          await drive.files.update({
            fileId: file.id,
            requestBody: {
              name: fixedName
            }
          });
          fixedCount++;
          console.log(`✅ 보정 완료: ${file.id}`);
        } catch (err) {
          console.error(`❌ 보정 실패 (${file.id}):`, err.message);
        }
      }
    }

    console.log('\n--- 보정 요약 ---');
    console.log(`검사한 파일: ${files.length}`);
    console.log(`보정된 파일: ${fixedCount}`);
    console.log('-----------------');

  } catch (err) {
    console.error('💥 에러 발생:', err.message);
  }
}

fixFilenames();
