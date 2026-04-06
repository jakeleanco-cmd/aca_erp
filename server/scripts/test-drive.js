const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testConnection() {
  const KEY_FILE_PATH = path.join(process.cwd(), process.env.GOOGLE_DRIVE_KEY_PATH || 'server/config/google-drive-key.json');
  const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log('Key Path:', KEY_FILE_PATH);
  console.log('Folder ID:', FOLDER_ID);

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE_PATH,
      scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    console.log('연결 시도 중...');
    const response = await drive.files.get({
      fileId: FOLDER_ID,
      fields: 'id, name, mimeType'
    });

    console.log('연결 성공!');
    console.log('폴더 정보:', response.data);
  } catch (error) {
    console.error('연결 실패:', error.message);
    if (error.message.includes('404')) {
      console.error('에러: 폴더를 찾을 수 없습니다. 서비스 계정과 폴더가 공유되었는지 확인하세요.');
    }
  }
}

testConnection();
