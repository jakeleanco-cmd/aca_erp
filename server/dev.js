/**
 * 로컬 개발용: Express를 직접 listen. Vercel 배포 시에는 api/index.js만 사용된다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = require('./app');

const PORT = parseInt(process.env.PORT, 10) || 3001;
console.log(`[DEBUG] Attempting to start server on port: ${PORT}`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API 서버 http://localhost:${PORT}`);
});
