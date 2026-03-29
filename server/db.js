/**
 * 서버리스(Vercel)에서 MongoDB 연결을 매 요청마다 새로 열지 않기 위해
 * 전역 캐시에 연결 상태를 재사용한다.
 */
const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI 환경 변수가 설정되어 있지 않습니다.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, opts)
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = { connectDb };
