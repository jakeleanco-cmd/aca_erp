/**
 * Vercel Serverless 진입점 — Express 앱을 그대로 내보낸다.
 * 로컬에서 vercel dev 등으로 돌릴 때 루트 .env를 읽기 위해 dotenv를 먼저 로드한다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

module.exports = require('../server/app');
