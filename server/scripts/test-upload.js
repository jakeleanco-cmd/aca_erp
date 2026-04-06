const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const getDriveClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
};

async function testDirectUpload() {
  const drive = getDriveClient();
  const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log('--- 직접 업로드 테스트 시작 ---');
  console.log('Folder ID:', FOLDER_ID);
  
  // 가상의 테스트 파일 생성
  const testFilePath = path.join(__dirname, 'test-upload.txt');
  fs.writeFileSync(testFilePath, 'Google Drive Upload Test Content at ' + new Date().toISOString());

  try {
    console.log('업로드 시도 중...');
    const response = await drive.files.create({
      requestBody: {
        name: '연동확인_테스트파일.txt',
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: 'text/plain',
        body: fs.createReadStream(testFilePath),
      },
      fields: 'id, name, webViewLink',
    });

    console.log('✅ 업로드 성공!');
    console.log('파일 ID:', response.data.id);
    console.log('보기 링크:', response.data.webViewLink);
  } catch (error) {
    console.error('❌ 업로드 실패!');
    if (error.response) {
      console.error('상세 에러:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('에러 메시지:', error.message);
    }
  } finally {
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  }
}

testDirectUpload();
