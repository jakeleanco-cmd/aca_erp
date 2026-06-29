/**
 * Google OAuth2 Refresh Token 재발급 스크립트
 * 
 * 사용법: node server/scripts/get-refresh-token.js
 * 
 * 왜: 구글 OAuth2 refresh_token이 만료되었을 때,
 *     브라우저에서 직접 로그인하여 새 토큰을 발급받기 위함.
 *     로컬에 임시 HTTP 서버를 띄워 리디렉션 콜백을 자동 수신한다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const http = require('http');
const { google } = require('googleapis');
const { exec } = require('child_process');

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const PORT = 9876; // 임시 콜백 서버 포트
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ .env 파일에 GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET이 필요합니다.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive'],
  prompt: 'consent', // 항상 새 refresh_token을 받기 위해 consent 강제
});

// 1. 임시 HTTP 서버: 구글 로그인 후 리디렉션되는 콜백을 수신
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>❌ 인증 코드가 없습니다. 다시 시도해주세요.</h1>');
    return;
  }

  try {
    // 2. 인증 코드를 토큰으로 교환
    const { tokens } = await oauth2Client.getToken(code);
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <h1>✅ 토큰 발급 성공!</h1>
      <p>터미널을 확인하세요. 이 창은 닫아도 됩니다.</p>
    `);

    console.log('\n========================================');
    console.log('✅ 새 Refresh Token 발급 성공!');
    console.log('========================================');
    console.log('\n아래 값을 .env 파일의 GOOGLE_DRIVE_REFRESH_TOKEN에 붙여넣으세요:\n');
    console.log(tokens.refresh_token);
    console.log('\n========================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>❌ 토큰 교환 실패</h1><pre>${err.message}</pre>`);
    console.error('토큰 교환 실패:', err.message);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`\n🔑 Google OAuth2 Refresh Token 재발급 도구`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n임시 콜백 서버가 http://localhost:${PORT} 에서 대기 중입니다.`);
  console.log(`\n아래 URL을 브라우저에서 열어 구글 로그인을 진행하세요:\n`);
  console.log(authUrl);
  console.log('');

  // macOS에서 브라우저 자동 오픈
  exec(`open "${authUrl}"`);
});
