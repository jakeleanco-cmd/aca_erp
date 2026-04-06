require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { google } = require('googleapis');
const readline = require('readline');

// 사용자님이 주신 정보 반영 (.env에서 가져옴)
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // 리프레시 토큰을 위해 필수
  prompt: 'consent',     // 매번 권한 동의 화면을 띄워 토큰 확실히 받기
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n--- 리프레시 토큰 발급 안내 ---\n');
console.log('1. 아래 URL을 브라우저 주소창에 붙여넣고 접속하세요:');
console.log(authUrl);
console.log('\n2. 로그인 및 권한 허용 후, 주소창의 code= 부분을 확인하세요.');
console.log('   예: http://localhost:3000/?code=4/0AdQt...&scope=...');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\n3. 주소창의 code= 뒤에 있는 문자열만 복사해서 입력하세요: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ 발급 성공!');
    console.log('--------------------------');
    console.log('GOOGLE_DRIVE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('--------------------------');
    console.log('\n위 토큰 값을 프로젝트의 .env 파일에 추가해 주세요.');
  } catch (err) {
    console.error('\n❌ 발급 실패:', err.message);
  }
  process.exit();
});
