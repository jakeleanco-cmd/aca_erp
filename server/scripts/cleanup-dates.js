const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');

async function cleanup() {
  try {
    console.log('데이터 정제 작업을 시작합니다...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB 연결 성공');

    // 1. 재원/대기 학생의 퇴원일 비우기
    const nonWithdrawn = await Student.find({ status: { $ne: '퇴원' }, leftAt: { $ne: null } });
    console.log(`재원/대기 중 퇴원일이 등록된 학생: ${nonWithdrawn.length}명`);

    for (const s of nonWithdrawn) {
      await Student.findByIdAndUpdate(s._id, { $set: { leftAt: null } });
    }
    console.log('✅ 재원/대기 학생 퇴원일 초기화 완료');

    // 2. 잘못된 날짜(1970년 등) 정리
    // 2000년 이전 날짜는 비정상 데이터로 간주하여 null 처리
    const invalidDates = await Student.find({ leftAt: { $lt: new Date('2000-01-01') } });
    console.log(`잘못된 날짜(2000년 이전) 학생: ${invalidDates.length}명`);

    for (const s of invalidDates) {
      await Student.findByIdAndUpdate(s._id, { $set: { leftAt: null } });
    }
    console.log('✅ 유효하지 않은 날짜 필드(1970 등) 처리 완료');

    console.log('🎉 데이터 정제 작업이 성공적으로 완료되었습니다.');
  } catch (err) {
    console.error('❌ 작업 실패:', err);
  } finally {
    await mongoose.disconnect();
    console.log('DB 연결 종료.');
  }
}

cleanup();
